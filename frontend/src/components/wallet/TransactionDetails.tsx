import { CalendarClock, RotateCcw } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useAuth } from '../../auth/useAuth'
import { api, ApiError } from '../../lib/api'
import { cn } from '../../lib/cn'
import { formatDate, formatDateTime } from '../../lib/date'
import { formatCents } from '../../lib/money'
import { transactionTitle } from '../../lib/transaction'
import type { OperationResponse, Transaction } from '../../types/api'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { ReceiptActions } from './ReceiptActions'
import { TransactionIcon } from './TransactionRow'

/** Pop-up com todos os detalhes de uma operação e, quando permitido, a reversão. */
export function TransactionDetails({
  transaction,
  onClose,
  onReversed,
}: {
  transaction: Transaction | null
  onClose: () => void
  onReversed: (message: string) => void
}) {
  return (
    <Modal open={transaction !== null} onClose={onClose} title="Detalhes da operação">
      {transaction && <DetailsContent key={transaction.id} t={transaction} onReversed={onReversed} />}
    </Modal>
  )
}

function DetailsContent({ t, onReversed }: { t: Transaction; onReversed: (message: string) => void }) {
  const reversed = t.status === 'reversed'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 pr-8">
        <TransactionIcon t={t} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-[17px] font-semibold">{transactionTitle(t)}</p>
          <p className="text-[13px] text-subtle">{t.type_label}</p>
        </div>
      </div>

      <div>
        <p className={cn('money text-[34px] leading-none', t.direction === 'in' ? 'text-in' : 'text-out', reversed && 'line-through opacity-60')}>
          {t.amount_formatted}
        </p>
        <span
          className={cn(
            'mt-3 inline-block rounded-full border px-2.5 py-0.5 text-[12px]',
            reversed ? 'border-warn-line bg-warn-soft text-warn' : 'border-line-strong text-muted',
          )}
        >
          {t.status_label}
        </span>
      </div>

      <dl className="divide-y divide-line rounded-field border border-line">
        <Row label="Data e hora">{formatDateTime(t.created_at)}</Row>
        {t.counterpart && <Row label={t.direction === 'in' ? 'De' : 'Para'}>@{t.counterpart}</Row>}
        {t.description && <Row label="Mensagem">“{t.description}”</Row>}
        {t.type === 'reversal' && <Row label="Motivo do estorno">{t.reason ?? 'Não informado'}</Row>}
        <Row label="Nº da operação">
          <span className="money">#{t.id}</span>
        </Row>
      </dl>

      <div className="flex flex-col gap-2">
        <p className="text-[12px] text-subtle">Comprovante</p>
        <ReceiptActions transaction={t} />
      </div>

      <ReversalSection t={t} onReversed={onReversed} />
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3 text-[13px]">
      <dt className="shrink-0 text-subtle">{label}</dt>
      <dd className="text-right break-words text-fg">{children}</dd>
    </div>
  )
}

/** Situação da reversão: já revertida, permitida (com botão), ou o porquê de não poder. */
function ReversalSection({ t, onReversed }: { t: Transaction; onReversed: (message: string) => void }) {
  const { setBalance } = useAuth()
  const [confirming, setConfirming] = useState(false)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openedAt] = useState(() => Date.now()) // "agora" fixo enquanto o pop-up está aberto

  if (t.reversed) {
    return (
      <Alert tone="warning">
        Revertida em {formatDateTime(t.reversed.created_at)}. Motivo: {t.reversed.reason ?? 'não informado'}.
      </Alert>
    )
  }

  if (t.type === 'reversal') {
    return <Note>Este é um estorno. Estornos não podem ser revertidos.</Note>
  }

  const deadline = formatDate(t.reversible_until)
  const expired = t.reversible_until !== null && Date.parse(t.reversible_until) < openedAt

  if (!t.can_reverse) {
    if (expired) return <Note>O prazo para reverter terminou em {deadline}.</Note>
    return <Note>Só quem enviou pode reverter esta transferência (prazo até {deadline}).</Note>
  }

  async function handleReverse() {
    setLoading(true)
    setError(null)
    try {
      const response = await api<OperationResponse>(`/transactions/${t.id}/reverse`, {
        method: 'POST',
        body: { reason: reason.trim() || null },
      })
      setBalance(response.balance, response.balance_formatted)
      onReversed(`Operação revertida: ${formatCents(t.amount)} ${t.type === 'deposit' ? 'saíram do' : 'voltaram para o'} seu saldo.`)
    } catch (caught) {
      setError(caught instanceof ApiError ? (caught.field('reason') ?? caught.message) : 'Não foi possível reverter.')
      setLoading(false)
    }
  }

  const consequence =
    t.type === 'deposit'
      ? `${formatCents(t.amount)} sairão do seu saldo.`
      : `${formatCents(t.amount)} voltam para o seu saldo e saem do saldo de @${t.counterpart} (que pode ficar negativo).`

  return (
    <div className="flex flex-col gap-4 border-t border-line pt-5">
      <p className="flex items-center gap-2 text-[13px] text-muted">
        <CalendarClock className="size-4 text-accent" />
        Você pode reverter até <span className="font-medium text-fg">{deadline}</span>
      </p>

      {!confirming ? (
        <div className="flex justify-end">
          <Button variant="danger" icon={<RotateCcw className="size-4" />} onClick={() => setConfirming(true)}>
            Reverter
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <label htmlFor={`reason-${t.id}`} className="text-[13px] font-medium">
              Motivo da reversão (opcional)
            </label>
            <textarea
              id={`reason-${t.id}`}
              rows={3}
              maxLength={255}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Ex.: enviei para a pessoa errada"
              className="w-full resize-none rounded-field border border-line-strong bg-surface-2/60 px-3.5 py-3 text-[14px] text-fg outline-none placeholder:text-subtle focus:border-accent/70 focus:shadow-[0_0_0_4px_rgba(138,180,255,0.12)]"
            />
            <p className="text-[12px] text-subtle">{reason.length}/255 · fica registrado no histórico da operação.</p>
          </div>
          <Alert tone="warning">{consequence} A reversão não pode ser desfeita.</Alert>
          <Alert tone="error">{error}</Alert>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirming(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button variant="danger" loading={loading} loadingText="Revertendo" onClick={() => void handleReverse()}>
              Confirmar reversão
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function Note({ children }: { children: ReactNode }) {
  return <p className="rounded-field border border-line bg-surface-2/40 px-4 py-3 text-[13px] text-muted">{children}</p>
}
