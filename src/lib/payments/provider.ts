import 'server-only'
import crypto from 'node:crypto'
import type { PaymentStatus } from '@/lib/domain/states'

/**
 * Interfaz desacoplada de pagos.
 *
 * El MVP NO cobra, NO retiene fondos y NO solicita ni almacena datos de tarjeta.
 * `DemoPaymentProvider` solo devuelve estados simulados, siempre marcados como DEMO.
 * Para integrar una pasarela real: implementar esta interfaz y registrarla en `getPaymentProvider`.
 */
export interface PaymentResult {
  status: PaymentStatus
  reference: string
}

export interface PaymentProvider {
  readonly name: string
  readonly isDemo: boolean
  /** Reserva el monto acordado al contratar. */
  hold(input: { orderId: string; amount: string; currency: 'GTQ' }): Promise<PaymentResult>
  /** Libera el monto al profesional cuando el cliente aprueba el trabajo. */
  release(reference: string): Promise<PaymentResult>
  /** Pone el monto en revisión cuando se abre una disputa. */
  requestRefund(reference: string): Promise<PaymentResult>
  /** Cancela la operación (reembolso aprobado u orden cancelada). */
  cancel(reference: string): Promise<PaymentResult>
}

export class DemoPaymentProvider implements PaymentProvider {
  readonly name = 'demo'
  readonly isDemo = true

  async hold() {
    return { status: 'held_demo' as const, reference: `DEMO-${crypto.randomBytes(5).toString('hex').toUpperCase()}` }
  }
  async release(reference: string) {
    return { status: 'released_demo' as const, reference }
  }
  async requestRefund(reference: string) {
    return { status: 'refund_review' as const, reference }
  }
  async cancel(reference: string) {
    return { status: 'cancelled' as const, reference }
  }
}

export function getPaymentProvider(): PaymentProvider {
  // Único proveedor disponible en el MVP. PAYMENT_PROVIDER queda reservado para el futuro.
  return new DemoPaymentProvider()
}
