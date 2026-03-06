import { NextResponse } from 'next/server';
import { getDb, type MessageRow } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId is required' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const result = await db
      .request()
      .input('conversationId', conversationId)
      .query<MessageRow>(
        'SELECT * FROM messages WHERE conversation_id = @conversationId ORDER BY created_at ASC;'
      );

    const messages = result.recordset.map((m: MessageRow) => ({
      ...m,
      // Parse JSON string from SQL into actual array for the frontend
      sources: m.sources ? JSON.parse(m.sources) : undefined,
    }));

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
