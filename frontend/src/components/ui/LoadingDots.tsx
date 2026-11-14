import { cn } from '../../lib/cn'

/**
 * Três pontinhos que "respiram" em sequência (indicador de carregamento discreto).
 * Herda a cor do texto, então funciona em qualquer variante de botão.
 */
export function LoadingDots({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-[5px]', className)} aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="size-[5px] animate-[dot-breathe_1.4s_ease-in-out_infinite] rounded-full bg-current"
          style={{ animationDelay: `${index * 0.18}s` }}
        />
      ))}
    </span>
  )
}
