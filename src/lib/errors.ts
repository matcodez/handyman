/** Error de negocio con mensaje apto para mostrar al usuario. */
export class AppError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AppError'
  }
}

export type ActionState = { error?: string; ok?: string }

/**
 * Envuelve una server action: convierte AppError en un estado de error visible
 * y deja pasar las señales internas de Next (redirect / notFound).
 */
export async function runAction(fn: () => Promise<ActionState | void>): Promise<ActionState> {
  try {
    return (await fn()) ?? {}
  } catch (e) {
    if (e instanceof AppError) return { error: e.message }
    const digest = (e as { digest?: unknown })?.digest
    if (typeof digest === 'string' && digest.startsWith('NEXT_')) throw e
    console.error('[action]', e)
    return { error: 'Ocurrió un error inesperado. Intenta de nuevo.' }
  }
}
