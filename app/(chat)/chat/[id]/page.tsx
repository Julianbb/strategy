import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

import { auth } from '@/app/(auth)/auth';
import { MobileChatLayout } from '@/components/mobile-chat-layout';
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
      <MobileChatLayout
        strategyChat={strategyChat}
        tradesInCurrentStrategy={tradesInCurrentStrategy}
        chatId={chat.id}
        strategyChatId={strategyChat.id}
        initialMessages={convertToUIMessages(messagesFromDb)}
        initialChatModel={chatModelFromCookie?.value || DEFAULT_CHAT_MODEL}
        isReadonly={session?.user?.id !== chat.userId}
        session={session}
      />
    </>
  );
}
