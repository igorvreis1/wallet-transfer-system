import { Eye, EyeOff } from 'lucide-react'
import { useId, useState, type InputHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'
import { InfoTooltip } from './Tooltip'

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string
  /** Frase curta embaixo do campo explicando para que ele serve. */
  hint?: string
  /** Texto do (i) ao lado do rótulo. */
  tooltip?: string
  /** Mensagem de erro (vinda da API ou da validação local). */
  error?: string
}

/**
 * Campo de formulário completo: rótulo, tooltip, input, frase de ajuda e erro.
 * Acessível: o leitor de tela anuncia a ajuda e o erro junto com o campo.
 */
export function Field({ label, hint, tooltip, error, type = 'text', className, ...props }: FieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'

  return (
    <div className={cn('grid gap-1.5', className)}>
      <div className="flex items-center gap-1.5">
        <label htmlFor={id} className="text-[13px] font-medium text-fg">
          {label}
        </label>
        {tooltip && <InfoTooltip text={tooltip} label={`O que é ${label.toLowerCase()}?`} />}
      </div>

      <div className="relative">
        <input
          id={id}
          type={isPassword && showPassword ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={[hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined}
          className={cn(
            'h-11 w-full rounded-field border bg-surface-2/60 px-3.5 text-[14px] text-fg placeholder:text-subtle',
            'transition-[border-color,box-shadow,background-color] duration-200 outline-none',
            'hover:border-[#34343b] focus:bg-surface-2 focus:border-accent/70 focus:shadow-[0_0_0_4px_rgba(138,180,255,0.12)]',
            error ? 'border-out-line focus:border-out/70 focus:shadow-[0_0_0_4px_rgba(248,113,113,0.12)]' : 'border-line-strong',
            isPassword && 'pr-11',
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
            className="absolute inset-y-0 right-0 grid w-11 place-items-center text-subtle transition-colors hover:text-fg"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </div>

      {error ? (
        <p id={errorId} className="text-[12px] text-out" role="alert">
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="text-[12px] leading-snug text-subtle">
            {hint}
          </p>
        )
      )}
    </div>
  )
}
