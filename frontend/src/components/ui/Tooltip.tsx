import { Info } from 'lucide-react'
import { useId, useState } from 'react'

/**
 * Ícone (i) que explica um dado. Abre ao passar o mouse, ao focar com o teclado
 * e ao tocar (no celular não existe "hover").
 */
export function InfoTooltip({ text, label = 'Mais informações' }: { text: string; label?: string }) {
  const id = useId()
  const [open, setOpen] = useState(false)

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        // Hover só para mouse. No toque, o navegador também dispara "enter" antes do clique,
        // e o tooltip abriria e fecharia na mesma hora.
        onPointerEnter={(event) => event.pointerType === 'mouse' && setOpen(true)}
        onPointerLeave={(event) => event.pointerType === 'mouse' && setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen(true)} // fecha ao tocar fora (blur) ou com Esc
        onKeyDown={(event) => event.key === 'Escape' && setOpen(false)}
        className="inline-flex size-4 items-center justify-center rounded-full text-subtle transition-colors hover:text-accent"
      >
        <Info className="size-3.5" strokeWidth={2} />
      </button>
      <span
        id={id}
        role="tooltip"
        className={[
          // Alinhado à esquerda do ícone (que fica logo após o rótulo), para nunca sair da tela no celular.
          'pointer-events-none absolute bottom-full -left-16 z-20 mb-2 w-[min(15rem,calc(100vw-2rem))] rounded-[10px]',
          'border border-line-strong bg-surface-3 px-3 py-2 text-[12px] leading-snug font-normal text-fg',
          'shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-all duration-150 ease-out-soft',
          open ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0',
        ].join(' ')}
      >
        {text}
      </span>
    </span>
  )
}
