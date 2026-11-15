/**
 * Ritmo das animações num lugar só. Para deixar tudo mais rápido ou mais lento, mude aqui.
 * Curva "ease-out" suave: começa rápido e desacelera devagar, o que passa calma.
 *
 * Com "reduzir movimento" ligado no sistema, o Motion (MotionConfig reducedMotion="user")
 * corta o deslocamento e mantém só o fade: os blocos continuam surgindo suavemente, sem se mexer.
 */
export const ease = [0.22, 1, 0.36, 1] as const

export const motionTokens = {
  /** Entrada de telas e cards */
  enter: { duration: 0.8, ease },
  /** Mensagens de erro/aviso/sucesso aparecendo */
  alert: { duration: 0.45, ease },
  /** Ciclo do cartão flutuando no painel da marca (segundos) */
  floatCycle: 9,
  /** Intervalo entre um bloco e o próximo na entrada em cascata (segundos) */
  stagger: 0.12,
} as const

/** Entrada de um bloco: surge de baixo com fade. "order" define a vez dele na cascata. */
export function enterFrom(order = 0) {
  return {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.9, ease, delay: order * motionTokens.stagger },
  }
}
