import type { Transaction } from '../types/api'

/** Título da operação, do ponto de vista de quem está logado. */
export function transactionTitle(t: Transaction): string {
  if (t.type === 'deposit') {
    if (t.payment_method === 'card') return 'Depósito via cartão de crédito'
    if (t.payment_method === 'pix') return 'Depósito via Pix'
    return 'Depósito' // depósitos antigos, de antes de existir a forma de pagamento
  }
  if (t.type === 'transfer') return t.direction === 'in' ? `De @${t.counterpart}` : `Para @${t.counterpart}`
  return t.counterpart ? `Estorno · @${t.counterpart}` : 'Estorno de depósito'
}
