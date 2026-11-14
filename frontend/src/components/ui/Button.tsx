import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { TypingDots } from './TypingDots'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  /** Texto mostrado enquanto carrega, sem pontos (ex.: "Entrando"). As reticências são animadas. */
  loadingText?: string
  icon?: ReactNode
  fullWidth?: boolean
}

const variants: Record<Variant, string> = {
  // Pílula clara: no fundo escuro é o que mais chama atenção, sem precisar de cor.
  primary:
    'bg-fg text-bg shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_1px_2px_rgba(0,0,0,0.4)] hover:bg-white active:bg-[#d9d9d9]',
  // "Vidro": translúcido com borda fina.
  secondary: 'border border-line-strong bg-white/[0.04] text-fg hover:border-[#3a3a42] hover:bg-white/[0.07]',
  ghost: 'text-muted hover:bg-white/[0.05] hover:text-fg',
  danger: 'border border-out-line bg-out-soft text-out hover:border-out/50',
}

const sizes: Record<Size, string> = {
  md: 'h-9 px-4 text-[13px]',
  lg: 'h-11 px-5 text-[14px]',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingText,
  icon,
  fullWidth = false,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      // Troca de COR não é movimento: continua suave mesmo com "reduzir movimento" no sistema.
      data-color-transition
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'relative isolate inline-flex select-none items-center justify-center gap-2 overflow-hidden rounded-full font-medium',
        'transition-[background-color,border-color,color,transform] ease-out-soft active:scale-[0.98] motion-reduce:active:scale-100',
        // Ao começar a carregar, escurece devagar (1,2s); hover e o resto continuam rápidos.
        loading ? 'duration-[1200ms]' : 'duration-200',
        'disabled:pointer-events-none',
        !loading && 'disabled:opacity-50',
        // Carregando: o botão "inverte" (fundo preto, borda e texto brancos).
        loading ? 'border border-fg bg-bg text-fg' : variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? (
        // O texto fica parado; só as reticências mudam, num espaço de largura fixa.
        <span className="inline-flex items-baseline">
          {/* espaço igual ao das reticências, à esquerda, para o texto ficar centralizado */}
          <span aria-hidden="true" className="inline-block w-[1.1em]" />
          {loadingText ?? children}
          <TypingDots />
          <span className="sr-only">, carregando</span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-2">
          {icon}
          {children}
        </span>
      )}
    </button>
  )
}
