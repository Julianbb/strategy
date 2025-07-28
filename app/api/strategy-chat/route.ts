import { NextRequest,after } from 'next/server';

import {
  appendClientMessage,
  appendResponseMessages,
  createDataStream,
  smoothStream,
  streamText,
} from 'ai';

import { anthropic } from '@ai-sdk/anthropic';
import { openai } from "@ai-sdk/openai";
import { xai } from '@ai-sdk/xai';

import { auth } from '@/app/(auth)/auth';

import type { StrategyChat } from '@/lib/db/schema';
import {
  createStreamId,
  deleteStrategyChatById,
  getStrategyChatById,
  getMessagesByChatId,
  getStreamIdsByChatId,
  saveStrategyChat,
  saveMessages,
  updateStrategyChatStatus,
} from '@/lib/db/queries';
import { generateUUID, getTrailingMessageId } from '@/lib/utils';
import { ChatSDKError } from '@/lib/errors';
import {toolFactories} from "@/lib/ai/tools"
import { isProductionEnvironment } from '@/lib/constants';
import { getAllModels } from '@/lib/global_data/list_models_ai';







import { createStrategyChatSchema, updateStrategyChatStatusSchema, type PostRequestBody, type PatchRequestBody } from './schema';

import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from 'resumable-stream';


import { differenceInSeconds } from 'date-fns';


export const maxDuration = 60;

function getModelInstance(modelId: string) {
  console.log(modelId)
  try {
    const allModels = getAllModels();
    const model = allModels.find(m => m.id === modelId);
    console.log(model)
    
    if (!model) {
      console.log('Model not found, using default haiku');
      return anthropic('claude-3-haiku-20240307');
    }
    

    switch (model.company) {
      case 'openai':
        console.log('Using OpenAI model:', modelId);
        return openai(modelId);
      case 'anthropic':
        console.log('Using Anthropic model:', modelId);
        return anthropic(modelId);
      case 'xai':
        console.log('Using xAI model:', modelId);
        return xai(modelId);
      default:
        console.log('Unknown company, using default haiku');
        return anthropic('claude-3-haiku-20240307');
    }
  } catch (error) {
    console.error('Error in getModelInstance:', error);
    return anthropic('claude-3-haiku-20240307');
  }
}

let globalStreamContext: ResumableStreamContext | null = null;

function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error.message.includes('REDIS_URL')) {
        console.log(
          ' > Resumable streams are disabled due to missing REDIS_URL',
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}





export async function POST(request: NextRequest) {
  let validatedData: PostRequestBody;

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:strategy').toResponse();
  }

  try {
    const body = await request.json();
    validatedData = createStrategyChatSchema.parse(body);
  } catch (error) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  try {

    const strategyChat = await getStrategyChatById({ id: validatedData.id });

    if (!strategyChat) {
  
      await saveStrategyChat({
        id: validatedData.id,
        userId: session.user.id,
        strategyTypeId: validatedData.strategyTypeId!,
        strategyName: validatedData.strategyName!,
        baseCurrency: validatedData.baseCurrency,
        initialCapital_USD: validatedData.initialCapital_USD ? validatedData.initialCapital_USD.toString() : undefined,
        initialCapital_Currency: validatedData.initialCapital_Currency ? validatedData.initialCapital_Currency.toString() : undefined,
      });
    } else {
      if (strategyChat.userId !== session.user.id) {
        return new ChatSDKError('forbidden:chat').toResponse();
      }
    }

    const previousMessages = await getMessagesByChatId({ id: validatedData.id });
    const messages = appendClientMessage({
      // @ts-expect-error: todo add type conversion from DBMessage[] to UIMessage[]
      messages: previousMessages,
      message: validatedData.message,
    });


    await saveMessages({
      messages: [
        {
          chatId: validatedData.id,
          id: validatedData.message.id,
          role: 'user',
          parts: validatedData.message.parts,
          attachments: validatedData.message.experimental_attachments ?? [],
          createdAt: new Date(),
        },
      ],
    });

    const streamId = generateUUID();
    await createStreamId({ streamId, chatId: validatedData.id });

    const stream = createDataStream({
 
      execute: (dataStream) => {
        
        const toolsName = Object.values(toolFactories).map(t => t.name)
        const tools = Object.fromEntries(
          Object.entries(toolFactories).map(([key, { factory }]) => [
            key,
            factory({ session, strategyChatId: validatedData.id }),
          ])
        );
        
        const selectedModel = validatedData.conversationModel || 'claude-3-haiku-20240307';
        const result = streamText({
          model: getModelInstance(selectedModel),
          messages,
          maxSteps: 5,
          experimental_activeTools:toolsName,
          experimental_transform: smoothStream({ chunking: 'word' }),
          experimental_generateMessageId: generateUUID,
          tools,
          onStepFinish: async ({ toolCalls, toolResults }) => {
            // 当有工具调用时，向流中发送工具调用信息
            if (toolCalls && toolCalls.length > 0) {
              for (let i = 0; i < toolCalls.length; i++) {
                const toolCall = toolCalls[i];
                const toolResult = toolResults[i];
                
                // 格式化工具调用的人性化描述
                let toolDescription = '';
                if (toolCall.toolName === 'createTradeWithSession') {
                  const args = toolCall.args as any;
                  toolDescription = `记录新交易: ${args.side || ''} ${args.productType || ''} ${args.product || ''} - 数量: ${args.amount || ''} - 价格: ${args.priceInCurrency || args.priceInUSD || ''}`;
                } else if (toolCall.toolName === 'updateTradeWithSession') {
                  const args = toolCall.args as any;
                  toolDescription = `更新交易: ID ${args.id || ''}`;
                } else if (toolCall.toolName === 'deleteTradeWithSession') {
                  const args = toolCall.args as any;
                  toolDescription = `删除交易: ID ${args.id || ''}`;
                } else {
                  toolDescription = `调用工具: ${toolCall.toolName}`;
                }
                
                // 格式化工具调用信息
                const toolCallInfo = {
                  type: 'tool-call-info',
                  toolName: toolCall.toolName,
                  description: toolDescription,
                  args: toolCall.args,
                  result: toolResult?.result,
                  timestamp: new Date().toLocaleString('zh-CN', { 
                    timeZone: 'Asia/Shanghai',
                    year: 'numeric',
                    month: '2-digit', 
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })
                };
                
                // 将格式化的工具调用信息发送到数据流，附加在AI响应后
                dataStream.writeData({
                  type: 'tool-call',
                  content: `\n\n**工具调用详情:**\n- 操作: ${toolDescription}\n- 执行时间: ${toolCallInfo.timestamp}\n- 状态: ${toolResult?.result ? '成功' : '处理中'}`
                });
              }
            }
          },
          onFinish: async ({ response }) => {
            if (session.user?.id) {
              try {
                const assistantId = getTrailingMessageId({
                  messages: response.messages.filter(
                    (message) => message.role === 'assistant',
                  ),
                });

                if (!assistantId) {
                  throw new Error('No assistant message found!');
                }

                const [, assistantMessage] = appendResponseMessages({
                  messages: [validatedData.message],
                  responseMessages: response.messages,
                });

                await saveMessages({
                  messages: [
                    {
                      id: assistantId,
                      chatId: validatedData.id,
                      role: assistantMessage.role,
                      parts: assistantMessage.parts,
                      attachments:
                        assistantMessage.experimental_attachments ?? [],
                      createdAt: new Date(),
                    },
                  ],
                });
              } catch (_) {
                console.error('Failed to save chat');
              }
            }
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: 'stream-text',
          },
        });

        result.consumeStream();

        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true,
        });
      },
      onError: (error:any) => {
        console.error('Stream error:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        return 'Oops, an error occurred!';
      },
    });

    const streamContext = getStreamContext();

    if (streamContext) {
      return new Response(
        await streamContext.resumableStream(streamId, () => stream),
      );
    } else {
      return new Response(stream);
    }
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    return new ChatSDKError('bad_request:internal_server_error').toResponse();
  }
}





export async function GET(request: Request) {
  const streamContext = getStreamContext();
  const resumeRequestedAt = new Date();

  if (!streamContext) {
    return new Response(null, { status: 204 });
  }

  const { searchParams } = new URL(request.url);
  const strategyChatId = searchParams.get('strategyChatId');

  if (!strategyChatId) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  let chat: StrategyChat;

  try {
    chat = await getStrategyChatById({ id: strategyChatId });
  } catch {
    return new ChatSDKError('not_found:chat').toResponse();
  }

  if (!chat) {
    return new ChatSDKError('not_found:chat').toResponse();
  }


  const streamIds = await getStreamIdsByChatId({ chatId: strategyChatId });

  if (!streamIds.length) {
    return new ChatSDKError('not_found:stream').toResponse();
  }

  const recentStreamId = streamIds.at(-1);

  if (!recentStreamId) {
    return new ChatSDKError('not_found:stream').toResponse();
  }

  const emptyDataStream = createDataStream({
    execute: () => {},
  });

  const stream = await streamContext.resumableStream(
    recentStreamId,
    () => emptyDataStream,
  );

  /*
   * For when the generation is streaming during SSR
   * but the resumable stream has concluded at this point.
   */
  if (!stream) {
    const messages = await getMessagesByChatId({ id: strategyChatId });
    const mostRecentMessage = messages.at(-1);

    if (!mostRecentMessage) {
      return new Response(emptyDataStream, { status: 200 });
    }

    if (mostRecentMessage.role !== 'assistant') {
      return new Response(emptyDataStream, { status: 200 });
    }

    const messageCreatedAt = new Date(mostRecentMessage.createdAt);

    if (differenceInSeconds(resumeRequestedAt, messageCreatedAt) > 15) {
      return new Response(emptyDataStream, { status: 200 });
    }

    const restoredStream = createDataStream({
      execute: (buffer) => {
        buffer.writeData({
          type: 'append-message',
          message: JSON.stringify(mostRecentMessage),
        });
      },
    });

    return new Response(restoredStream, { status: 200 });
  }

  return new Response(stream, { status: 200 });
}





export async function PATCH(request: NextRequest) {
  let validatedData: PatchRequestBody;

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:strategy').toResponse();
  }

  try {
    const body = await request.json();
    validatedData = updateStrategyChatStatusSchema.parse(body);
  } catch (_) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  try {
    const chat = await getStrategyChatById({ id: validatedData.id });

    if (!chat) {
      return new ChatSDKError('not_found:chat').toResponse();
    }

    if (chat.userId !== session.user.id) {
      return new ChatSDKError('forbidden:chat').toResponse();
    }

    const updatedChat = await updateStrategyChatStatus({
      id: validatedData.id,
      status: validatedData.status,
    });

    return Response.json(updatedChat, { status: 200 });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    return new ChatSDKError('bad_request:internal_server_error').toResponse();
  }
}


export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const strategyChatId = searchParams.get('strategyChatId');

  if (!strategyChatId) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const chat = await getStrategyChatById({ id: strategyChatId });

  if (chat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  const deletedStrategyChat = await deleteStrategyChatById({ id: strategyChatId });

  return Response.json(deletedStrategyChat, { status: 200 });
}
