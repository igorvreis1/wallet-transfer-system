/**
 * Ritmo das animações num lugar só. Para deixar tudo mais rápido ou mais lento, mude aqui.
 * Curva "ease-out" suave: começa rápido e desacelera devagar, o que passa calma.
 */
export const ease = [0.22, 1, 0.36, 1] as const

export const motionTokens = {
  /** Entrada de telas e cards */
  enter: { duration: 0.8, ease },
  /** Mensagens de erro/aviso/sucesso aparecendo */
  alert: { duration: 0.45, ease },
  /** Ciclo do cartão flutuando no painel da marca (segundos) */
  floatCycle: 9,
} as const
