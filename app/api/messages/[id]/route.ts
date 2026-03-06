import { NextResponse } from 'next/server';
import { getDb, type MessageRow } from '@/lib/db';

export const runtime = 'nodejs';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const { content } = await request.json();
    if (!id || !content) {
      return NextResponse.json(
        { error: 'id and content are required' },
        { status: 400 }
      );
    }
    const db = await getDb();
    const result = await db
      .request()
      .input('id', id)
      .input('content', content)
      .query<MessageRow>(`
        UPDATE messages
        SET content = @content
        WHERE id = @id AND role = 'user';
        SELECT * FROM messages WHERE id = @id;
      `);
    const message = result.recordset?.[0];
    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error updating message:', error);
    return NextResponse.json(
      { error: 'Failed to update message' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    const db = await getDb();
    await db.request().input('id', id).query(`DELETE FROM messages WHERE id = @id;`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { error: 'Failed to delete message' },
      { status: 500 }
    );
  }
}

