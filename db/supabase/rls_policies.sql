-- Handyman — políticas RLS de referencia para producción en Supabase.
-- NO se ejecutan en el modo demo local: allí la autorización equivalente vive en
-- src/lib/services/* (cada función verifica rol y propiedad del recurso en el servidor).
-- Aplicar después de 001_schema.sql, cuando users.auth_id esté enlazado a auth.uid().

create or replace function app_user_id() returns uuid language sql stable as $$
  select id from users where auth_id = auth.uid()::text
$$;
create or replace function app_role() returns text language sql stable as $$
  select role from users where auth_id = auth.uid()::text
$$;

alter table users                  enable row level security;
alter table customer_addresses     enable row level security;
alter table professional_profiles  enable row level security;
alter table professional_documents enable row level security;
alter table service_requests       enable row level security;
alter table quotes                 enable row level security;
alter table orders                 enable row level security;
alter table order_evidence         enable row level security;
alter table payments               enable row level security;
alter table warranties             enable row level security;
alter table support_cases          enable row level security;
alter table notifications          enable row level security;
alter table audit_logs             enable row level security;

-- Cada usuario ve su propia fila; administración ve todas. Nadie cambia su propio rol.
create policy users_self on users for select using (id = app_user_id() or app_role() = 'admin');

-- Direcciones: solo el dueño.
create policy addresses_owner on customer_addresses for all using (user_id = app_user_id());

-- Perfil profesional: lectura pública solo de aprobados; el estado de verificación solo lo cambia admin
-- (hacerlo con una función security definer, no con update directo).
create policy pro_public_read on professional_profiles for select
  using (verification_status = 'approved' or user_id = app_user_id() or app_role() = 'admin');

-- Documentos de verificación: el profesional dueño y administración. Nunca públicos.
create policy docs_owner_admin on professional_documents for select
  using (professional_id = app_user_id() or app_role() = 'admin');

-- Solicitudes: el cliente dueño, administración y profesionales aprobados de la categoría.
-- address_private debe exponerse mediante una vista que la oculte a quien no tenga orden aceptada.
create policy requests_read on service_requests for select using (
  customer_id = app_user_id() or app_role() = 'admin' or (
    status in ('open','quoting') and exists (
      select 1 from professional_profiles p
      join professional_categories pc on pc.professional_id = p.user_id
      where p.user_id = app_user_id() and p.verification_status = 'approved'
        and pc.category_id = service_requests.category_id and pc.active
    )
  )
);

-- Cotizaciones: su autor, el cliente dueño de la solicitud y administración.
create policy quotes_read on quotes for select using (
  professional_id = app_user_id() or app_role() = 'admin'
  or exists (select 1 from service_requests r where r.id = quotes.request_id and r.customer_id = app_user_id())
);
create policy quotes_insert on quotes for insert with check (
  professional_id = app_user_id() and exists (
    select 1 from professional_profiles p where p.user_id = app_user_id() and p.verification_status = 'approved'
  )
);

-- Órdenes y derivados: solo participantes y administración.
create policy orders_participants on orders for select
  using (customer_id = app_user_id() or professional_id = app_user_id() or app_role() = 'admin');
create policy evidence_participants on order_evidence for select using (
  exists (select 1 from orders o where o.id = order_evidence.order_id
          and (o.customer_id = app_user_id() or o.professional_id = app_user_id() or app_role() = 'admin'))
);
create policy payments_participants on payments for select using (
  exists (select 1 from orders o where o.id = payments.order_id
          and (o.customer_id = app_user_id() or o.professional_id = app_user_id() or app_role() = 'admin'))
);
create policy warranties_participants on warranties for select using (
  exists (select 1 from orders o where o.id = warranties.order_id
          and (o.customer_id = app_user_id() or o.professional_id = app_user_id() or app_role() = 'admin'))
);
create policy cases_participants on support_cases for select using (
  opened_by = app_user_id() or app_role() = 'admin'
  or exists (select 1 from orders o where o.id = support_cases.order_id and o.professional_id = app_user_id())
);

create policy notifications_owner on notifications for all using (user_id = app_user_id());

-- Auditoría: solo lectura para administración; sin update/delete para nadie.
create policy audit_admin_read on audit_logs for select using (app_role() = 'admin');
