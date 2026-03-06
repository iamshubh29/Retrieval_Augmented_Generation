import { GoogleGenAI } from '@google/genai';

/** Upstash index uses 1536 dimensions. gemini-embedding-001 can output 1536 natively. */
export const EMBEDDING_DIMENSION = 1536;

export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: text,
    config: {
      outputDimensionality: EMBEDDING_DIMENSION,
    } as { outputDimensionality?: number },
  });

  const embedding = response.embeddings?.[0]?.values;
  if (!embedding || !Array.isArray(embedding)) {
    throw new Error('Failed to generate embedding from Gemini');
  }

  return padEmbeddingTo1536(embedding);
}

/** Pad Gemini 768-dim embedding to 1536 for Upstash (zero-padding). */
export function padEmbeddingTo1536(embedding: number[]): number[] {
  if (embedding.length >= EMBEDDING_DIMENSION) {
    return embedding.slice(0, EMBEDDING_DIMENSION);
  }
  const padded = [...embedding];
  while (padded.length < EMBEDDING_DIMENSION) {
    padded.push(0);
  }
  return padded;
}

export function chunkText(text: string, maxChunkSize: number = 1000): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
