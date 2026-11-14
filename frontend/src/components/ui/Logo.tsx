import { cn } from '../../lib/cn'

type Size = 'md' | 'lg'

const sizes: Record<Size, { icon: string; text: string }> = {
  md: { icon: 'size-7', text: 'text-[17px]' },
  lg: { icon: 'size-10', text: 'text-[22px]' },
}

/** Marca da aplicação: ícone de carteira + "wallet easy" com o ponto azul. */
export function Logo({ size = 'md', className }: { size?: Size; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-3 font-semibold tracking-tight text-fg', sizes[size].text, className)}>
      <svg viewBox="0 0 32 32" className={sizes[size].icon} aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="#ededed" />
        <rect x="8" y="11" width="16" height="11" rx="3" fill="none" stroke="#0a0a0b" strokeWidth="2.2" />
        <circle cx="19.5" cy="16.5" r="1.6" fill="#3b6fe0" />
      </svg>
      <span>
        wallet <span className="font-normal text-muted">easy</span>
        <span className="text-accent">.</span>
      </span>
    </span>
  )
}
