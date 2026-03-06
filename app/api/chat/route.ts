import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { generateEmbedding } from '@/lib/embeddings';
import { getDb, type ConversationRow, type MessageRow } from '@/lib/db';
import { queryChunks } from '@/lib/upstash-vector';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { message, conversationId, userId } = await request.json();

    if (!message || !userId) {
      return NextResponse.json(
        { error: 'Message and userId are required' },
        { status: 400 }
      );
    }

    const db = await getDb();
    let activeConversationId: string | null = conversationId || null;

    if (!activeConversationId) {
      const newConversationId = randomUUID();
      const title = message.substring(0, 50) + '...';

      await db
        .request()
        .input('id', newConversationId)
        .input('userId', userId)
        .input('title', title)
        .query<ConversationRow>(`
          INSERT INTO conversations (id, user_id, title)
          VALUES (@id, @userId, @title);
        `);

      activeConversationId = newConversationId;
    }

    const userMessageId = randomUUID();
    await db
      .request()
      .input('id', userMessageId)
      .input('conversationId', activeConversationId)
      .input('role', 'user')
      .input('content', message)
      .query<MessageRow>(`
        INSERT INTO messages (id, conversation_id, role, content)
        VALUES (@id, @conversationId, @role, @content);
      `);

    const queryEmbedding = await generateEmbedding(message);

    const similarChunks = await queryChunks(queryEmbedding, {
      topK: 5,
      userId,
    });

    let context = '';
    if (similarChunks.length > 0) {
      context = similarChunks
        .map((chunk) => chunk.metadata.content)
        .join('\n\n---\n\n');
    }

    let assistantMessage: string;
    let sources:
      | Array<{
          documentId: string;
          content: string;
        }>
      | [] = [];

    if (!context) {
      assistantMessage = "I don't know based on the provided documents.";
      sources = [];
    } else {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not set');
      }

      const ai = new GoogleGenAI({ apiKey });

      const systemInstruction =
        "You are a retrieval-augmented assistant. Answer ONLY using the information in the provided context. If the context does not contain the answer, reply exactly with: \"I don't know based on the provided documents.\" Do not use outside knowledge or make up facts.";

      const prompt = `${systemInstruction}\n\nContext:\n${context}\n\nQuestion:\n${message}`;

      const geminiResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      // @ts-expect-error: response shape provided by @google/genai
      assistantMessage = geminiResponse.response?.text?.() ?? '';

      if (!assistantMessage.trim()) {
        assistantMessage =
          "I don't know based on the provided documents.";
      }

      sources = similarChunks.map((chunk) => ({
        documentId: chunk.metadata.documentId,
        content: chunk.metadata.content.substring(0, 200) + '...',
      }));
    }

    const assistantMessageId = randomUUID();
    await db
      .request()
      .input('id', assistantMessageId)
      .input('conversationId', activeConversationId)
      .input('role', 'assistant')
      .input('content', assistantMessage)
      .input('sources', JSON.stringify(sources))
      .query<MessageRow>(`
        INSERT INTO messages (id, conversation_id, role, content, sources)
        VALUES (@id, @conversationId, @role, @content, @sources);
      `);

    await db
      .request()
      .input('id', activeConversationId)
      .query(
        'UPDATE conversations SET updated_at = SYSUTCDATETIME() WHERE id = @id;'
      );

    return NextResponse.json({
      message: assistantMessage,
      conversationId: activeConversationId,
      sources,
    });
  } catch (error) {
    console.error('Error in chat:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}
