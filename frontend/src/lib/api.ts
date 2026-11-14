import type { ApiErrorBody, ValidationErrors } from '../types/api'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'
const TOKEN_KEY = 'wallet.token'

/** Erro vindo da API, já com a mensagem em português pronta para mostrar. */
export class ApiError extends Error {
  readonly status: number
  readonly errors: ValidationErrors

  constructor(status: number, body: ApiErrorBody) {
    super(body.message)
    this.status = status
    this.errors = body.errors ?? {}
  }

  /** Primeira mensagem de um campo (para mostrar embaixo do input). */
  field(name: string): string | undefined {
    return this.errors[name]?.[0]
  }
}

// ---------------------------------------------------------------- token

export const tokenStorage = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token)
    } catch {
      /* navegação privada: a sessão vale só enquanto a aba estiver aberta */
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* idem */
    }
  },
}

/** Chamado quando a API responde 401 (token expirado ou revogado). O AuthProvider registra. */
let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler
}

// ---------------------------------------------------------------- requisições

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number | undefined | null>
  signal?: AbortSignal
}

/**
 * Cliente HTTP da aplicação. Envia o token Bearer automaticamente
 * e transforma qualquer resposta de erro em ApiError.
 */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, signal } = options

  const url = new URL(BASE_URL + path)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
  }

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = tokenStorage.get()
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, { message: 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.' })
  }

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    if (response.status === 401 && token) onUnauthorized?.()
    throw new ApiError(response.status, {
      message: data?.message ?? 'Algo deu errado. Tente novamente em instantes.',
      errors: data?.errors,
    })
  }

  return data as T
}
