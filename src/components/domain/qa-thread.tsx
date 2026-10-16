import { MessagesSquare, Send } from 'lucide-react'
import { timeAgo } from '@/lib/format'
import type { MessageRow } from '@/lib/services/requests'
import { messageAction } from '@/app/actions/customer'
import { ActionForm, SubmitButton } from '@/components/ui/action-form'
import { cn } from '@/lib/cn'

export function QaThread({ requestId, messages, viewerId, canPost }: { requestId: string; messages: MessageRow[]; viewerId: string; canPost: boolean }) {
  return (
    <section className="card card-pad" aria-labelledby="qa">
      <h2 id="qa" className="flex items-center gap-2 text-lg font-semibold"><MessagesSquare className="h-5 w-5 text-brand" aria-hidden />Preguntas y respuestas</h2>
      {messages.length === 0 ? (
        <p className="mt-2 text-sm text-ink2">Aún no hay preguntas. Los profesionales pueden pedir detalles antes de cotizar.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {messages.map((m) => {
            const mine = m.author_id === viewerId
            return (
              <li key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[85%] rounded-2xl px-4 py-2.5', mine ? 'rounded-br-md bg-brand text-white' : 'rounded-bl-md bg-paper text-ink')}>
                  <p className={cn('font-display text-xs font-medium', mine ? 'text-white/75' : 'text-ink3')}>{mine ? 'Tú' : m.author_name} · {timeAgo(m.created_at)}</p>
                  <p className="mt-0.5 text-[15px] leading-relaxed">{m.body}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {canPost && (
        <ActionForm action={messageAction} className="mt-4">
          <input type="hidden" name="request_id" value={requestId} />
          <label htmlFor="qa-body" className="sr-only">Escribe un mensaje</label>
          <div className="flex gap-2">
            <input id="qa-body" name="body" required minLength={2} maxLength={600} className="input" placeholder="Escribe una pregunta o respuesta…" />
            <SubmitButton className="btn-primary shrink-0 px-4" pendingText="…"><Send className="h-4 w-4" aria-hidden /><span className="sr-only">Enviar</span></SubmitButton>
          </div>
          <p className="hint">No compartas teléfonos ni direcciones aquí: la dirección se comparte automáticamente al contratar.</p>
        </ActionForm>
      )}
    </section>
  )
}
