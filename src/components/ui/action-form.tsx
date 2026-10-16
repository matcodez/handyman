'use client'

import { useEffect, useRef } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { toast } from 'sonner'
import { CircleAlert, LoaderCircle } from 'lucide-react'
import type { ActionState } from '@/lib/errors'
import { cn } from '@/lib/cn'

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>

/**
 * Formulario conectado a una server action: muestra el error asociado al formulario,
 * notifica el resultado y pide confirmación en operaciones importantes.
 */
export function ActionForm({
  action, children, className, confirm, resetOnSuccess = true,
}: {
  action: Action
  children: React.ReactNode
  className?: string
  /** Texto de confirmación para operaciones importantes o irreversibles. */
  confirm?: string
  resetOnSuccess?: boolean
}) {
  const [state, formAction] = useFormState(action, {})
  const ref = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.error) toast.error(state.error)
    if (state.ok) {
      toast.success(state.ok)
      if (resetOnSuccess) ref.current?.reset()
    }
  }, [state, resetOnSuccess])

  return (
    <form
      ref={ref}
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault()
      }}
    >
      {children}
      {state.error && (
        <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl bg-bad-bg px-3.5 py-2.5 text-sm text-bad">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {state.error}
        </p>
      )}
    </form>
  )
}

export function SubmitButton({
  children, className = 'btn-primary', pendingText = 'Procesando…', name, value,
}: {
  children: React.ReactNode
  className?: string
  pendingText?: string
  name?: string
  value?: string
}) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" name={name} value={value} disabled={pending} aria-busy={pending} className={cn(className)}>
      {pending ? (
        <>
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
          {pendingText}
        </>
      ) : (
        children
      )}
    </button>
  )
}
