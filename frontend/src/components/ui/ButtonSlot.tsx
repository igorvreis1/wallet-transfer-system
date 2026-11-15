import { CheckCircle2, X, XCircle } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface SlotMessage {
  tone: 'success' | 'error'
  text: string
}

/**
 * Lugar do botão que vira aviso: depois da ação, o botão sai e o aviso aparece
 * NO MESMO LUGAR (nada novo surge empurrando a tela). O "x" fecha antes do tempo
 * e o botão volta.
 */
export function ButtonSlot({
  message,
  onClose,
  children,
  className,
}: {
  message: SlotMessage | null
  onClose: () => void
  /** O(s) botão(ões) normal(is) */
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex min-h-11 items-center justify-end', className)}>
      <AnimatePresence mode="wait" initial={false}>
        {message ? (
          <motion.div
            key="message"
            role={message.tone === 'error' ? 'alert' : 'status'}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'flex max-w-full min-w-0 items-center gap-2.5 rounded-full border py-1.5 pr-1.5 pl-3.5 text-[13px]',
              message.tone === 'success' ? 'border-in-line bg-in-soft text-in' : 'border-out-line bg-out-soft text-out',
            )}
          >
            {message.tone === 'success' ? <CheckCircle2 className="size-4 shrink-0" /> : <XCircle className="size-4 shrink-0" />}
            <span className="min-w-0 text-fg/90">{message.text}</span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar aviso"
              className="grid size-7 shrink-0 place-items-center rounded-full text-current opacity-70 transition-opacity hover:bg-white/[0.06] hover:opacity-100"
            >
              <X className="size-3.5" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="buttons"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-wrap justify-end gap-2"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
