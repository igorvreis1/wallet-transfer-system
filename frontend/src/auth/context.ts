import { createContext } from 'react'
import type { LoginPayload, RegisterPayload, User } from '../types/api'

export type Status = 'loading' | 'authenticated' | 'guest'

export interface AuthContextValue {
  status: Status
  user: User | null
  login: (payload: LoginPayload) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => Promise<void>
  /** Recarrega os dados do usuário (ex.: saldo depois de uma operação). */
  refreshUser: () => Promise<void>
  /** Atualiza só o saldo, com o valor que a própria operação devolveu. */
  setBalance: (balance: number, formatted: string) => void
  /** Substitui os dados do usuário (ex.: depois de mudar a privacidade). */
  updateUser: (user: User) => void
  /** Motivo da última saída forçada (ex.: sessão expirada), para mostrar no login. */
  notice: string | null
  clearNotice: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
