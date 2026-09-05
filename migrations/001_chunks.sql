CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS chunks (
  id text PRIMARY KEY,
  document text NOT NULL,
  heading text NOT NULL,
  content text NOT NULL,
  source text NOT NULL,
  tokens integer NOT NULL,
  embedding vector(384) NOT NULL,
  search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', heading || ' ' || content)) STORED
);
CREATE INDEX IF NOT EXISTS chunks_fulltext ON chunks USING gin (search_vector);
-- The corpus is deliberately small: exact cosine scan avoids approximate-index recall confounds.
