import { useId } from 'react'
import { cn } from '../../lib/cn'
import { InfoTooltip } from './Tooltip'

interface SwitchProps {
  label: string
  hint?: string
  tooltip?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

/** Interruptor liga/desliga com rótulo, tooltip e frase de ajuda (mesmo padrão do Field). */
export function Switch({ label, hint, tooltip, checked, onChange, disabled }: SwitchProps) {
  const id = useId()

  return (
    <div className="flex items-start justify-between gap-4 rounded-field border border-line-strong bg-surface-2/40 px-3.5 py-3">
      <div className="grid gap-1">
        <div className="flex items-center gap-1.5">
          <label htmlFor={id} className="cursor-pointer text-[13px] font-medium text-fg">
            {label}
          </label>
          {tooltip && <InfoTooltip text={tooltip} />}
        </div>
        {hint && <p className="text-[12px] leading-snug text-subtle">{hint}</p>}
      </div>

      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-6 w-10 shrink-0 rounded-full border transition-colors duration-200 disabled:opacity-50',
          checked ? 'border-accent/60 bg-accent-strong' : 'border-line-strong bg-surface-3',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'absolute top-0.5 left-0.5 size-[18px] rounded-full bg-fg shadow transition-transform duration-200 ease-out-soft',
            checked && 'translate-x-4',
          )}
        />
      </button>
    </div>
  )
}
