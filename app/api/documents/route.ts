import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateEmbedding, chunkText } from '@/lib/embeddings';

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

    const content = await file.text();

    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        user_id: userId,
        title: file.name.replace(/\.[^/.]+$/, ''),
        file_name: file.name,
        file_size: file.size,
        content: content,
        status: 'processing',
      })
      .select()
      .single();

    if (docError) {
      return NextResponse.json({ error: docError.message }, { status: 500 });
    }

    const chunks = chunkText(content);

    for (let i = 0; i < chunks.length; i++) {
      const embedding = await generateEmbedding(chunks[i]);

      await supabase.from('document_chunks').insert({
        document_id: document.id,
        content: chunks[i],
        embedding: embedding,
        chunk_index: i,
      });
    }

    await supabase
      .from('documents')
      .update({ status: 'completed' })
      .eq('id', document.id);

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

    const { data: documents, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}
