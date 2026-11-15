import { AnimatePresence, motion } from 'motion/react'
import { cn } from '../../lib/cn'
import { formatCents } from '../../lib/money'
import { useCountUp, useRecentDelta } from '../../lib/useCountUp'
import { HIDDEN_MONEY } from '../layout/BalanceVisibility'

/**
 * Saldo animado: quando muda, os números "contam" até o novo valor e aparece
 * ao lado quanto entrou (verde) ou saiu (vermelho), sumindo devagar.
 * Com o saldo escondido (olhinho), não anima nem mostra a diferença.
 */
export function AnimatedBalance({
  cents,
  hidden,
  variant,
}: {
  cents: number
  hidden: boolean
  /** hero = número grande do card; inline = header */
  variant: 'hero' | 'inline'
}) {
  const shown = useCountUp(cents)
  const recent = useRecentDelta(cents)
  const counting = shown !== cents

  if (hidden) return <span className="money">{HIDDEN_MONEY}</span>

  const [reais, centavos] = formatCents(shown).split(',')

  return (
    <span className={cn('relative inline-flex items-baseline', variant === 'hero' ? 'gap-4' : 'gap-2')}>
      <span
        className={cn(
          'money transition-colors duration-700',
          // durante a contagem, o número ganha um leve tom de quem entrou/saiu
          counting && recent ? (recent.delta > 0 ? 'text-in' : 'text-out') : 'text-fg',
        )}
      >
        {reais}
        <span className={variant === 'hero' ? 'text-subtle' : undefined}>,{centavos}</span>
      </span>

      <AnimatePresence>
        {recent && (
          <motion.span
            key={recent.key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.8 } }}
            transition={{ duration: 0.4 }}
            className={cn(
              'money rounded-full border px-2 py-0.5 font-medium whitespace-nowrap',
              variant === 'hero' ? 'self-center text-[14px]' : 'text-[11px]',
              recent.delta > 0 ? 'border-in-line bg-in-soft text-in' : 'border-out-line bg-out-soft text-out',
            )}
          >
            {recent.delta > 0 ? '+ ' : '− '}
            {formatCents(Math.abs(recent.delta))}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}
