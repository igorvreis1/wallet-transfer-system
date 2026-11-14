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

/** Erros de validação (422): campo → lista de mensagens */
export type ValidationErrors = Record<string, string[]>

/** Todo erro da API tem este formato: { message, errors? } */
export interface ApiErrorBody {
  message: string
  errors?: ValidationErrors
}
