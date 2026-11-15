import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { enterFrom } from '../../lib/motion'

/**
 * Bloco com o título FORA do card (mais leitura, mais respiro).
 * Entra com fade suave; "order" faz os blocos surgirem em cascata (0, 1, 2...).
 */
export function Section({
  title,
  description,
  action,
  className,
  order = 0,
  children,
}: {
  title: string
  description?: string
  action?: ReactNode
  className?: string
  order?: number
  children: ReactNode
}) {
  return (
    <motion.section {...enterFrom(order)} className={cn('flex flex-col gap-3', className)}>
      <header className="flex items-end justify-between gap-4 px-1">
        <div>
          <h2 className="text-[17px] font-semibold tracking-tight">{title}</h2>
          {description && <p className="mt-0.5 text-[13px] text-subtle">{description}</p>}
        </div>
        {action}
      </header>
      {children}
    </motion.section>
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('rounded-card border border-line bg-surface p-5 sm:p-6', className)}>{children}</div>
}
