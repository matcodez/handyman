import 'server-only'
import { db, tx, type Exec } from '@/lib/db/client'
import { AppError } from '@/lib/errors'
import type { SessionUser } from '@/lib/auth/session'
import type { CaseStatus } from '@/lib/domain/states'
import { defaultPriority, PRIORITY, slaDue, type CaseKind, type CasePriority } from '@/lib/domain/sla'
import { adminIds, audit, notify } from './core'
import { postSystemMessage } from './messaging'
import { applyCaseAction, type CaseAction } from './admin'

/**
 * Centro de soporte tipo call center. Cada caso (incidencia o garantía) recibe:
 *  - un agente asignado (el de menor carga) y una prioridad con tiempo de respuesta comprometido;
 *  - una sala de mediación: conversación con cliente, profesional y agente;
 *  - un acuerdo final propuesto por el agente que deben aceptar ambas partes.
 */

export type AgreementOutcome = 'release' | 'refund' | 'approve_fix' | 'resolve'

export const OUTCOME_LABEL: Record<AgreementOutcome, string> = {
  release: 'Dar el trabajo por completado y liberar el pago',
  refund: 'Cancelar la orden y devolver el pago',
  approve_fix: 'El profesional regresa a corregir sin costo',
  resolve: 'Dar el caso por resuelto',
}

export const OUTCOMES_BY_KIND: Record<CaseKind, AgreementOutcome[]> = {
  dispute: ['release', 'refund'],
  warranty: ['approve_fix', 'resolve'],
}

/** Agente con menos casos abiertos (reparto equitativo de la carga). */
async function pickAgent(t: Exec) {
  const r = await t.q1<{ id: string }>(
    `select u.id from users u where u.role = 'admin' and u.status = 'active'
     order by (select count(*) from support_cases s where s.assigned_to = u.id and s.status in ('open','in_review')), u.created_at
     limit 1`,
  )
  return r?.id ?? null
}

/** Se llama al abrir un caso: asigna agente, fija el SLA y abre la sala de mediación. */
export async function setupCase(t: Exec, caseId: string) {
  const c = await t.q1<{ id: string; case_number: string; kind: CaseKind; reason: string; order_id: string; opened_by: string; created_at: Date }>(
    `select id, case_number, kind, reason, order_id, opened_by, created_at from support_cases where id = $1`, [caseId],
  )
  if (!c) throw new AppError('Caso no encontrado.')
  const o = (await t.q1<{ customer_id: string; professional_id: string; request_id: string }>(
    `select customer_id, professional_id, request_id from orders where id = $1`, [c.order_id],
  ))!
  const priority = defaultPriority(c.kind)
  const due = slaDue(new Date(c.created_at), priority)
  const agent = await pickAgent(t)
  const agentName = agent ? (await t.q1<{ full_name: string }>(`select full_name from users where id = $1`, [agent]))!.full_name : null

  const conv = await t.q1<{ id: string }>(
    `insert into conversations (kind, owner_id, order_id, request_id, professional_id, subject)
     values ('support',$1,$2,$3,$4,$5) returning id`,
    [o.customer_id, c.order_id, o.request_id, o.professional_id, `Caso ${c.case_number} · ${c.reason}`],
  )
  const add = (uid: string, role: string) =>
    t.q(`insert into conversation_participants (conversation_id, user_id, role) values ($1,$2,$3) on conflict do nothing`, [conv!.id, uid, role])
  await add(o.customer_id, 'customer')
  await add(o.professional_id, 'professional')
  if (agent) await add(agent, 'agent')

  await t.q(
    `update support_cases set priority = $1, sla_due_at = $2, assigned_to = $3, conversation_id = $4 where id = $5`,
    [priority, due, agent, conv!.id, c.id],
  )
  await postSystemMessage(
    t, conv!.id,
    `📋 Se abrió el caso ${c.case_number} (${c.kind === 'dispute' ? 'incidencia' : 'garantía'}): ${c.reason}.\n` +
    `${agentName ? `Agente asignado: ${agentName.split(' ')[0]} (Soporte Handyman). ` : ''}Te responderemos en menos de ${PRIORITY[priority].hours} h.\n` +
    'Esta es la sala de mediación: aquí conversan cliente, profesional y Handyman hasta llegar a un acuerdo.',
  )
  if (agent) {
    await notify(t, agent, { type: 'case.assigned', title: `Te asignaron el caso ${c.case_number}`, body: c.reason, href: `/admin/casos/${c.id}` })
  }
  return conv!.id
}

/** Primera respuesta del equipo en una conversación de soporte (y en su caso, si lo tiene). */
export async function registerAgentReply(t: Exec, conversationId: string) {
  await t.q(`update conversations set first_response_at = coalesce(first_response_at, now()) where id = $1`, [conversationId])
  const c = await t.q1<{ id: string; warranty_id: string | null; status: CaseStatus }>(
    `update support_cases set first_response_at = coalesce(first_response_at, now()),
            status = case when status = 'open' then 'in_review' else status end
     where conversation_id = $1 returning id, warranty_id, status`,
    [conversationId],
  )
  if (c?.warranty_id) await t.q(`update warranties set status = 'in_review' where id = $1 and status = 'reported'`, [c.warranty_id])
}

function assertAdmin(actor: SessionUser) {
  if (actor.role !== 'admin') throw new AppError('Acción reservada para el equipo de soporte.')
}

async function loadCase(t: Exec, caseId: string) {
  const c = await t.q1<{
    id: string; case_number: string; kind: CaseKind; status: CaseStatus; priority: CasePriority; conversation_id: string | null
    order_id: string; customer_id: string; professional_id: string; agreement_text: string | null
    agreement_customer_at: Date | null; agreement_pro_at: Date | null; agreement_outcome: AgreementOutcome | null; assigned_to: string | null
  }>(
    `select s.id, s.case_number, s.kind, s.status, s.priority, s.conversation_id, s.order_id, o.customer_id, o.professional_id,
            s.agreement_text, s.agreement_customer_at, s.agreement_pro_at, s.agreement_outcome, s.assigned_to
     from support_cases s join orders o on o.id = s.order_id where s.id = $1`,
    [caseId],
  )
  if (!c) throw new AppError('Caso no encontrado.')
  return c
}

const isClosed = (s: CaseStatus) => s === 'resolved' || s === 'rejected'

export async function assignCase(actor: SessionUser, caseId: string, agentId: string) {
  assertAdmin(actor)
  await tx(async (t) => {
    const c = await loadCase(t, caseId)
    if (isClosed(c.status)) throw new AppError('Este caso ya está cerrado.')
    const agent = await t.q1<{ full_name: string }>(`select full_name from users where id = $1 and role = 'admin' and status = 'active'`, [agentId])
    if (!agent) throw new AppError('Agente no válido.')
    await t.q(`update support_cases set assigned_to = $1 where id = $2`, [agentId, c.id])
    if (c.conversation_id) {
      await t.q(`insert into conversation_participants (conversation_id, user_id, role) values ($1,$2,'agent') on conflict do nothing`, [c.conversation_id, agentId])
      await postSystemMessage(t, c.conversation_id, `👤 ${agent.full_name.split(' ')[0]} (Soporte Handyman) atiende ahora este caso.`)
    }
    if (agentId !== actor.id) await notify(t, agentId, { type: 'case.assigned', title: `Te asignaron el caso ${c.case_number}`, href: `/admin/casos/${c.id}` })
    await audit(t, actor.id, 'case.assigned', 'support_case', c.id, { case: c.case_number, agent: agent.full_name })
  })
}

/** Escalar: sube a prioridad urgente, recalcula el plazo y avisa a todo el equipo. */
export async function escalateCase(actor: SessionUser, caseId: string, reason: string) {
  assertAdmin(actor)
  if (reason.trim().length < 5) throw new AppError('Indica por qué se escala el caso.')
  await tx(async (t) => {
    const c = await loadCase(t, caseId)
    if (isClosed(c.status)) throw new AppError('Este caso ya está cerrado.')
    if (c.priority === 'urgente') throw new AppError('El caso ya está escalado como urgente.')
    await t.q(
      `update support_cases set priority = 'urgente', escalated_at = now(),
              sla_due_at = case when first_response_at is null then now() + interval '1 hour' else sla_due_at end
       where id = $1`,
      [c.id],
    )
    for (const a of await adminIds(t)) {
      if (a !== actor.id) await notify(t, a, { type: 'case.escalated', title: `Caso ${c.case_number} escalado a urgente`, body: reason.trim(), href: `/admin/casos/${c.id}` })
    }
    if (c.conversation_id) await postSystemMessage(t, c.conversation_id, '⏫ El caso fue escalado a prioridad urgente. Un supervisor de Handyman le da seguimiento.')
    await audit(t, actor.id, 'case.escalated', 'support_case', c.id, { case: c.case_number, reason: reason.trim() })
  })
}

/** El agente propone un acuerdo; queda pendiente hasta que cliente y profesional lo acepten. */
export async function proposeAgreement(actor: SessionUser, caseId: string, text: string, outcome: AgreementOutcome) {
  assertAdmin(actor)
  const body = text.trim()
  if (body.length < 15) throw new AppError('Describe el acuerdo con claridad (mínimo 15 caracteres).')
  await tx(async (t) => {
    const c = await loadCase(t, caseId)
    if (isClosed(c.status)) throw new AppError('Este caso ya está cerrado.')
    if (!OUTCOMES_BY_KIND[c.kind].includes(outcome)) throw new AppError('Ese resultado no aplica para este tipo de caso.')
    await t.q(
      `update support_cases set agreement_text = $1, agreement_outcome = $2, agreement_proposed_at = now(),
              agreement_customer_at = null, agreement_pro_at = null, status = 'in_review',
              assigned_to = coalesce(assigned_to, $3), first_response_at = coalesce(first_response_at, now())
       where id = $4`,
      [body, outcome, actor.id, c.id],
    )
    if (c.conversation_id) {
      await postSystemMessage(t, c.conversation_id, `📄 Propuesta de acuerdo de Handyman:\n${body}\nResultado: ${OUTCOME_LABEL[outcome]}.\nCliente y profesional deben aceptarla para cerrar el caso.`)
    }
    const href = c.conversation_id ? `/mensajes/${c.conversation_id}` : undefined
    for (const uid of [c.customer_id, c.professional_id]) {
      await notify(t, uid, { type: 'case.agreement', title: `Propuesta de acuerdo · caso ${c.case_number}`, body: body.slice(0, 120), href })
    }
    await audit(t, actor.id, 'case.agreement_proposed', 'support_case', c.id, { case: c.case_number, outcome })
  })
}

/** Cliente o profesional aceptan el acuerdo. Cuando ambos aceptan, el caso se cierra con ese acuerdo. */
export async function acceptAgreement(actor: SessionUser, caseId: string) {
  return tx(async (t) => {
    const c = await loadCase(t, caseId)
    if (isClosed(c.status)) throw new AppError('Este caso ya está cerrado.')
    if (!c.agreement_text || !c.agreement_outcome) throw new AppError('Aún no hay una propuesta de acuerdo.')
    const side = actor.id === c.customer_id ? 'customer' : actor.id === c.professional_id ? 'pro' : null
    if (!side) throw new AppError('Caso no encontrado.')
    if ((side === 'customer' ? c.agreement_customer_at : c.agreement_pro_at)) throw new AppError('Ya aceptaste este acuerdo.')
    await t.q(`update support_cases set ${side === 'customer' ? 'agreement_customer_at' : 'agreement_pro_at'} = now() where id = $1`, [c.id])
    const who = side === 'customer' ? 'El cliente' : 'El profesional'
    if (c.conversation_id) await postSystemMessage(t, c.conversation_id, `✅ ${who} aceptó el acuerdo.`)
    const both = side === 'customer' ? !!c.agreement_pro_at : !!c.agreement_customer_at
    if (both) {
      const agentId = c.assigned_to ?? actor.id
      await applyCaseAction(t, agentId, c.id, c.agreement_outcome as CaseAction, `Acuerdo aceptado por ambas partes: ${c.agreement_text}`)
    } else if (c.assigned_to) {
      await notify(t, c.assigned_to, { type: 'case.agreement', title: `${who} aceptó el acuerdo del caso ${c.case_number}`, href: `/admin/casos/${c.id}` })
    }
    await audit(t, actor.id, 'case.agreement_accepted', 'support_case', c.id, { case: c.case_number, side, closed: both })
    return both
  })
}

// ── Consultas ───────────────────────────────────────────────────────────────

export interface QueueCase {
  id: string; case_number: string; kind: CaseKind; reason: string; status: CaseStatus; priority: CasePriority
  sla_due_at: Date | null; first_response_at: Date | null; escalated_at: Date | null; created_at: Date
  agent_id: string | null; agent_name: string | null; title: string; customer_name: string; pro_name: string
  agreement_text: string | null; agreement_customer_at: Date | null; agreement_pro_at: Date | null
}

export interface PendingChat {
  id: string; subject: string; owner_name: string; owner_role: string; last_message_at: Date; created_at: Date; last_body: string | null
}

export async function getSupportQueue() {
  const [cases, chats, kpi, agents] = await Promise.all([
    db.q<QueueCase>(
      `select s.id, s.case_number, s.kind, s.reason, s.status, s.priority, s.sla_due_at, s.first_response_at, s.escalated_at, s.created_at,
              s.assigned_to as agent_id, a.full_name as agent_name, r.title, cu.full_name as customer_name, p.public_name as pro_name,
              s.agreement_text, s.agreement_customer_at, s.agreement_pro_at
       from support_cases s join orders o on o.id = s.order_id join service_requests r on r.id = o.request_id
       join users cu on cu.id = o.customer_id join professional_profiles p on p.user_id = o.professional_id
       left join users a on a.id = s.assigned_to
       order by case when s.status in ('open','in_review') then 0 else 1 end,
                case s.priority when 'urgente' then 0 when 'alta' then 1 else 2 end, s.sla_due_at nulls last, s.created_at desc`,
    ),
    // Consultas generales ("Pregúntale a Handyman") cuyo último mensaje es del usuario: esperan respuesta.
    db.q<PendingChat>(
      `select c.id, c.subject, u.full_name as owner_name, u.role as owner_role, c.last_message_at, c.created_at, lm.body as last_body
       from conversations c join users u on u.id = c.owner_id
       join lateral (select m.body, m.sender_id from messages m where m.conversation_id = c.id order by m.created_at desc limit 1) lm on true
       where c.kind = 'support' and c.status = 'open' and lm.sender_id = c.owner_id
         and not exists (select 1 from support_cases s where s.conversation_id = c.id)
       order by c.last_message_at asc`,
    ),
    db.q1<{ avg_first_hours: string | null; resolved_7d: number; met_pct: number | null }>(
      `select round((avg(extract(epoch from (first_response_at - created_at))) / 3600)::numeric, 1)::text as avg_first_hours,
              (select count(*)::int from support_cases where resolved_at > now() - interval '7 days') as resolved_7d,
              round(100.0 * count(*) filter (where first_response_at <= sla_due_at) / nullif(count(*), 0))::int as met_pct
       from support_cases where first_response_at is not null`,
    ),
    db.q<{ id: string; full_name: string; open_cases: number }>(
      `select u.id, u.full_name, (select count(*)::int from support_cases s where s.assigned_to = u.id and s.status in ('open','in_review')) as open_cases
       from users u where u.role = 'admin' and u.status = 'active' order by u.created_at`,
    ),
  ])
  return { cases, chats, kpi: kpi!, agents }
}

export function listAgents() {
  return db.q<{ id: string; full_name: string }>(`select id, full_name from users where role = 'admin' and status = 'active' order by created_at`)
}

/** Caso ligado a una conversación (para mostrar estado, agente y acuerdo en la sala de mediación). */
export function getCaseByConversation(conversationId: string) {
  return db.q1<{
    id: string; case_number: string; kind: CaseKind; status: CaseStatus; priority: CasePriority; sla_due_at: Date | null
    first_response_at: Date | null; agent_name: string | null; agreement_text: string | null; agreement_outcome: AgreementOutcome | null
    agreement_customer_at: Date | null; agreement_pro_at: Date | null; customer_id: string; professional_id: string; resolution: string | null
  }>(
    `select s.id, s.case_number, s.kind, s.status, s.priority, s.sla_due_at, s.first_response_at, a.full_name as agent_name,
            s.agreement_text, s.agreement_outcome, s.agreement_customer_at, s.agreement_pro_at, o.customer_id, o.professional_id, s.resolution
     from support_cases s join orders o on o.id = s.order_id left join users a on a.id = s.assigned_to
     where s.conversation_id = $1`,
    [conversationId],
  )
}
