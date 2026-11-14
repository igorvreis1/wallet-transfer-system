import { ArrowDownLeft, ArrowUpRight, ChevronRight, Landmark, MessageSquare, RotateCcw } from 'lucide-react'
import { cn } from '../../lib/cn'
import { formatDateTime } from '../../lib/date'
import { transactionTitle } from '../../lib/transaction'
import type { Transaction } from '../../types/api'

export function TransactionIcon({ t, size = 'md' }: { t: Transaction; size?: 'md' | 'lg' }) {
  const Icon = t.type === 'deposit' ? Landmark : t.type === 'reversal' ? RotateCcw : t.direction === 'in' ? ArrowDownLeft : ArrowUpRight
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-full border border-line-strong bg-surface-2 text-muted',
        size === 'md' ? 'size-9' : 'size-12',
      )}
    >
      <Icon className={size === 'md' ? 'size-4' : 'size-5'} />
    </span>
  )
}

/**
 * Uma linha do extrato: ícone, quem/o quê, data e hora, e valor (verde entrou, vermelho saiu).
 * Clicável: abre o pop-up de detalhes (onde fica o botão de reverter).
 */
export function TransactionRow({ t, onOpen }: { t: Transaction; onOpen?: (t: Transaction) => void }) {
  const reversed = t.status === 'reversed'

  return (
    <button
      type="button"
      onClick={() => onOpen?.(t)}
      className="group -mx-3 flex w-[calc(100%+1.5rem)] items-center gap-3 rounded-[12px] px-3 py-3.5 text-left transition-colors hover:bg-white/[0.03]"
    >
      <TransactionIcon t={t} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 truncate text-[14px]">
          {transactionTitle(t)}
          {t.description && <MessageSquare className="size-3.5 shrink-0 text-subtle" aria-label="Tem mensagem" />}
        </p>
        <p className="flex items-center gap-2 text-[12px] text-subtle">
          {formatDateTime(t.created_at)}
          {reversed && (
            <span className="rounded-full border border-warn-line bg-warn-soft px-2 py-px text-[11px] text-warn">Revertida</span>
          )}
        </p>
      </div>
      <span className={cn('money shrink-0 text-[14px]', t.direction === 'in' ? 'text-in' : 'text-out', reversed && 'line-through opacity-60')}>
        {t.amount_formatted}
      </span>
      <ChevronRight className="size-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5" />
    </button>
  )
}
