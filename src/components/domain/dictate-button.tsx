'use client'

import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff } from 'lucide-react'
import { cn } from '@/lib/cn'

interface Recognition {
  lang: string; interimResults: boolean; continuous: boolean
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onend: (() => void) | null; onerror: (() => void) | null
  start(): void; stop(): void
}

/** Dictado por voz (Web Speech API, español de Guatemala) para quien prefiere hablar a escribir. */
export function DictateButton({ target }: { target: string }) {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const rec = useRef<Recognition | null>(null)

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }
    setSupported(!!(w.SpeechRecognition ?? w.webkitSpeechRecognition))
  }, [])

  if (!supported) return null

  const toggle = () => {
    if (listening) { rec.current?.stop(); return }
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }
    const Ctor = (w.SpeechRecognition ?? w.webkitSpeechRecognition)!
    const r = new Ctor()
    r.lang = 'es-GT'
    r.interimResults = false
    r.continuous = true
    r.onresult = (e) => {
      const el = document.getElementById(target) as HTMLTextAreaElement | HTMLInputElement | null
      if (!el) return
      let text = ''
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) text += e.results[i][0].transcript
      if (!text) return
      const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')?.set
      setter?.call(el, `${el.value}${el.value && !el.value.endsWith(' ') ? ' ' : ''}${text.trim()}`)
      el.dispatchEvent(new Event('input', { bubbles: true }))
    }
    r.onend = () => setListening(false)
    r.onerror = () => setListening(false)
    rec.current = r
    r.start()
    setListening(true)
  }

  return (
    <button type="button" onClick={toggle} aria-pressed={listening}
      className={cn('btn-sm inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-display text-sm', listening ? 'animate-pulse border-bad bg-bad-bg text-bad' : 'border-line bg-white text-ink2 hover:bg-paper')}>
      {listening ? <MicOff className="h-4 w-4" aria-hidden /> : <Mic className="h-4 w-4" aria-hidden />}
      {listening ? 'Detener dictado' : 'Dictar con mi voz'}
    </button>
  )
}
