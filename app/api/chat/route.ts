import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateEmbedding } from '@/lib/embeddings';

export async function POST(request: Request) {
  try {
    const { message, conversationId, userId } = await request.json();

    if (!message || !userId) {
      return NextResponse.json(
        { error: 'Message and userId are required' },
        { status: 400 }
      );
    }

    let activeConversationId = conversationId;

    if (!activeConversationId) {
      const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          user_id: userId,
          title: message.substring(0, 50) + '...',
        })
        .select()
        .single();

      if (convError) {
        return NextResponse.json(
          { error: convError.message },
          { status: 500 }
        );
      }

      activeConversationId = newConversation.id;
    }

    await supabase.from('messages').insert({
      conversation_id: activeConversationId,
      role: 'user',
      content: message,
    });

    const queryEmbedding = await generateEmbedding(message);

    const { data: similarChunks, error: searchError } = await supabase.rpc(
      'match_document_chunks',
      {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: 5,
        user_id_param: userId,
      }
    );

    if (searchError) {
      console.error('Search error:', searchError);
    }

    const context = similarChunks
      ? similarChunks.map((chunk: any) => chunk.content).join('\n\n')
      : '';

    const systemPrompt = context
      ? `You are a helpful assistant. Use the following context to answer the user's question. If the context doesn't contain relevant information, say so and provide a general answer.\n\nContext:\n${context}`
      : 'You are a helpful assistant. Answer the user\'s question to the best of your ability.';

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get response from OpenAI');
    }

    const aiResponse = await response.json();
    const assistantMessage = aiResponse.choices[0].message.content;

    const sources = similarChunks
      ? similarChunks.map((chunk: any) => ({
          documentId: chunk.document_id,
          content: chunk.content.substring(0, 200) + '...',
        }))
      : [];

    await supabase.from('messages').insert({
      conversation_id: activeConversationId,
      role: 'assistant',
      content: assistantMessage,
      sources: sources,
    });

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
