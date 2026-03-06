// import { NextResponse } from 'next/server';
// import { randomUUID } from 'crypto';
// import pdfParse from 'pdf-parse';
// import mammoth from 'mammoth';
// import { generateEmbedding, chunkText } from '@/lib/embeddings';
// import { getDb, type DocumentRow } from '@/lib/db';
// import { upsertChunk } from '@/lib/upstash-vector';

// export const runtime = 'nodejs';

// async function extractTextFromFile(file: File): Promise<string> {
//   const name = file.name.toLowerCase();

//   if (name.endsWith('.pdf')) {
//     const arrayBuffer = await file.arrayBuffer();
//     const buffer = Buffer.from(arrayBuffer);
//     const result = await pdfParse(buffer);
//     return result.text || '';
//   }

//   if (name.endsWith('.docx')) {
//     const arrayBuffer = await file.arrayBuffer();
//     const buffer = Buffer.from(arrayBuffer);
//     const result = await mammoth.extractRawText({ buffer });
//     return result.value || '';
//   }

//   // Fallback: plain text (.txt, .md, others)
//   return await file.text();
// }

// export async function POST(request: Request) {
//   try {
//     const formData = await request.formData();
//     const file = formData.get('file') as File;
//     const userId = formData.get('userId') as string;

//     if (!file || !userId) {
//       return NextResponse.json(
//         { error: 'File and userId are required' },
//         { status: 400 }
//       );
//     }

//     const content = await extractTextFromFile(file);
//     if (!content.trim()) {
//       return NextResponse.json(
//         { error: 'Could not read any text content from file' },
//         { status: 400 }
//       );
//     }

//     const db = await getDb();
//     const documentId = randomUUID();
//     const title = file.name.replace(/\.[^/.]+$/, '');

//     const insertResult = await db
//       .request()
//       .input('id', documentId)
//       .input('userId', userId)
//       .input('title', title)
//       .input('fileName', file.name)
//       .input('fileSize', file.size)
//       .input('content', content)
//       .input('status', 'processing')
//       .query<DocumentRow>(`
//         INSERT INTO documents (id, user_id, title, file_name, file_size, content, status)
//         VALUES (@id, @userId, @title, @fileName, @fileSize, @content, @status);
//         SELECT * FROM documents WHERE id = @id;
//       `);

//     const document = insertResult.recordset[0];

//     const chunks = chunkText(content);
//     let successCount = 0;

//     for (let i = 0; i < chunks.length; i++) {
//       const chunk = chunks[i];
//       try {
//         const embedding = await generateEmbedding(chunk);

//         await upsertChunk(`${document.id}_${i}`, embedding, {
//           documentId: document.id,
//           userId,
//           content: chunk,
//           chunkIndex: i,
//           title: document.title,
//           fileName: document.file_name,
//         });
//         successCount++;
//       } catch (e) {
//         console.error('Chunk upsert failed', e);
//       }
//     }

//     await db
//       .request()
//       .input('id', document.id)
//       .input('status', successCount > 0 ? 'completed' : 'failed')
//       .query(
//         'UPDATE documents SET status = @status, updated_at = SYSUTCDATETIME() WHERE id = @id;'
//       );

//     return NextResponse.json({ document, chunksCount: successCount });
//   } catch (error) {
//     console.error('Error processing document:', error);
//     try {
//       const formData = await request.formData();
//       const userId = formData.get('userId') as string;
//       const file = formData.get('file') as File;
//       const title = file ? file.name.replace(/\.[^/.]+$/, '') : 'Unknown';
//       const db = await getDb();
//       const result = await db
//         .request()
//         .input('userId', userId || '')
//         .input('title', title)
//         .query<DocumentRow>(`
//           SELECT TOP 1 * FROM documents WHERE user_id = @userId AND title = @title ORDER BY created_at DESC;
//         `);
//       const doc = result.recordset?.[0];
//       if (doc?.id) {
//         await db
//           .request()
//           .input('id', doc.id)
//           .input('status', 'failed')
//           .query(
//             'UPDATE documents SET status = @status, updated_at = SYSUTCDATETIME() WHERE id = @id;'
//           );
//       }
//     } catch {}
//     return NextResponse.json(
//       { error: 'Failed to process document' },
//       { status: 500 }
//     );
//   }
// }

// export async function GET(request: Request) {
//   try {
//     const { searchParams } = new URL(request.url);
//     const userId = searchParams.get('userId');

//     if (!userId) {
//       return NextResponse.json(
//         { error: 'userId is required' },
//         { status: 400 }
//       );
//     }

//     const db = await getDb();
//     const result = await db
//       .request()
//       .input('userId', userId)
//       .query<DocumentRow>(
//         'SELECT * FROM documents WHERE user_id = @userId ORDER BY created_at DESC;'
//       );

//     const documents = result.recordset;

//     return NextResponse.json({ documents });
//   } catch (error) {
//     console.error('Error fetching documents:', error);
//     return NextResponse.json(
//       { error: 'Failed to fetch documents' },
//       { status: 500 }
//     );
//   }
// }
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
  return await file.text();
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file || !userId) {
      return NextResponse.json({ error: 'File and userId are required' }, { status: 400 });
    }

    const content = await extractTextFromFile(file);
    if (!content.trim()) {
      return NextResponse.json({ error: 'Could not read any text content' }, { status: 400 });
    }

    const db = await getDb();
    const documentId = randomUUID();
    const title = file.name.replace(/\.[^/.]+$/, '');

    // Insert initial record
    const insertResult = await db.request()
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
    let successCount = 0;

    for (let i = 0; i < chunks.length; i++) {
      try {
        const chunk = chunks[i];
        const embedding = await generateEmbedding(chunk);

        // Ensure this matches exactly what chat/route.ts looks for
        await upsertChunk(`${document.id}_${i}`, embedding, {
          documentId: document.id,
          userId,
          content: chunk, // Chat route looks for 'content'
          chunkIndex: i,
          title: document.title,
          fileName: document.file_name,
        });
        successCount++;
      } catch (e) {
        console.error(`Chunk ${i} failed. Check if Upstash is Vector (not Redis):`, e);
      }
    }

    const finalStatus = successCount === chunks.length ? 'completed' : successCount > 0 ? 'partially_completed' : 'failed';

    await db.request()
      .input('id', document.id)
      .input('status', finalStatus)
      .query('UPDATE documents SET status = @status, updated_at = SYSUTCDATETIME() WHERE id = @id;');

    return NextResponse.json({ document, chunksCount: successCount });
  } catch (error) {
    console.error('Final Error:', error);
    return NextResponse.json({ error: 'Failed to process document' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });

    const db = await getDb();
    const result = await db.request()
      .input('userId', userId)
      .query<DocumentRow>('SELECT * FROM documents WHERE user_id = @userId ORDER BY created_at DESC;');

    return NextResponse.json({ documents: result.recordset });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}