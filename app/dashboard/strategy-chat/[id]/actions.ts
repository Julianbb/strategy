'use server';

import { cookies } from 'next/headers';
import {getMessageById, deleteMessagesByChatIdAfterTimestamp} from "@/lib/db/queries"

export async function saveChatModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set('chat-model', model);
}


export async function deleteTrailingMessages({ id }: { id: string }) {
    const [message] = await getMessageById({ id });
  
    await deleteMessagesByChatIdAfterTimestamp({
      chatId: message.chatId,
      timestamp: message.createdAt,
    });
  }