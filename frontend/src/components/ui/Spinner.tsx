import { cn } from '../../lib/cn'

/** Anel fino girando devagar (usado no carregamento da tela inteira). */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('animate-[spin_2s_linear_infinite]', className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1.5" />
      <path d="M21.5 12a9.5 9.5 0 0 0-9.5-9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
