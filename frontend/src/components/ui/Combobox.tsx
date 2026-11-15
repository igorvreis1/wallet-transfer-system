import { Check, ChevronDown, Search, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '../../lib/cn'

/**
 * Select com busca (estilo "select2"): digite para filtrar a lista e escolha uma opção.
 * Teclado: setas sobem/descem, Enter escolhe, Esc fecha. O "x" limpa a escolha.
 *
 * freeText: o texto digitado JÁ é o valor (as opções viram sugestões). Usado na transferência,
 * onde dá para escolher alguém do histórico ou digitar qualquer nickname/email.
 */
export function Combobox({
  label,
  options,
  value,
  onChange,
  placeholder = 'Digite para buscar',
  emptyText = 'Nada encontrado',
  format = (option) => option,
  freeText = false,
  hint,
  error,
  autoFocus,
  size = 'md',
}: {
  label: string
  options: string[]
  value: string | null
  onChange: (value: string | null) => void
  placeholder?: string
  emptyText?: string
  /** Como mostrar cada opção (ex.: "@bob") */
  format?: (option: string) => string
  freeText?: boolean
  hint?: string
  error?: string
  autoFocus?: boolean
  /** "lg" = mesma altura do campo de valor (MoneyInput), para ficarem alinhados lado a lado */
  size?: 'md' | 'lg'
}) {
  const id = useId()
  const listId = `${id}-list`
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const filtered = useMemo(() => {
    const term = (freeText ? (value ?? '') : query).trim().toLowerCase().replace(/^@/, '')
    return term ? options.filter((option) => option.toLowerCase().includes(term)) : options
  }, [options, query, freeText, value])

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => !wrapperRef.current?.contains(event.target as Node) && close()
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function close() {
    setOpen(false)
    setQuery('')
  }

  function choose(option: string) {
    onChange(option)
    close()
    inputRef.current?.blur()
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActive((index) => Math.min(index + 1, filtered.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter' && open && active >= 0 && filtered[active]) {
      event.preventDefault()
      choose(filtered[active])
    } else if (event.key === 'Escape') {
      close()
    }
  }

  // min-w-0 + input com w-0: o campo nunca fica mais largo que a coluna
  // (sem isso, o <input> mantém uma largura natural de ~20 letras e "vaza" do card)
  return (
    <div ref={wrapperRef} className="relative grid min-w-0 gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium">
        {label}
      </label>
      <div className="relative">
      <div
        className={cn(
          'flex items-center gap-2 rounded-field border bg-surface-2/60 transition-[border-color,box-shadow] duration-200',
          size === 'lg' ? 'h-14 px-4' : 'h-11 px-3',
          error
            ? 'border-out-line'
            : open
              ? 'border-accent/70 shadow-[0_0_0_4px_rgba(138,180,255,0.12)]'
              : 'border-line-strong hover:border-[#34343b]',
        )}
      >
        <Search className="size-4 shrink-0 text-subtle" />
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          value={freeText ? (value ?? '') : open ? query : value ? format(value) : ''}
          placeholder={!freeText && value ? format(value) : placeholder}
          autoFocus={autoFocus}
          autoCapitalize="none"
          aria-invalid={error ? true : undefined}
          onFocus={() => {
            setOpen(true)
            setActive(freeText ? -1 : 0) // texto livre: Enter envia o formulário, a não ser que escolha com as setas
          }}
          onChange={(event) => {
            if (freeText) onChange(event.target.value || null)
            else setQuery(event.target.value)
            setActive(freeText ? -1 : 0)
            setOpen(true)
          }}
          onKeyDown={onKeyDown}
          className={cn('w-0 min-w-0 flex-1 bg-transparent text-fg outline-none placeholder:text-subtle', size === 'lg' ? 'text-[15px]' : 'text-[14px]')}
        />
        {value ? (
          <button
            type="button"
            aria-label="Limpar"
            onClick={() => {
              onChange(null)
              close()
            }}
            className="grid size-6 shrink-0 place-items-center rounded-full text-subtle transition-colors hover:bg-white/[0.06] hover:text-fg"
          >
            <X className="size-3.5" />
          </button>
        ) : (
          <ChevronDown className={cn('size-4 shrink-0 text-subtle transition-transform', open && 'rotate-180')} />
        )}
      </div>

      {open && !(freeText && filtered.length === 0) && (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-full right-0 left-0 z-30 mt-1.5 max-h-60 overflow-y-auto rounded-field border border-line-strong bg-surface-3 p-1 shadow-[0_16px_40px_rgba(0,0,0,0.6)]"
        >
          {filtered.length === 0 && <li className="px-3 py-2.5 text-[13px] text-subtle">{emptyText}</li>}
          {filtered.map((option, index) => (
            <li
              key={option}
              role="option"
              aria-selected={option === value}
              onMouseDown={(event) => event.preventDefault()} // não perde o foco antes do clique
              onClick={() => choose(option)}
              onMouseEnter={() => setActive(index)}
              className={cn(
                'flex cursor-pointer items-center justify-between rounded-[8px] px-3 py-2 text-[14px]',
                index === active ? 'bg-white/[0.07] text-fg' : 'text-muted',
              )}
            >
              {format(option)}
              {option === value && <Check className="size-4 text-accent" />}
            </li>
          ))}
        </ul>
      )}
      </div>
      {(error || hint) && (
        <p className={cn('text-[12px] leading-snug', error ? 'text-out' : 'text-subtle')} role={error ? 'alert' : undefined}>
          {error ?? hint}
        </p>
      )}
    </div>
  )
}
