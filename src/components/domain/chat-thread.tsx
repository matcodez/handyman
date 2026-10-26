'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ImagePlus, LoaderCircle, Lock, Send, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { compress } from './photo-input'

export interface ChatMessage {
  id: string
  sender_id: string | null
  sender_name: string | null
  kind: 'text' | 'system'
  body: string
  attachment_url: string | null
  created_at: string
}

const TZ = 'America/Guatemala'
const time = (d: string) => new Intl.DateTimeFormat('es-GT', { hour: 'numeric', minute: '2-digit', timeZone: TZ }).format(new Date(d))
const day = (d: string) => new Intl.DateTimeFormat('es-GT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ }).format(new Date(d))

/**
 * Hilo de chat con actualización en vivo (consulta cada 2.5 s, se pausa si la pestaña no está visible).
 */
export function ChatThread({ conversationId, viewerId, initial, canSend, masked }: {
  conversationId: string
  viewerId: string
  initial: ChatMessage[]
  canSend: boolean
  masked: boolean
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initial)
  const [text, setText] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottom = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const last = useRef<string | null>(initial.at(-1)?.created_at ?? null)

  const poll = useCallback(async () => {
    if (document.visibilityState !== 'visible') return
    const q = last.current ? `?after=${encodeURIComponent(last.current)}` : ''
    const r = await fetch(`/api/conversations/${conversationId}/messages${q}`, { cache: 'no-store' })
    if (!r.ok) return
    const { messages: fresh } = (await r.json()) as { messages: ChatMessage[] }
    if (fresh.length) {
      last.current = fresh.at(-1)!.created_at
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id))
        return [...prev.filter((m) => !m.id.startsWith('tmp-')), ...fresh.filter((m) => !seen.has(m.id))]
      })
    }
  }, [conversationId])

  useEffect(() => {
    const t = setInterval(() => void poll().catch(() => {}), 2500)
    return () => clearInterval(t)
  }, [poll])

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (sending || (!text.trim() && !photo)) return
    setSending(true)
    setError('')
    const fd = new FormData()
    fd.set('body', text)
    if (photo) fd.set('photo', photo)
    const optimistic: ChatMessage = {
      id: `tmp-${Date.now()}`, sender_id: viewerId, sender_name: null, kind: 'text', body: text, attachment_url: preview, created_at: new Date().toISOString(),
    }
    setMessages((m) => [...m, optimistic])
    setText('')
    clearPhoto()
    try {
      const r = await fetch(`/api/conversations/${conversationId}/messages`, { method: 'POST', body: fd })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error ?? 'No se pudo enviar.')
      await poll()
    } catch (err) {
      setMessages((m) => m.filter((x) => x.id !== optimistic.id))
      setText(optimistic.body)
      setError(err instanceof Error ? err.message : 'No se pudo enviar.')
    } finally {
      setSending(false)
    }
  }

  function clearPhoto() {
    setPhoto(null)
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  let lastDay = ''
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-4 sm:px-5" aria-live="polite">
        {messages.map((m) => {
          const d = day(m.created_at)
          const showDay = d !== lastDay
          lastDay = d
          const mine = m.sender_id === viewerId
          return (
            <div key={m.id}>
              {showDay && <p className="my-3 text-center font-display text-[11px] font-medium uppercase tracking-wide text-ink3">{d}</p>}
              {m.kind === 'system' ? (
                <p className="mx-auto max-w-md rounded-xl bg-paper2 px-3.5 py-2 text-center text-[13px] leading-relaxed text-ink2">{m.body}</p>
              ) : (
                <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                  <div className={cn('max-w-[82%] rounded-2xl px-3.5 py-2 shadow-sm sm:max-w-[70%]', mine ? 'rounded-br-md bg-brand text-white' : 'rounded-bl-md bg-white text-ink')}>
                    {!mine && m.sender_name && <p className="mb-0.5 font-display text-xs font-semibold text-brand">{m.sender_name}</p>}
                    {m.attachment_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <a href={m.attachment_url} target="_blank" rel="noreferrer"><img src={m.attachment_url} alt="Foto enviada" className="mb-1.5 max-h-64 rounded-xl object-cover" /></a>
                    )}
                    {m.body && <p className="whitespace-pre-wrap break-words text-[15px] leading-snug">{m.body}</p>}
                    <p className={cn('mt-0.5 text-right text-[11px]', mine ? 'text-white/70' : 'text-ink3')}>{m.id.startsWith('tmp-') ? 'Enviando…' : time(m.created_at)}</p>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        <div ref={bottom} />
      </div>

      {canSend ? (
        <form onSubmit={send} className="pb-safe border-t border-line bg-white px-3 py-2.5 sm:px-4">
          {masked && (
            <p className="mb-2 flex items-center gap-1.5 text-xs text-ink3"><Lock className="h-3.5 w-3.5" aria-hidden />Los teléfonos y correos se ocultan hasta que contrates.</p>
          )}
          {preview && (
            <div className="relative mb-2 inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Foto por enviar" className="h-20 rounded-xl object-cover" />
              <button type="button" onClick={clearPhoto} aria-label="Quitar foto" className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-navy text-white"><X className="h-3.5 w-3.5" aria-hidden /></button>
            </div>
          )}
          {error && <p role="alert" className="mb-2 text-sm text-bad">{error}</p>}
          <div className="flex items-end gap-2">
            <label className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-ink2 hover:bg-paper" title="Adjuntar foto">
              <ImagePlus className="h-5 w-5" aria-hidden /><span className="sr-only">Adjuntar foto</span>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={async (e) => {
                const f = e.target.files?.[0]
                if (!f) return
                const c = await compress(f)
                setPhoto(c)
                setPreview(URL.createObjectURL(c))
              }} />
            </label>
            <label htmlFor="chat-input" className="sr-only">Escribe un mensaje</label>
            <textarea
              id="chat-input" value={text} onChange={(e) => setText(e.target.value)} rows={1} maxLength={2000} placeholder="Escribe un mensaje…"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(e as unknown as React.FormEvent) } }}
              className="input !min-h-[44px] max-h-32 flex-1 resize-none py-2.5"
            />
            <button type="submit" disabled={sending || (!text.trim() && !photo)} className="btn-primary h-11 w-11 shrink-0 px-0" aria-label="Enviar">
              {sending ? <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden /> : <Send className="h-5 w-5" aria-hidden />}
            </button>
          </div>
        </form>
      ) : (
        <p className="border-t border-line bg-paper px-4 py-3 text-center text-sm text-ink3">Esta conversación está cerrada.</p>
      )}
    </div>
  )
}
