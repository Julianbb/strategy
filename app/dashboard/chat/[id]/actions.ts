'use server';
import {getMessageById, deleteMessagesByChatIdAfterTimestamp} from "@/lib/db/queries"




export async function deleteTrailingMessages({ id }: { id: string }) {
    const [message] = await getMessageById({ id });
  
    await deleteMessagesByChatIdAfterTimestamp({
      chatId: message.chatId,
      timestamp: message.createdAt,
    });
  }