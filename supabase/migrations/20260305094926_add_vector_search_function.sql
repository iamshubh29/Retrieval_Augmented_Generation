/*
  # Add Vector Search Function

  1. Functions
    - `match_document_chunks` - Finds similar document chunks using vector similarity
      - Takes query embedding, match threshold, and count
      - Returns chunks with similarity scores
      - Only returns chunks from user's own documents
*/

-- Function to search for similar document chunks
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  user_id_param uuid
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity
  FROM document_chunks dc
  INNER JOIN documents d ON dc.document_id = d.id
  WHERE d.user_id = user_id_param
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;
