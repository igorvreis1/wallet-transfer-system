/**
 * Formatos que a API Laravel devolve. Valores monetários são sempre INTEIROS EM CENTAVOS.
 */

export interface User {
  id: number
  email: string
  nickname: string
  /** Se outras pessoas podem ver e usar o email. O nickname é sempre público. */
  email_visible: boolean
  balance: number
  balance_formatted: string
  created_at: string | null
}

export interface AuthResponse {
  token: string
  token_type: 'Bearer'
  user: User
}

export interface RegisterPayload {
  email: string
  nickname: string
  password: string
  password_confirmation: string
  /** Opcional na API (padrão: visível). */
  email_visible: boolean
}

export interface LoginPayload {
  login: string
  password: string
}

// ---------------------------------------------------------------- carteira

export type TransactionType = 'deposit' | 'transfer' | 'reversal'
export type TransactionStatus = 'completed' | 'reversed'

/** Uma linha do extrato, sempre do ponto de vista de quem está logado. */
export interface Transaction {
  id: number
  type: TransactionType
  type_label: string
  status: TransactionStatus
  status_label: string
  /** "in" = entrou no meu saldo; "out" = saiu */
  direction: 'in' | 'out'
  amount: number
  amount_formatted: string
  /** Nickname da outra pessoa (null em depósito) */
  counterpart: string | null
  /** Mensagem da transferência (opcional, como a do Pix) */
  description: string | null
  /** Depósitos: "pix" ou "card" */
  payment_method: 'pix' | 'card' | null
  /** Ex.: "Pix" ou "Visa •••• 4242" */
  payment_detail: string | null
  /** Motivo, quando esta linha É uma reversão */
  reason: string | null
  reversal_of_id: number | null
  can_reverse: boolean
  /** Até quando pode ser revertida (null em reversões) */
  reversible_until: string | null
  /** Se esta operação já foi revertida: quando e por quê */
  reversed?: { id: number; reason: string | null; created_at: string | null } | null
  created_at: string | null
}

export type CardBrand = 'visa' | 'mastercard' | 'elo' | 'amex' | 'hipercard' | 'other'

/** Cartão salvo: só bandeira e 4 últimos dígitos (o número completo nunca sai do navegador) */
export interface Card {
  id: number
  brand: CardBrand
  brand_label: string
  last4: string
  label: string
  holder_name: string
  exp_month: number
  exp_year: number
  /** "12/29" */
  expires: string
  expired: boolean
  nickname: string | null
}

/** Resposta de depósito, transferência e reversão */
export interface OperationResponse {
  message: string
  transaction: Transaction
  balance: number
  balance_formatted: string
}

/** Destinatário para a tela de confirmação (email mascarado ou null se oculto) */
export interface Recipient {
  nickname: string
  email_masked: string | null
}

/** Lista paginada do Laravel */
export interface Paginated<T> {
  data: T[]
  links: { first: string | null; last: string | null; prev: string | null; next: string | null }
  meta: { current_page: number; last_page: number; per_page: number; total: number }
}

/** Erros de validação (422): campo → lista de mensagens */
export type ValidationErrors = Record<string, string[]>

/** Todo erro da API tem este formato: { message, errors? } */
export interface ApiErrorBody {
  message: string
  errors?: ValidationErrors
}
