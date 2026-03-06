// // import { NextResponse } from 'next/server';
// // import { randomUUID } from 'crypto';
// // import { GoogleGenAI } from '@google/genai';
// // import { generateEmbedding } from '@/lib/embeddings';
// // import { getDb, type ConversationRow, type MessageRow } from '@/lib/db';
// // import { queryChunks } from '@/lib/upstash-vector';

// // export const runtime = 'nodejs';

// // export async function POST(request: Request) {
// //   try {
// //     const { message, conversationId, userId, scope, documentId } = await request.json();

// //     if (!message || !userId) {
// //       return NextResponse.json(
// //         { error: 'Message and userId are required' },
// //         { status: 400 }
// //       );
// //     }

// //     const db = await getDb();
// //     let activeConversationId: string | null = conversationId || null;

// //     if (!activeConversationId) {
// //       const newConversationId = randomUUID();
// //       const title = message.substring(0, 50) + '...';

// //       await db
// //         .request()
// //         .input('id', newConversationId)
// //         .input('userId', userId)
// //         .input('title', title)
// //         .query<ConversationRow>(`
// //           INSERT INTO conversations (id, user_id, title)
// //           VALUES (@id, @userId, @title);
// //         `);

// //       activeConversationId = newConversationId;
// //     }

// //     const userMessageId = randomUUID();
// //     await db
// //       .request()
// //       .input('id', userMessageId)
// //       .input('conversationId', activeConversationId)
// //       .input('role', 'user')
// //       .input('content', message)
// //       .query<MessageRow>(`
// //         INSERT INTO messages (id, conversation_id, role, content)
// //         VALUES (@id, @conversationId, @role, @content);
// //       `);

// //     const queryEmbedding = await generateEmbedding(message);

// //     const similarChunks = await queryChunks(queryEmbedding, {
// //       topK: 5,
// //       userId,
// //       documentId: scope === 'specific' && documentId ? documentId : undefined,
// //     });

// //     let context = '';
// //     if (similarChunks.length > 0) {
// //       context = similarChunks
// //         .map((chunk) => chunk.metadata.content)
// //         .join('\n\n---\n\n');
// //     }

// //     let assistantMessage: string;
// //     let sources:
// //       | Array<{
// //           documentId: string;
// //           fileName?: string;
// //           title?: string;
// //           chunkIndex?: number;
// //           content?: string;
// //         }>
// //       | [] = [];

// //     if (!context) {
// //       assistantMessage =
// //         "I couldn't find any relevant content in your uploaded documents. If you recently changed your vector database credentials, re-upload your documents so their embeddings are indexed, then try again.";
// //       sources = [];
// //     } else {
// //       const apiKey = process.env.GEMINI_API_KEY;
// //       if (!apiKey) {
// //         throw new Error('GEMINI_API_KEY is not set');
// //       }

// //       const ai = new GoogleGenAI({ apiKey });

// //       const systemInstruction =
// //         "You are a retrieval-augmented assistant. Answer ONLY using the information in the provided context. If the context does not contain the answer, reply exactly with: \"I don't know based on the provided documents.\" Do not use outside knowledge or make up facts.";

// //       const prompt = `${systemInstruction}\n\nContext:\n${context}\n\nQuestion:\n${message}`;

// //       const geminiResponse = await ai.models.generateContent({
// //         model: 'gemini-2.5-flash',
// //         contents: [{ role: 'user', parts: [{ text: prompt }] }],
// //       });

// //       // @ts-expect-error: response shape provided by @google/genai
// //       assistantMessage = geminiResponse.response?.text?.() ?? '';

// //       if (!assistantMessage.trim()) {
// //         assistantMessage =
// //           "I don't know based on the provided documents.";
// //       }

// //       sources = similarChunks.map((chunk) => ({
// //         documentId: chunk.metadata.documentId,
// //         fileName: String(chunk.metadata.fileName || ''),
// //         title: String(chunk.metadata.title || ''),
// //         chunkIndex: Number(chunk.metadata.chunkIndex ?? 0),
// //       }));
// //     }

// //     const assistantMessageId = randomUUID();
// //     await db
// //       .request()
// //       .input('id', assistantMessageId)
// //       .input('conversationId', activeConversationId)
// //       .input('role', 'assistant')
// //       .input('content', assistantMessage)
// //       .input('sources', JSON.stringify(sources))
// //       .query<MessageRow>(`
// //         INSERT INTO messages (id, conversation_id, role, content, sources)
// //         VALUES (@id, @conversationId, @role, @content, @sources);
// //       `);

// //     await db
// //       .request()
// //       .input('id', activeConversationId)
// //       .query(
// //         'UPDATE conversations SET updated_at = SYSUTCDATETIME() WHERE id = @id;'
// //       );

// //     return NextResponse.json({
// //       message: assistantMessage,
// //       conversationId: activeConversationId,
// //       sources,
// //     });
// //   } catch (error) {
// //     console.error('Error in chat:', error);
// //     return NextResponse.json(
// //       { error: 'Failed to process chat message' },
// //       { status: 500 }
// //     );
// //   }// }
// import { NextResponse } from 'next/server';
// import { randomUUID } from 'crypto';
// // FIX 1: Corrected package name
// import { GoogleGenerativeAI } from '@google/generative-ai'; 
// import { generateEmbedding } from '@/lib/embeddings';
// import { getDb, type ConversationRow, type MessageRow } from '@/lib/db';
// import { queryChunks } from '@/lib/upstash-vector';

// export const runtime = 'nodejs';

// // Define an interface for your metadata to solve the .trim() error
// interface ChunkMetadata {
//   content?: string;
//   text?: string;
//   documentId?: string;
//   fileName?: string;
//   title?: string;
//   chunkIndex?: number;
// }

// export async function POST(request: Request) {
//   try {
//     const { message, conversationId, userId, scope, documentId } = await request.json();

//     if (!message || !userId) {
//       return NextResponse.json(
//         { error: 'Message and userId are required' },
//         { status: 400 }
//       );
//     }

//     const db = await getDb();
//     let activeConversationId: string | null = conversationId || null;

//     if (!activeConversationId) {
//       const newConversationId = randomUUID();
//       const title = message.substring(0, 50) + '...';

//       await db
//         .request()
//         .input('id', newConversationId)
//         .input('userId', userId)
//         .input('title', title)
//         .query<ConversationRow>(`
//           INSERT INTO conversations (id, user_id, title)
//           VALUES (@id, @userId, @title);
//         `);

//       activeConversationId = newConversationId;
//     }

//     const userMessageId = randomUUID();
//     await db
//       .request()
//       .input('id', userMessageId)
//       .input('conversationId', activeConversationId)
//       .input('role', 'user')
//       .input('content', message)
//       .query<MessageRow>(`
//         INSERT INTO messages (id, conversation_id, role, content)
//         VALUES (@id, @conversationId, @role, @content);
//       `);

//     const queryEmbedding = await generateEmbedding(message);

//     const similarChunks = await queryChunks(queryEmbedding, {
//       topK: 5,
//       userId,
//       documentId: scope === 'specific' && documentId ? documentId : undefined,
//     });

//     let context = '';
//     if (similarChunks.length > 0) {
//       context = similarChunks
//         .map((chunk) => {
//           // FIX 2: Explicitly cast metadata to our interface
//           const metadata = chunk.metadata as ChunkMetadata;
//           return metadata?.content || metadata?.text || '';
//         })
//         .filter((text) => text.trim().length > 0)
//         .join('\n\n---\n\n');
//     }

//     let assistantMessage: string;
//     let sources: any[] = [];

//     if (!context || context.length < 5) {
//       assistantMessage = "I couldn't find any relevant content in your uploaded documents.";
//       sources = [];
//     } else {
//       const apiKey = process.env.GEMINI_API_KEY;
//       if (!apiKey) {
//         throw new Error('GEMINI_API_KEY is not set');
//       }

//       // FIX 3: Updated class name to match the corrected import
//       const genAI = new GoogleGenerativeAI(apiKey);
//       const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

//       const systemInstruction =
//         "You are a retrieval-augmented assistant. Answer ONLY using the information in the provided context.";

//       const prompt = `${systemInstruction}\n\nContext:\n${context}\n\nQuestion:\n${message}`;

//       const result = await model.generateContent(prompt);
//       const response = await result.response;
//       assistantMessage = response.text();

//       sources = similarChunks.map((chunk) => {
//         const metadata = chunk.metadata as ChunkMetadata;
//         return {
//           documentId: metadata.documentId,
//           fileName: String(metadata.fileName || ''),
//           title: String(metadata.title || ''),
//           chunkIndex: Number(metadata.chunkIndex ?? 0),
//         };
//       });
//     }

//     const assistantMessageId = randomUUID();
//     await db
//       .request()
//       .input('id', assistantMessageId)
//       .input('conversationId', activeConversationId)
//       .input('role', 'assistant')
//       .input('content', assistantMessage)
//       .input('sources', JSON.stringify(sources))
//       .query<MessageRow>(`
//         INSERT INTO messages (id, conversation_id, role, content, sources)
//         VALUES (@id, @conversationId, @role, @content, @sources);
//       `);

//     await db
//       .request()
//       .input('id', activeConversationId)
//       .query('UPDATE conversations SET updated_at = GETUTCDATE() WHERE id = @id;');

//     return NextResponse.json({
//       message: assistantMessage,
//       conversationId: activeConversationId,
//       sources,
//     });
//   } catch (error) {
//     console.error('Error in chat route:', error);
//     return NextResponse.json(
//       { error: 'Failed to process chat message' },
//       { status: 500 }
//     );
//   }
// }
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai'; 
import { generateEmbedding } from '@/lib/embeddings';
import { getDb, type ConversationRow, type MessageRow } from '@/lib/db';
import { queryChunks } from '@/lib/upstash-vector';

export const runtime = 'nodejs';

interface ChunkMetadata {
  content?: string;
  text?: string;
  documentId?: string;
  fileName?: string;
  title?: string;
  chunkIndex?: number;
}

// Utility function to handle waiting/delays
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(request: Request) {
  try {
    const { message, conversationId, userId, scope, documentId } = await request.json();

    if (!message || !userId) {
      return NextResponse.json({ error: 'Message and userId are required' }, { status: 400 });
    }

    const db = await getDb();
    let activeConversationId: string | null = conversationId || null;

    // Database: Create conversation if new
    if (!activeConversationId) {
      const newConversationId = randomUUID();
      const title = message.substring(0, 50) + '...';
      await db.request()
        .input('id', newConversationId)
        .input('userId', userId)
        .input('title', title)
        .query<ConversationRow>(`INSERT INTO conversations (id, user_id, title) VALUES (@id, @userId, @title);`);
      activeConversationId = newConversationId;
    }

    // Database: Save user message
    const userMessageId = randomUUID();
    await db.request()
      .input('id', userMessageId)
      .input('conversationId', activeConversationId)
      .input('role', 'user')
      .input('content', message)
      .query<MessageRow>(`INSERT INTO messages (id, conversation_id, role, content) VALUES (@id, @conversationId, @role, @content);`);

    // RAG: Generate embeddings and query vector DB
    const queryEmbedding = await generateEmbedding(message);
    const similarChunks = await queryChunks(queryEmbedding, {
      topK: 5,
      userId,
      documentId: scope === 'specific' && documentId ? documentId : undefined,
    });

    let context = '';
    if (similarChunks.length > 0) {
      context = similarChunks
        .map((chunk) => {
          const metadata = chunk.metadata as ChunkMetadata;
          return metadata?.content || metadata?.text || '';
        })
        .filter((text) => text.trim().length > 0)
        .join('\n\n---\n\n');
    }

    let assistantMessage = '';
    let sources: any[] = [];

    if (!context || context.length < 5) {
      assistantMessage = "I couldn't find any relevant content in your uploaded documents.";
    } else {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

      const genAI = new GoogleGenerativeAI(apiKey);
      // Using gemini-2.5-flash for 2026 stable performance
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const systemInstruction = "You are a retrieval-augmented assistant. Answer ONLY using the information in the provided context.";
      const prompt = `${systemInstruction}\n\nContext:\n${context}\n\nQuestion:\n${message}`;

      // --- RETRY LOGIC START ---
      let result;
      const maxRetries = 3;
      for (let i = 0; i < maxRetries; i++) {
        try {
          result = await model.generateContent(prompt);
          break; // Success! Exit the retry loop.
        } catch (error: any) {
          if (error.status === 429 && i < maxRetries - 1) {
            const waitTime = Math.pow(2, i) * 2000; // 2s, 4s, 8s
            console.warn(`Rate limited. Retrying in ${waitTime/1000}s... (Attempt ${i + 1}/${maxRetries})`);
            await sleep(waitTime);
            continue;
          }
          throw error; // Not a 429 or exhausted retries, throw the error.
        }
      }
      // --- RETRY LOGIC END ---

      const response = await result?.response;
      assistantMessage = response?.text() || "I'm sorry, I couldn't generate a response.";

      sources = similarChunks.map((chunk) => {
        const metadata = chunk.metadata as ChunkMetadata;
        return {
          documentId: metadata.documentId,
          fileName: String(metadata.fileName || ''),
          title: String(metadata.title || ''),
          chunkIndex: Number(metadata.chunkIndex ?? 0),
        };
      });
    }

    // Database: Save assistant message
    const assistantMessageId = randomUUID();
    await db.request()
      .input('id', assistantMessageId)
      .input('conversationId', activeConversationId)
      .input('role', 'assistant')
      .input('content', assistantMessage)
      .input('sources', JSON.stringify(sources))
      .query<MessageRow>(`INSERT INTO messages (id, conversation_id, role, content, sources) VALUES (@id, @conversationId, @role, @content, @sources);`);

    // Database: Update timestamp
    await db.request().input('id', activeConversationId).query('UPDATE conversations SET updated_at = GETUTCDATE() WHERE id = @id;');

    return NextResponse.json({ message: assistantMessage, conversationId: activeConversationId, sources });
  } catch (error: any) {
    console.error('Error in chat route:', error);
    return NextResponse.json({ error: 'Failed to process chat message', details: error.message }, { status: error.status || 500 });
  }
}