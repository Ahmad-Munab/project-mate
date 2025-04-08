-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Create a table for storing embeddings
create table if not exists ai_embeddings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) not null,
  task_id uuid references tasks(id),
  content text not null,
  embedding vector(1536),
  metadata jsonb,
  created_at timestamp with time zone default now()
);

-- Create an index for similarity search
create index on ai_embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);
