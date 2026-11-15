import { useEffect, useRef, useState } from 'react'

/**
 * Número que "conta" até o novo valor quando ele muda (ex.: saldo R$ 17,50 → R$ 29,50).
 * Trabalha com inteiros (centavos), então nunca aparece um valor quebrado.
 * Na primeira vez mostra direto, sem animar.
 *
 * Usa requestAnimationFrame (troca de número, não movimento): funciona mesmo
 * com "reduzir movimento" ligado no sistema.
 */
export function useCountUp(target: number, durationMs = 900): number {
  const [shown, setShown] = useState(target)
  const shownRef = useRef(target)

  useEffect(() => {
    const from = shownRef.current // parte de onde está (se mudar no meio, continua dali)
    if (from === target) return
    const start = performance.now()
    let frame = 0

    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // easeOutCubic: rápido no começo, devagar no fim
      const value = Math.round(from + (target - from) * eased)
      shownRef.current = value
      setShown(value)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)

    // Rede de segurança: com a aba em segundo plano o navegador pausa o requestAnimationFrame.
    // Se a animação não terminar a tempo, o número vai direto para o valor certo.
    const fallback = window.setTimeout(() => {
      cancelAnimationFrame(frame)
      shownRef.current = target
      setShown(target)
    }, durationMs + 300)

    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(fallback)
    }
  }, [target, durationMs])

  return shown
}

/**
 * Diferença da última mudança (ex.: +1200 depois de um depósito de R$ 12,00),
 * que some sozinha depois de alguns segundos. null quando não há mudança recente.
 */
export function useRecentDelta(value: number, visibleMs = 3000): { delta: number; key: number } | null {
  const previous = useRef(value)
  const [delta, setDelta] = useState<{ delta: number; key: number } | null>(null)

  useEffect(() => {
    const diff = value - previous.current
    previous.current = value
    if (diff === 0) return
    setDelta({ delta: diff, key: Date.now() })
    const id = window.setTimeout(() => setDelta(null), visibleMs)
    return () => window.clearTimeout(id)
  }, [value, visibleMs])

  return delta
}
