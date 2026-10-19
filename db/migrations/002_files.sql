-- Archivos subidos guardados en la base (fotos y documentos privados).
-- Permite desplegar en plataformas sin disco persistente (p. ej. Vercel).
create table if not exists files (
  id         uuid primary key default gen_random_uuid(),
  bucket     text not null check (bucket in ('public','private')),
  name       text not null unique,
  mime       text not null,
  size_bytes integer not null,
  data       bytea not null,
  created_at timestamptz not null default now()
);
