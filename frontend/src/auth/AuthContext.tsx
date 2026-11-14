import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, setUnauthorizedHandler, tokenStorage } from '../lib/api'
import type { AuthResponse, LoginPayload, RegisterPayload, User } from '../types/api'
import { AuthContext, type AuthContextValue, type Status } from './context'

/**
 * Guarda quem está logado. O token fica no localStorage e vai em toda
 * requisição pelo cliente da API (lib/api.ts).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<Status>(() => (tokenStorage.get() ? 'loading' : 'guest'))
  const [notice, setNotice] = useState<string | null>(null)

  const endSession = useCallback((message: string | null = null) => {
    tokenStorage.clear()
    setUser(null)
    setStatus('guest')
    setNotice(message)
  }, [])

  // Token expirado (24h) ou revogado: qualquer 401 derruba a sessão.
  useEffect(() => {
    setUnauthorizedHandler(() => endSession('Sua sessão expirou. Entre novamente para continuar.'))
    return () => setUnauthorizedHandler(null)
  }, [endSession])

  // Ao abrir o app com um token salvo, confirma com a API quem é o usuário.
  useEffect(() => {
    if (!tokenStorage.get()) return
    const controller = new AbortController()
    api<{ data: User }>('/auth/me', { signal: controller.signal })
      .then(({ data }) => {
        setUser(data)
        setStatus('authenticated')
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        endSession()
      })
    return () => controller.abort()
  }, [endSession])

  const startSession = useCallback((response: AuthResponse) => {
    tokenStorage.set(response.token)
    setUser(response.user)
    setStatus('authenticated')
    setNotice(null)
  }, [])

  const login = useCallback(
    async (payload: LoginPayload) => startSession(await api<AuthResponse>('/auth/login', { method: 'POST', body: payload })),
    [startSession],
  )

  const register = useCallback(
    async (payload: RegisterPayload) =>
      startSession(await api<AuthResponse>('/auth/register', { method: 'POST', body: payload })),
    [startSession],
  )

  const logout = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST' })
    } finally {
      endSession() // mesmo se a API falhar, o usuário sai deste navegador
    }
  }, [endSession])

  const refreshUser = useCallback(async () => {
    const { data } = await api<{ data: User }>('/auth/me')
    setUser(data)
  }, [])

  const setBalance = useCallback((balance: number, formatted: string) => {
    setUser((current) => (current ? { ...current, balance, balance_formatted: formatted } : current))
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      login,
      register,
      logout,
      refreshUser,
      setBalance,
      updateUser: setUser,
      notice,
      clearNotice: () => setNotice(null),
    }),
    [status, user, login, register, logout, refreshUser, setBalance, notice],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
