import { useCallback, useEffect, useState } from 'react'

/**
 * Mensagem que some sozinha depois de alguns segundos (ex.: "Depósito realizado").
 * Uma mensagem nova reinicia a contagem.
 */
export function useTimedMessage(durationMs = 5_000) {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!message) return
    const id = window.setTimeout(() => setMessage(null), durationMs)
    return () => window.clearTimeout(id)
  }, [message, durationMs])

  const clear = useCallback(() => setMessage(null), [])

  return [message, setMessage, clear] as const
}
