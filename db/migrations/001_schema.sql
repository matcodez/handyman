-- Handyman — esquema inicial (PostgreSQL).
-- Se ejecuta tal cual en PGlite (demo local) y en Supabase/PostgreSQL administrado.
-- Convenciones: UUID no predecibles, timestamps en UTC (timestamptz), montos en numeric(12,2) GTQ.

create table users (
  id            uuid primary key default gen_random_uuid(),
  auth_id       text,                       -- reservado para Supabase Auth
  role          text not null check (role in ('customer','professional','admin')),
  full_name     text not null,
  email         text not null unique,
  phone         text,
  avatar_url    text,
  password_hash text not null,              -- solo auth demo; en producción lo gestiona el proveedor
  status        text not null default 'active' check (status in ('active','suspended')),
  is_demo       boolean not null default false,
  created_at    timestamptz not null default now()
);

create table customer_profiles (
  user_id           uuid primary key references users(id) on delete cascade,
  preferred_contact text not null default 'app',
  preferences       jsonb not null default '{}'
);

create table customer_addresses (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  label           text not null,
  zone            text not null,            -- zona aproximada (pública para profesionales)
  address_private text not null,            -- dirección exacta (solo participantes de una orden)
  created_at      timestamptz not null default now()
);

create table categories (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  slug           text not null unique,
  description    text not null default '',
  icon_key       text not null default 'wrench',
  active         boolean not null default true,
  warranty_days  integer not null default 30 check (warranty_days between 30 and 90),
  warranty_terms text not null default '',
  sort_order     integer not null default 0
);

create table professional_profiles (
  user_id              uuid primary key references users(id) on delete cascade,
  public_name          text not null,
  bio                  text not null default '',
  years_experience     integer not null default 0,
  service_area         jsonb not null default '[]',   -- lista de zonas
  availability         text not null default '',
  verification_status  text not null default 'draft'
    check (verification_status in ('draft','pending','in_review','approved','rejected','suspended')),
  verification_note    text,
  verified_by          uuid references users(id),
  verified_at          timestamptz,
  qr_token             text not null unique,
  rating_average       numeric(3,2) not null default 0,
  reviews_count        integer not null default 0,
  completed_jobs_count integer not null default 0
);

create table professional_documents (
  id                   uuid primary key default gen_random_uuid(),
  professional_id      uuid not null references users(id) on delete cascade,
  document_type        text not null,
  private_storage_path text not null,
  original_name        text not null default '',
  review_status        text not null default 'pending' check (review_status in ('pending','approved','rejected')),
  reviewer_id          uuid references users(id),
  reviewed_at          timestamptz,
  rejection_reason     text,
  created_at           timestamptz not null default now()
);

create table professional_categories (
  professional_id        uuid not null references users(id) on delete cascade,
  category_id            uuid not null references categories(id) on delete cascade,
  experience_description text not null default '',
  active                 boolean not null default true,
  primary key (professional_id, category_id)
);

create table portfolio_items (
  id                uuid primary key default gen_random_uuid(),
  professional_id   uuid not null references users(id) on delete cascade,
  title             text not null,
  description       text not null default '',
  photo_urls        jsonb not null default '[]',
  category_id       uuid references categories(id),
  visibility_status text not null default 'visible' check (visibility_status in ('visible','hidden')),
  created_at        timestamptz not null default now()
);

create table service_requests (
  id                    uuid primary key default gen_random_uuid(),
  customer_id           uuid not null references users(id),
  category_id           uuid not null references categories(id),
  title                 text not null,
  description           text not null,
  photo_urls            jsonb not null default '[]',
  place_type            text not null default 'casa' check (place_type in ('casa','oficina','otro')),
  location_label        text not null,      -- zona aproximada
  address_private       text not null,      -- nunca se muestra antes de una orden aceptada
  preferred_date        date not null,
  preferred_time_window text not null,
  status                text not null default 'open'
    check (status in ('draft','open','quoting','hired','cancelled','expired')),
  created_at            timestamptz not null default now()
);

create table request_messages (
  id         uuid primary key default gen_random_uuid(),
  request_id uuid not null references service_requests(id) on delete cascade,
  author_id  uuid not null references users(id),
  body       text not null,
  created_at timestamptz not null default now()
);

create table quotes (
  id                 uuid primary key default gen_random_uuid(),
  request_id         uuid not null references service_requests(id) on delete cascade,
  professional_id    uuid not null references users(id),
  price_amount       numeric(12,2) not null check (price_amount > 0),
  scope_description  text not null,
  materials_included boolean not null default false,
  materials_notes    text not null default '',
  estimated_duration text not null,
  proposed_date      date not null,
  notes              text not null default '',
  status             text not null default 'sent'
    check (status in ('draft','sent','accepted','rejected','withdrawn','expired')),
  created_at         timestamptz not null default now(),
  expires_at         timestamptz not null default (now() + interval '7 days'),
  unique (request_id, professional_id)
);

create table orders (
  id                   uuid primary key default gen_random_uuid(),
  order_number         text not null unique,
  request_id           uuid not null unique references service_requests(id),  -- una sola cotización aceptada por solicitud
  accepted_quote_id    uuid not null references quotes(id),
  customer_id          uuid not null references users(id),
  professional_id      uuid not null references users(id),
  agreed_price         numeric(12,2) not null,
  agreed_scope_snapshot jsonb not null,     -- copia congelada del alcance aceptado
  scheduled_at         date not null,
  status               text not null default 'scheduled'
    check (status in ('scheduled','en_route','arrived','in_progress','pending_approval','completed','disputed','cancelled')),
  en_route_at          timestamptz,
  arrival_marked_at    timestamptz,         -- el profesional indica que llegó
  arrival_confirmed_at timestamptz,         -- el cliente confirma identidad con QR
  started_at           timestamptz,
  completed_at         timestamptz,         -- el profesional entrega el trabajo
  approved_at          timestamptz,         -- el cliente aprueba
  created_at           timestamptz not null default now()
);

create table order_changes (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references orders(id) on delete cascade,
  requested_by uuid not null references users(id),
  description  text not null,
  new_price    numeric(12,2) not null check (new_price > 0),
  status       text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);

create table order_evidence (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  uploader_id uuid not null references users(id),
  stage       text not null check (stage in ('before','final','claim')),
  photo_url   text not null,
  caption     text not null default '',
  created_at  timestamptz not null default now()
);

create table payments (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null unique references orders(id) on delete cascade,
  amount             numeric(12,2) not null,
  currency           text not null default 'GTQ',
  status             text not null default 'not_started'
    check (status in ('not_started','pending','held_demo','released_demo','refund_review','cancelled')),
  provider           text not null default 'demo',
  provider_reference text,
  is_demo            boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table warranties (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null unique references orders(id) on delete cascade,
  policy_version text not null,
  terms_text     text not null,
  duration_days  integer not null,
  starts_at      timestamptz not null,
  expires_at     timestamptz not null,
  status         text not null default 'active'
    check (status in ('active','reported','in_review','approved_fix','rejected','resolved','expired'))
);

create table reviews (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid not null unique references orders(id) on delete cascade,
  reviewer_id         uuid not null references users(id),
  reviewee_id         uuid not null references users(id),
  punctuality_score   integer not null check (punctuality_score between 1 and 5),
  communication_score integer not null check (communication_score between 1 and 5),
  cleanliness_score   integer not null check (cleanliness_score between 1 and 5),
  comment             text not null default '',
  moderation_status   text not null default 'published' check (moderation_status in ('published','hidden')),
  created_at          timestamptz not null default now()
);

create table support_cases (
  id            uuid primary key default gen_random_uuid(),
  case_number   text not null unique,
  order_id      uuid not null references orders(id) on delete cascade,
  warranty_id   uuid references warranties(id),
  opened_by     uuid not null references users(id),
  kind          text not null check (kind in ('dispute','warranty')),
  reason        text not null,
  description   text not null,
  evidence_urls jsonb not null default '[]',
  status        text not null default 'open' check (status in ('open','in_review','resolved','rejected')),
  resolution    text,
  resolved_by   uuid references users(id),
  resolved_at   timestamptz,
  created_at    timestamptz not null default now()
);

create table notifications (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references users(id) on delete cascade,
  type                text not null,
  title               text not null,
  body                text not null default '',
  related_entity_type text,
  related_entity_id   uuid,
  href                text,
  read_at             timestamptz,
  created_at          timestamptz not null default now()
);

create table audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references users(id),
  action      text not null,
  entity_type text not null,
  entity_id   uuid,
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create index idx_requests_customer on service_requests(customer_id);
create index idx_requests_status on service_requests(status, category_id);
create index idx_quotes_request on quotes(request_id);
create index idx_quotes_pro on quotes(professional_id);
create index idx_orders_customer on orders(customer_id);
create index idx_orders_pro on orders(professional_id);
create index idx_notifications_user on notifications(user_id, read_at);
create index idx_audit_created on audit_logs(created_at desc);
