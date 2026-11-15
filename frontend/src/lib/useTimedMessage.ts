import { useCallback, useEffect, useState } from 'react'

/**
 * Mensagem que some sozinha depois de alguns segundos (ex.: "Depósito realizado").
 * Uma mensagem nova reinicia a contagem. Pode ser um texto ou um objeto (ex.: { tone, text }).
 */
export function useTimedMessage<T = string>(durationMs = 5_000) {
  const [message, setMessage] = useState<T | null>(null)

  useEffect(() => {
    if (message === null) return
    const id = window.setTimeout(() => setMessage(null), durationMs)
    return () => window.clearTimeout(id)
  }, [message, durationMs])

  const clear = useCallback(() => setMessage(null), [])

  return [message, setMessage, clear] as const
}
