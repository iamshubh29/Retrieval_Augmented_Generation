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
  const normalized = (text || '').replace(/\r\n/g, '\n');
  const parts = normalized.split(/\n{2,}|\n/);
  const chunks: string[] = [];
  let current = '';
  const pushCurrent = () => {
    const c = current.trim();
    if (c) chunks.push(c);
    current = '';
  };
  const pushWithSplit = (s: string) => {
    if (s.length <= maxChunkSize) {
      if ((current + s).length > maxChunkSize && current) pushCurrent();
      current += (current ? '\n' : '') + s;
    } else {
      let i = 0;
      while (i < s.length) {
        const part = s.slice(i, i + maxChunkSize);
        if ((current + part).length > maxChunkSize && current) pushCurrent();
        current += (current ? '\n' : '') + part;
        pushCurrent();
        i += maxChunkSize;
      }
    }
  };
  for (const p of parts) {
    if (!p.trim()) continue;
    pushWithSplit(p);
  }
  if (current) pushCurrent();
  return chunks;
}
