import { CreditCard } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { CardBrand } from '../../types/api'

/**
 * "Bandeirinha" do meio de pagamento, desenhada com CSS (sem imagens).
 * Tamanho de um cartãozinho: 34 x 22.
 */
export function BrandMark({ brand, className }: { brand: CardBrand | 'pix'; className?: string }) {
  const base = cn('inline-grid h-[22px] w-[34px] shrink-0 place-items-center overflow-hidden rounded-[5px] select-none', className)

  switch (brand) {
    case 'pix':
      return (
        <span className={cn(base, 'bg-[#0f2a26]')} aria-label="Pix">
          <svg viewBox="0 0 24 24" className="size-[15px]" aria-hidden="true">
            <path d="M12 2.5 21.5 12 12 21.5 2.5 12Z" fill="none" stroke="#32bcad" strokeWidth="2.4" strokeLinejoin="round" />
            <path d="M8.5 12 12 8.5 15.5 12 12 15.5Z" fill="#32bcad" />
          </svg>
        </span>
      )
    case 'visa':
      return (
        <span className={cn(base, 'bg-[#1a1f71] text-[9px] font-extrabold tracking-tight text-white italic')} aria-label="Visa">
          VISA
        </span>
      )
    case 'mastercard':
      return (
        <span className={cn(base, 'bg-[#1c1c1f]')} aria-label="Mastercard">
          <span className="relative h-3 w-5">
            <span className="absolute left-0 size-3 rounded-full bg-[#eb001b]" />
            <span className="absolute right-0 size-3 rounded-full bg-[#f79e1b] mix-blend-screen" />
          </span>
        </span>
      )
    case 'elo':
      return (
        <span className={cn(base, 'bg-black text-[10px] font-bold text-white')} aria-label="Elo">
          elo
        </span>
      )
    case 'amex':
      return (
        <span className={cn(base, 'bg-[#2e77bb] text-[8px] font-extrabold text-white')} aria-label="American Express">
          AMEX
        </span>
      )
    case 'hipercard':
      return (
        <span className={cn(base, 'bg-[#b3131b] text-[7.5px] font-bold text-white')} aria-label="Hipercard">
          Hiper
        </span>
      )
    default:
      return (
        <span className={cn(base, 'bg-surface-3 text-muted')} aria-label="Cartão">
          <CreditCard className="size-3.5" />
        </span>
      )
  }
}
