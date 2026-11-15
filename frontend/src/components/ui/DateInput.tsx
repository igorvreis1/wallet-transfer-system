import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '../../lib/cn'

/**
 * Campo de data SEMPRE em dd/mm/aaaa, independente do idioma do navegador
 * (o <input type="date"> nativo segue o idioma do Chrome e pode aparecer como mm/dd/yyyy).
 *
 * Digite só os números (a máscara põe as barras) ou escolha no calendário.
 * O valor que sai é "AAAA-MM-DD", o formato que a API espera.
 */
export function DateInput({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string
  /** "AAAA-MM-DD" ou "" */
  value: string
  onChange: (iso: string) => void
  min?: string
  max?: string
}) {
  const id = useId()
  const wrapperRef = useRef<HTMLDivElement>(null)
  // Enquanto a pessoa digita, o texto incompleto fica aqui; pronto, vira o valor de verdade.
  const [draft, setDraft] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const shown = draft ?? isoToBr(value)

  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => !wrapperRef.current?.contains(event.target as Node) && setOpen(false)
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function handleType(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 8)
    const masked = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join('/')
    if (digits.length === 0) {
      setDraft(null)
      onChange('')
      return
    }
    const iso = digits.length === 8 ? brToIso(masked) : null
    if (iso) {
      setDraft(null)
      onChange(iso)
    } else {
      setDraft(masked)
    }
  }

  return (
    <div ref={wrapperRef} className="relative grid gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium">
        {label}
      </label>
      <div className="flex h-11 items-center gap-1 rounded-field border border-line-strong bg-surface-2/60 pr-1.5 pl-3 transition-[border-color,box-shadow] duration-200 focus-within:border-accent/70 focus-within:shadow-[0_0_0_4px_rgba(138,180,255,0.12)] hover:border-[#34343b]">
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          placeholder="dd/mm/aaaa"
          value={shown}
          onChange={(event) => handleType(event.target.value)}
          onBlur={() => setDraft(null)} // data incompleta ao sair do campo: descarta
          className="money min-w-0 flex-1 bg-transparent text-[14px] text-fg outline-none placeholder:font-sans placeholder:text-subtle"
        />
        {value && (
          <button
            type="button"
            aria-label={`Limpar ${label.toLowerCase()}`}
            onClick={() => onChange('')}
            className="grid size-7 place-items-center rounded-full text-subtle transition-colors hover:bg-white/[0.06] hover:text-fg"
          >
            <X className="size-3.5" />
          </button>
        )}
        <button
          type="button"
          aria-label="Abrir calendário"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          className="grid size-8 place-items-center rounded-[8px] text-muted transition-colors hover:bg-white/[0.06] hover:text-fg"
        >
          <CalendarDays className="size-4" />
        </button>
      </div>

      {open && (
        <Calendar
          value={value}
          min={min}
          max={max}
          onPick={(iso) => {
            onChange(iso)
            setDraft(null)
            setOpen(false)
          }}
        />
      )}
    </div>
  )
}

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

/** Calendário do mês, em português, começando no domingo. */
function Calendar({ value, min, max, onPick }: { value: string; min?: string; max?: string; onPick: (iso: string) => void }) {
  const [view, setView] = useState(() => {
    const base = value ? new Date(`${value}T12:00:00`) : new Date()
    return { year: base.getFullYear(), month: base.getMonth() }
  })
  const [today] = useState(() => toIso(new Date()))

  const firstWeekday = new Date(view.year, view.month, 1).getDay()
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate()
  const cells: Array<number | null> = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  const move = (delta: number) =>
    setView(({ year, month }) => {
      const next = new Date(year, month + delta, 1)
      return { year: next.getFullYear(), month: next.getMonth() }
    })

  return (
    <div className="absolute top-full left-0 z-30 mt-1.5 w-[17rem] rounded-card border border-line-strong bg-surface-3 p-3 shadow-[0_16px_40px_rgba(0,0,0,0.6)]">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" aria-label="Mês anterior" onClick={() => move(-1)} className="grid size-8 place-items-center rounded-[8px] text-muted hover:bg-white/[0.06] hover:text-fg">
          <ChevronLeft className="size-4" />
        </button>
        <p className="text-[13px] font-medium">
          {MONTHS[view.month]} de {view.year}
        </p>
        <button type="button" aria-label="Próximo mês" onClick={() => move(1)} className="grid size-8 place-items-center rounded-[8px] text-muted hover:bg-white/[0.06] hover:text-fg">
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {WEEKDAYS.map((day, index) => (
          <span key={index} className="py-1 text-[11px] text-subtle">
            {day}
          </span>
        ))}
        {cells.map((day, index) => {
          if (day === null) return <span key={`empty-${index}`} />
          const iso = `${view.year}-${String(view.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const disabled = (min && iso < min) || (max && iso > max)
          return (
            <button
              key={iso}
              type="button"
              disabled={Boolean(disabled)}
              onClick={() => onPick(iso)}
              className={cn(
                'h-8 rounded-[8px] text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-30',
                iso === value ? 'bg-fg font-medium text-bg' : 'text-fg hover:bg-white/[0.07]',
                iso === today && iso !== value && 'text-accent',
              )}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** "2026-11-14" → "14/11/2026" */
function isoToBr(iso: string): string {
  const [year, month, day] = iso.split('-')
  return iso ? `${day}/${month}/${year}` : ''
}

/** "14/11/2026" → "2026-11-14" (ou null se a data não existe, ex.: 31/02) */
function brToIso(br: string): string | null {
  const [day, month, year] = br.split('/').map(Number)
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null
  return toIso(date)
}

function toIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
