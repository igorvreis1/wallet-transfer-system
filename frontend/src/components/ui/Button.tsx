import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { LoadingDots } from './LoadingDots'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
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
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'relative inline-flex select-none items-center justify-center gap-2 rounded-full font-medium',
        'transition-[background-color,border-color,color,transform] duration-200 ease-out-soft active:scale-[0.98]',
        'disabled:pointer-events-none',
        !loading && 'disabled:opacity-50', // carregando continua com a cor cheia, só "pensando"
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {/* O conteúdo fica invisível (mas ocupando espaço) para o botão não mudar de tamanho. */}
      <span
        className={cn(
          'inline-flex items-center gap-2 transition-[opacity,transform] duration-200 ease-out-soft',
          loading && 'scale-95 opacity-0',
        )}
      >
        {icon}
        {children}
      </span>
      {loading && (
        <span className="absolute inset-0 grid place-items-center">
          <LoadingDots />
          <span className="sr-only">Carregando…</span>
        </span>
      )}
    </button>
  )
}
