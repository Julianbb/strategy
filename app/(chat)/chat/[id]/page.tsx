import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

import { auth } from '@/app/(auth)/auth';
import { FloatingChat } from '@/components/floating-chat';

import {StrategyCard} from "@/components/strategy-summary-card"
import {ChartAreaInteractive} from '@/components/strategy-line-chart'
import {DataTable}  from '@/components/strategy-trades-sheets'
import { getChatById, getMessagesByChatId, getStrategyChatFromChatId,getTradesByStrategyChat } from '@/lib/db/queries';

import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import type { DBMessage } from '@/lib/db/schema';
import type { Attachment, UIMessage } from 'ai';

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const chat = await getChatById({ id });

  if (!chat) {
    notFound();
  }

  const session = await auth();

  if (!session) {
    redirect('/api/auth/guest');
  }

  if (session.user.id !== chat.userId) {
    return notFound();
  }
  

  const messagesFromDb = await getMessagesByChatId({id});
  const strategyChat = await getStrategyChatFromChatId({ chatId: id });
  const tradesInCurrentStrategy = await getTradesByStrategyChat({strategyChatId: strategyChat?.id || '' });

  function convertToUIMessages(messages: Array<DBMessage>): Array<UIMessage> {
    return messages.map((message) => ({
      id: message.id,
      parts: message.parts as UIMessage['parts'],
      role: message.role as UIMessage['role'],
      // Note: content will soon be deprecated in @ai-sdk/react
      content: '',
      createdAt: message.createdAt,
      experimental_attachments:
        (message.attachments as Array<Attachment>) ?? [],
    }));
  }

  const cookieStore = await cookies();
  const chatModelFromCookie = cookieStore.get('chat-model');

  return (
    <>
      <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                <StrategyCard strategyChat={strategyChat} tradesInCurrentStrategy={tradesInCurrentStrategy}/>
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive strategyChat={strategyChat} />
              </div>
              <DataTable tradesInCurrentStrategy={tradesInCurrentStrategy} baseCurrency={strategyChat.baseCurrency} />
            </div>
          </div>
        </div>
      <FloatingChat
        id={chat.id}
        strategyChatId={strategyChat.id}
        initialMessages={convertToUIMessages(messagesFromDb)}
        initialChatModel={chatModelFromCookie?.value || DEFAULT_CHAT_MODEL}
        isReadonly={session?.user?.id !== chat.userId}
        session={session}
        autoResume={true}
      />
    </>
  );
}
