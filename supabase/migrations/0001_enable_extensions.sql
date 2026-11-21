-- Enable pgvector: chunk embeddings are stored as vectors and searched by cosine distance.
-- Forward only: change extensions in a new migration, never by editing this file.
create extension if not exists vector;
