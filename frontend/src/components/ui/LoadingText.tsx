import { cn } from '../../lib/cn'
import { TypingDots } from './TypingDots'

/**
 * "Carregando..." com as reticências animadas (. → .. → ...).
 * É troca de texto, não movimento: continua animado mesmo com "reduzir movimento" no sistema.
 */
export function LoadingText({ text = 'Carregando', className }: { text?: string; className?: string }) {
  return (
    <p role="status" className={cn('inline-flex items-baseline text-[14px] text-muted', className)}>
      {/* espaço igual ao das reticências, à esquerda, para o texto ficar centralizado */}
      <span aria-hidden="true" className="inline-block w-[1.1em]" />
      {text}
      <TypingDots />
    </p>
  )
}
