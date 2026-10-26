-- Mensajería dentro de la plataforma (tipo WhatsApp).
--   quote   → cliente y profesional conversan sobre una solicitud antes de contratar (teléfonos ocultos)
--   order   → conversación de una orden activa; incluye mensajes automáticos del sistema
--   support → "Pregúntale a Handyman": el usuario conversa con el equipo de soporte
create table if not exists conversations (
  id              uuid primary key default gen_random_uuid(),
  kind            text not null check (kind in ('quote','order','support')),
  request_id      uuid references service_requests(id) on delete cascade,
  order_id        uuid references orders(id) on delete cascade,
  professional_id uuid references users(id) on delete cascade,
  owner_id        uuid references users(id) on delete cascade,  -- quien abre la conversación de soporte
  subject         text not null default '',
  status          text not null default 'open' check (status in ('open','closed')),
  created_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create unique index if not exists uq_conv_quote on conversations(request_id, professional_id) where kind = 'quote';
create unique index if not exists uq_conv_order on conversations(order_id) where kind = 'order';

create table if not exists conversation_participants (
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id         uuid not null references users(id) on delete cascade,
  role            text not null check (role in ('customer','professional','agent')),
  last_read_at    timestamptz not null default '1970-01-01',
  primary key (conversation_id, user_id)
);

create table if not exists messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id       uuid references users(id) on delete set null,   -- null = mensaje del sistema
  kind            text not null default 'text' check (kind in ('text','system')),
  body            text not null default '',
  attachment_url  text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_messages_conv on messages(conversation_id, created_at);
create index if not exists idx_participants_user on conversation_participants(user_id);
