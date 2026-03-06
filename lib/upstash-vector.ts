import { Index } from '@upstash/vector';
import { EMBEDDING_DIMENSION } from './embeddings';

/** Must extend Record<string, unknown> to satisfy Upstash Index<Dict>. */
export interface ChunkMetadata extends Record<string, unknown> {
  documentId: string;
  userId: string;
  content: string;
  chunkIndex: number;
  title: string;
  fileName: string;
}

let index: Index<ChunkMetadata> | null = null;

export function getVectorIndex(): Index<ChunkMetadata> {
  if (index) return index;
  const url = process.env.UPSTASH_VECTOR_REST_URL;
  const token = process.env.UPSTASH_VECTOR_REST_TOKEN;
  if (!url || !token) throw new Error('UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN must be set');
  index = new Index<ChunkMetadata>({
    url,
    token,
  });
  return index;
}

/** Upsert a single chunk. Your Upstash index must be created with dimension 1536. */
export async function upsertChunk(
  id: string,
  vector: number[],
  metadata: ChunkMetadata
): Promise<void> {
  const idx = getVectorIndex();
  if (vector.length !== EMBEDDING_DIMENSION) {
    throw new Error(`Vector must be ${EMBEDDING_DIMENSION} dimensions, got ${vector.length}`);
  }
  await idx.upsert({
    id,
    vector,
    metadata: {
      documentId: metadata.documentId,
      userId: metadata.userId,
      content: metadata.content,
      chunkIndex: metadata.chunkIndex,
      title: metadata.title,
      fileName: metadata.fileName,
    },
  });
}

/** Query similar chunks by vector and optional userId filter. */
export async function queryChunks(
  vector: number[],
  options: { topK?: number; userId?: string; documentId?: string } = {}
): Promise<Array<{ id: string; score: number; metadata: ChunkMetadata }>> {
  const idx = getVectorIndex();
  const topK = options.topK ?? 5;
  const filters: string[] = [];
  if (options.userId) filters.push(`userId = '${options.userId}'`);
  if (options.documentId) filters.push(`documentId = '${options.documentId}'`);
  const filter = filters.length ? filters.join(' AND ') : undefined;
  const result = await idx.query({
    vector: vector.length === EMBEDDING_DIMENSION ? vector : vector.slice(0, EMBEDDING_DIMENSION),
    topK,
    includeMetadata: true,
    ...(filter && { filter }),
  });
  return (result ?? []).map((r) => ({
    id: String(r.id ?? ''),
    score: r.score ?? 0,
    metadata: (r.metadata ?? {}) as ChunkMetadata,
  }));
}

/** Delete all chunks for a document (by id prefix). */
export async function deleteChunksByDocumentId(documentId: string): Promise<void> {
  const idx = getVectorIndex();
  await idx.delete({ prefix: `${documentId}_` });
}
