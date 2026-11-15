import { Pencil, Plus } from 'lucide-react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useAuth } from '../../auth/useAuth'
import { api, ApiError } from '../../lib/api'
import { cn } from '../../lib/cn'
import { formatCents } from '../../lib/money'
import { useTimedMessage } from '../../lib/useTimedMessage'
import type { Card as SavedCard, OperationResponse } from '../../types/api'
import { ButtonSlot } from '../ui/ButtonSlot'
import { Button } from '../ui/Button'
import { MoneyInput } from '../ui/MoneyInput'
import { BrandMark } from './BrandMark'
import { CardFormModal } from './CardFormModal'
import { BoletoModal } from './BoletoModal'
import { PixModal } from './PixModal'

type Method = { kind: 'pix' } | { kind: 'boleto' } | { kind: 'card'; card: SavedCard }

/**
 * Depósito: escolha a forma (Pix ou um cartão salvo), digite o valor e deposite.
 * Cada cartão tem a canetinha para editar; "+ Cartão" abre o cadastro.
 * Tudo simulado: não há cobrança real.
 */
export function DepositCard({ onDone }: { onDone: () => void }) {
  const { user, setBalance } = useAuth()
  const [amount, setAmount] = useState(0)
  const [cards, setCards] = useState<SavedCard[]>([])
  const [method, setMethod] = useState<Method>({ kind: 'pix' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useTimedMessage() // some sozinha após 5s
  // Pix e boleto abrem um pop-up (QR Code / linha digitável) antes de confirmar
  const [paying, setPaying] = useState<'pix' | 'boleto' | null>(null)
  const pixOpen = paying !== null
  const [editing, setEditing] = useState<{ open: boolean; card: SavedCard | null }>({ open: false, card: null })

  useEffect(() => {
    const controller = new AbortController()
    api<{ data: SavedCard[] }>('/cards', { signal: controller.signal })
      .then(({ data }) => setCards(data))
      .catch(() => {
        /* sem cartões: o Pix continua disponível */
      })
    return () => controller.abort()
  }, [])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    if (amount <= 0) {
      setError('Digite um valor maior que zero.')
      return
    }
    if (method.kind === 'pix' || method.kind === 'boleto') setPaying(method.kind) // primeiro mostra o QR Code / boleto
    else void deposit()
  }

  async function deposit() {
    setLoading(true)
    setError(null)
    try {
      const body = method.kind === 'card' ? { amount, method: 'card', card_id: method.card.id } : { amount, method: method.kind }
      const response = await api<OperationResponse>('/wallet/deposit', { method: 'POST', body })
      setBalance(response.balance, response.balance_formatted)
      setSuccess(`Depósito de ${formatCents(amount)} realizado (${response.transaction.payment_detail}).`)
      setAmount(0)
      setPaying(null)
      onDone()
    } catch (caught) {
      setError(caught instanceof ApiError ? (caught.field('amount') ?? caught.field('card_id') ?? caught.message) : 'Não foi possível depositar.')
    } finally {
      setLoading(false)
    }
  }

  const selectedCardId = method.kind === 'card' ? method.card.id : null

  return (
    // Conteúdo da aba "Depositar" do card principal (a moldura e as abas ficam na Início)
    <div>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <div className="grid gap-2">
          <p className="text-[13px] font-medium">Forma de pagamento</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Forma de pagamento">
            <MethodChip selected={method.kind === 'pix'} onSelect={() => setMethod({ kind: 'pix' })}>
              <BrandMark brand="pix" /> Pix
            </MethodChip>

            <MethodChip selected={method.kind === 'boleto'} onSelect={() => setMethod({ kind: 'boleto' })}>
              <BrandMark brand="boleto" /> Boleto
            </MethodChip>

            {cards.map((card) => (
              <MethodChip
                key={card.id}
                selected={selectedCardId === card.id}
                disabled={card.expired}
                onSelect={() => setMethod({ kind: 'card', card })}
                onEdit={() => setEditing({ open: true, card })}
                title={card.nickname ?? card.label}
              >
                <BrandMark brand={card.brand} />
                <span className="money">•••• {card.last4}</span>
                {card.expired && <span className="text-[11px] text-warn">vencido</span>}
              </MethodChip>
            ))}

            <button
              type="button"
              onClick={() => setEditing({ open: true, card: null })}
              className="inline-flex h-10 items-center gap-1.5 rounded-[10px] border border-dashed border-line-strong px-3 text-[13px] text-muted transition-colors hover:border-[#3a3a42] hover:text-fg"
            >
              <Plus className="size-4" /> Cartão
            </button>
          </div>
        </div>

        <MoneyInput
          label="Valor"
          value={amount}
          onChange={(cents) => {
            setAmount(cents)
            setError(null)
            setSuccess(null)
          }}
          hint="Digite só os números: os centavos entram primeiro."
          error={pixOpen ? undefined : (error ?? undefined)}
        />
        {/* Depois de depositar, o aviso aparece NO LUGAR do botão (e some em 5s, ou no "x") */}
        <ButtonSlot
          className="mt-auto"
          message={success ? { tone: 'success', text: success } : null}
          onClose={() => setSuccess(null)}
        >
          <Button type="submit" variant="secondary" loading={loading && !pixOpen} loadingText="Depositando" icon={<Plus className="size-4" />}>
            Depositar
          </Button>
        </ButtonSlot>
      </form>

      <BoletoModal
        open={paying === 'boleto'}
        amount={amount}
        loading={loading}
        error={paying === 'boleto' ? error : null}
        onClose={() => setPaying(null)}
        onConfirm={() => void deposit()}
      />

      <PixModal
        open={paying === 'pix'}
        amount={amount}
        nickname={user?.nickname ?? ''}
        loading={loading}
        error={paying === 'pix' ? error : null}
        onClose={() => setPaying(null)}
        onConfirm={() => void deposit()}
      />

      <CardFormModal
        open={editing.open}
        card={editing.card}
        onClose={() => setEditing({ open: false, card: null })}
        onSaved={(saved) => {
          setCards((list) => (list.some((c) => c.id === saved.id) ? list.map((c) => (c.id === saved.id ? saved : c)) : [saved, ...list]))
          if (!saved.expired) setMethod({ kind: 'card', card: saved }) // já deixa o cartão escolhido
          setEditing({ open: false, card: null })
        }}
        onDeleted={(id) => {
          setCards((list) => list.filter((c) => c.id !== id))
          if (selectedCardId === id) setMethod({ kind: 'pix' })
          setEditing({ open: false, card: null })
        }}
      />
    </div>
  )
}

/** Uma opção de pagamento: Pix ou um cartão (com a canetinha para editar). */
function MethodChip({
  selected,
  disabled,
  onSelect,
  onEdit,
  title,
  children,
}: {
  selected: boolean
  disabled?: boolean
  onSelect: () => void
  onEdit?: () => void
  title?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex h-10 items-center rounded-[10px] border text-[13px] transition-colors',
        selected ? 'border-accent/70 bg-accent-soft text-fg shadow-[0_0_0_3px_rgba(138,180,255,0.10)]' : 'border-line-strong text-muted hover:border-[#3a3a42] hover:text-fg',
        disabled && 'opacity-60',
      )}
    >
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        disabled={disabled}
        onClick={onSelect}
        title={disabled ? 'Cartão vencido: edite a validade' : title}
        className="inline-flex h-full items-center gap-2 pr-2 pl-2.5 disabled:cursor-not-allowed"
      >
        {children}
      </button>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          aria-label="Editar cartão"
          className="grid h-full place-items-center border-l border-line-strong/70 px-2 text-subtle transition-colors hover:text-fg"
        >
          <Pencil className="size-3.5" />
        </button>
      )}
    </span>
  )
}
