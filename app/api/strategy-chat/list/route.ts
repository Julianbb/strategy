import { auth } from '@/app/(auth)/auth';
import { getStrategyChatsByUserId } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  try {
    // Get all strategy chats for table view (no pagination limit)
    const chats = await getStrategyChatsByUserId({
      id: session.user.id,
      limit: 1000, // Large limit for table view
      startingAfter: null,
      endingBefore: null,
    });

    return Response.json(chats.chats);
  } catch (error) {
    console.error('Error fetching strategy chats:', error);
    return new ChatSDKError('bad_request:database', 'Failed to fetch strategy chats').toResponse();
  }
}