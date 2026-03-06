import { NextResponse } from 'next/server';
import { getDb, type ConversationRow } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const result = await db
      .request()
      .input('userId', userId)
      .query<ConversationRow>(
        'SELECT * FROM conversations WHERE user_id = @userId ORDER BY updated_at DESC;'
      );

    const conversations = result.recordset;

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}
