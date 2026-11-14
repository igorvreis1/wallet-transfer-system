import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type Tone = 'error' | 'warning' | 'success'

const tones: Record<Tone, { box: string; icon: ReactNode }> = {
  error: { box: 'border-out-line bg-out-soft text-out', icon: <XCircle className="size-4 shrink-0" /> },
  warning: { box: 'border-warn-line bg-warn-soft text-warn', icon: <AlertTriangle className="size-4 shrink-0" /> },
  success: { box: 'border-in-line bg-in-soft text-in', icon: <CheckCircle2 className="size-4 shrink-0" /> },
}

/** Mensagem destacada (vermelho = erro, amarelo = aviso, verde = sucesso), com animação de entrada. */
export function Alert({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {children && (
        <motion.div
          key="alert"
          role={tone === 'error' ? 'alert' : 'status'}
          initial={{ opacity: 0, height: 0, y: -4 }}
          animate={{ opacity: 1, height: 'auto', y: 0 }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          <div className={cn('flex items-start gap-2.5 rounded-field border px-3.5 py-3 text-[13px] leading-snug', tones[tone].box)}>
            <span className="mt-px">{tones[tone].icon}</span>
            <div className="text-fg/90">{children}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
