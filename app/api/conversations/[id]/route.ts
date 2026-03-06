import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

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
    await db.request().input('id', id).query(`DELETE FROM messages WHERE conversation_id = @id;`);
    await db.request().input('id', id).query(`DELETE FROM conversations WHERE id = @id;`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}

