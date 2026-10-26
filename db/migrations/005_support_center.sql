-- Centro de soporte (tipo call center): cada caso tiene número, agente asignado, prioridad,
-- tiempo de respuesta comprometido (SLA), una sala de mediación con las tres partes y un
-- acuerdo final que deben aceptar cliente y profesional.
alter table support_cases add column if not exists assigned_to uuid references users(id);
alter table support_cases add column if not exists priority text not null default 'normal';
alter table support_cases add column if not exists sla_due_at timestamptz;
alter table support_cases add column if not exists first_response_at timestamptz;
alter table support_cases add column if not exists escalated_at timestamptz;
alter table support_cases add column if not exists conversation_id uuid references conversations(id) on delete set null;
alter table support_cases add column if not exists agreement_text text;
alter table support_cases add column if not exists agreement_outcome text;
alter table support_cases add column if not exists agreement_proposed_at timestamptz;
alter table support_cases add column if not exists agreement_customer_at timestamptz;
alter table support_cases add column if not exists agreement_pro_at timestamptz;

alter table support_cases drop constraint if exists support_cases_priority_check;
alter table support_cases add constraint support_cases_priority_check check (priority in ('normal','alta','urgente'));

-- Casos ya existentes: SLA de 24 h desde su apertura.
update support_cases set sla_due_at = created_at + interval '24 hours' where sla_due_at is null;

-- Primera respuesta del equipo en consultas de soporte (para medir tiempos de atención).
alter table conversations add column if not exists first_response_at timestamptz;

create index if not exists idx_cases_assigned on support_cases(assigned_to, status);
