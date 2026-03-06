import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { generateEmbedding, chunkText } from '@/lib/embeddings';
import { getDb, type DocumentRow } from '@/lib/db';
import { upsertChunk } from '@/lib/upstash-vector';

export const runtime = 'nodejs';

async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  if (name.endsWith('.pdf')) {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const result = await pdfParse(buffer);
    return result.text || '';
  }

  if (name.endsWith('.docx')) {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  }

  // Fallback: plain text (.txt, .md, others)
  return await file.text();
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file || !userId) {
      return NextResponse.json(
        { error: 'File and userId are required' },
        { status: 400 }
      );
    }

    const content = await extractTextFromFile(file);
    if (!content.trim()) {
      return NextResponse.json(
        { error: 'Could not read any text content from file' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const documentId = randomUUID();
    const title = file.name.replace(/\.[^/.]+$/, '');

    const insertResult = await db
      .request()
      .input('id', documentId)
      .input('userId', userId)
      .input('title', title)
      .input('fileName', file.name)
      .input('fileSize', file.size)
      .input('content', content)
      .input('status', 'processing')
      .query<DocumentRow>(`
        INSERT INTO documents (id, user_id, title, file_name, file_size, content, status)
        VALUES (@id, @userId, @title, @fileName, @fileSize, @content, @status);
        SELECT * FROM documents WHERE id = @id;
      `);

    const document = insertResult.recordset[0];

    const chunks = chunkText(content);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await generateEmbedding(chunk);

      await upsertChunk(`${document.id}_${i}`, embedding, {
        documentId: document.id,
        userId,
        content: chunk,
        chunkIndex: i,
        title: document.title,
        fileName: document.file_name,
      });
    }

    await db
      .request()
      .input('id', document.id)
      .input('status', 'completed')
      .query(
        'UPDATE documents SET status = @status, updated_at = SYSUTCDATETIME() WHERE id = @id;'
      );

    return NextResponse.json({ document, chunksCount: chunks.length });
  } catch (error) {
    console.error('Error processing document:', error);
    return NextResponse.json(
      { error: 'Failed to process document' },
      { status: 500 }
    );
  }
}

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
      .query<DocumentRow>(
        'SELECT * FROM documents WHERE user_id = @userId ORDER BY created_at DESC;'
      );

    const documents = result.recordset;

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}
