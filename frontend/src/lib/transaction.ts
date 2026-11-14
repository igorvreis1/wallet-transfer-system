import type { Transaction } from '../types/api'

/** Título da operação, do ponto de vista de quem está logado. */
export function transactionTitle(t: Transaction): string {
  if (t.type === 'deposit') return 'Depósito'
  if (t.type === 'transfer') return t.direction === 'in' ? `De @${t.counterpart}` : `Para @${t.counterpart}`
  return t.counterpart ? `Estorno · @${t.counterpart}` : 'Estorno de depósito'
}
