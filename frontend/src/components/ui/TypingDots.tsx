import { useEffect, useState } from 'react'

/**
 * Reticências que vão aparecendo: "." → ".." → "..." → "." ...
 * A largura é fixa (sempre o espaço de 3 pontos), então o texto ao lado NUNCA se mexe.
 * É troca de texto, não movimento: funciona mesmo com "reduzir movimento" ligado no sistema.
 */
export function TypingDots({ interval = 450 }: { interval?: number }) {
  const [count, setCount] = useState(1)

  useEffect(() => {
    const id = window.setInterval(() => setCount((value) => (value % 3) + 1), interval)
    return () => window.clearInterval(id)
  }, [interval])

  return (
    <span aria-hidden="true" className="inline-block w-[1.1em] text-left">
      {'.'.repeat(count)}
    </span>
  )
}
