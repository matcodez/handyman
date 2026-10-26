-- Carril de urgencias: emergencias con visita de diagnóstico a precio fijo, profesionales
-- "disponibles ahora" y asignación al primero que acepta, con tiempo estimado de llegada.
alter table service_requests add column if not exists is_urgent boolean not null default false;
alter table service_requests add column if not exists urgent_kind text;
alter table service_requests add column if not exists visit_fee numeric(12,2);

alter table professional_profiles add column if not exists available_now boolean not null default false;
alter table professional_profiles add column if not exists available_until timestamptz;

alter table orders add column if not exists is_urgent boolean not null default false;
alter table orders add column if not exists eta_minutes integer;
alter table orders add column if not exists eta_at timestamptz;

create index if not exists idx_requests_urgent on service_requests(is_urgent, status) where is_urgent;
