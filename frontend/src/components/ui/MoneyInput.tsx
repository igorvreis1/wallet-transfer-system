import { useId, useLayoutEffect, useRef, type ChangeEvent } from 'react'
import { cn } from '../../lib/cn'
import { formatCents, MAX_AMOUNT_CENTS } from '../../lib/money'

interface MoneyInputProps {
  label: string
  /** Valor em CENTAVOS (inteiro). */
  value: number
  onChange: (cents: number) => void
  hint?: string
  error?: string
  max?: number
  autoFocus?: boolean
}

/**
 * Campo de valor com máscara, como nas maquininhas: só aceita números e preenche
 * a partir dos centavos. Digitando 1, 2, 3, 4 → 0,01 → 0,12 → 1,23 → 12,34.
 *
 * O truque: os dígitos do que está escrito SÃO o valor em centavos.
 * "0,123" (depois de digitar o 3) → dígitos "0123" → 123 centavos → mostra "1,23".
 * Funciona igual para apagar, colar e em teclados de celular.
 */
export function MoneyInput({ label, value, onChange, hint, error, max = MAX_AMOUNT_CENTS, autoFocus }: MoneyInputProps) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const digits = event.target.value.replace(/\D/g, '').slice(-12)
    const cents = Number(digits || '0')
    if (cents <= max) onChange(cents)
  }

  // O cursor fica sempre no fim (os números entram pela direita).
  useLayoutEffect(() => {
    const input = inputRef.current
    if (input && document.activeElement === input) {
      const end = input.value.length
      input.setSelectionRange(end, end)
    }
  }, [value])

  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-fg">
        {label}
      </label>
      <div
        className={cn(
          'flex h-14 items-center gap-3 rounded-field border bg-surface-2/60 px-4 transition-[border-color,box-shadow] duration-200',
          'focus-within:border-accent/70 focus-within:shadow-[0_0_0_4px_rgba(138,180,255,0.12)]',
          error ? 'border-out-line' : 'border-line-strong hover:border-[#34343b]',
        )}
      >
        <span className="text-[14px] text-subtle">R$</span>
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          autoFocus={autoFocus}
          value={formatCents(value, { withSymbol: false })}
          onChange={handleChange}
          // O cursor fica SEMPRE no fim: clique, seta ou foco não conseguem tirá-lo de lá.
          // Assim todo número digitado entra pela direita, como na maquininha.
          onSelect={(event) => {
            const input = event.currentTarget
            const end = input.value.length
            if (input.selectionStart !== end || input.selectionEnd !== end) input.setSelectionRange(end, end)
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${id}-help` : undefined}
          className={cn('money w-full bg-transparent text-right text-[22px] outline-none', value === 0 ? 'text-subtle' : 'text-fg')}
        />
      </div>
      {(error || hint) && (
        <p id={`${id}-help`} className={cn('text-[12px] leading-snug', error ? 'text-out' : 'text-subtle')} role={error ? 'alert' : undefined}>
          {error ?? hint}
        </p>
      )}
    </div>
  )
}
