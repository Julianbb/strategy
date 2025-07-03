import { NextRequest } from 'next/server';



import {
  appendClientMessage,
  appendResponseMessages,
  createDataStream,
  smoothStream,
  streamText,
} from 'ai';

import { anthropic } from '@ai-sdk/anthropic';

import { auth } from '@/app/(auth)/auth';


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





import {toolFactories} from "@/lib/ai/tools"


import { isProductionEnvironment } from '@/lib/constants';

import { createStrategyChatSchema, updateStrategyChatStatusSchema, type PostRequestBody, type PatchRequestBody } from './schema';

import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from 'resumable-stream';
import { after } from 'next/server';
import type { StrategyChat } from '@/lib/db/schema';
import { differenceInSeconds } from 'date-fns';
import { ChatSDKError } from '@/lib/errors';

export const maxDuration = 60;

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
  } catch (_) {
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
        
        const result = streamText({
          model: anthropic('claude-3-haiku-20240307'),
          messages,
          maxSteps: 5,
          experimental_activeTools:toolsName,
          experimental_transform: smoothStream({ chunking: 'word' }),
          experimental_generateMessageId: generateUUID,
          tools,
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
      onError: (error) => {
       
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
