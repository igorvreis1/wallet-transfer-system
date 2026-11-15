import { ArrowLeft, ArrowUpRight, Check } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../../auth/useAuth'
import { api, ApiError } from '../../lib/api'
import { formatDateTime } from '../../lib/date'
import { formatCents } from '../../lib/money'
import type { OperationResponse, Recipient, Transaction } from '../../types/api'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { MoneyInput } from '../ui/MoneyInput'
import { Combobox } from '../ui/Combobox'
import { ReceiptActions } from './ReceiptActions'

type Step =
  | { name: 'form' }
  | { name: 'confirm'; recipient: Recipient }
  | { name: 'done'; recipient: Recipient; transaction: Transaction }

/**
 * Transferência em 2 passos + conclusão:
 *   1. valor + para quem (email ou nickname)
 *   2. confirmação: mostra quem vai receber (busca na API) antes de enviar o dinheiro
 *   ✓  concluída: resumo + comprovante em PDF para compartilhar (é comum transferir e já mandar)
 */
export function TransferPanel({
  onClose,
  onCompleted,
  balanceHidden = false,
}: {
  onClose: () => void
  onCompleted: () => void
  /** Saldo escondido pelo olhinho: as mensagens não podem revelar o valor */
  balanceHidden?: boolean
}) {
  const { user, setBalance } = useAuth()
  const [step, setStep] = useState<Step>({ name: 'form' })
  const [amount, setAmount] = useState(0)
  const [recipient, setRecipient] = useState('')
  const [message, setMessage] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])

  // Sugestões do campo "Para quem": pessoas com quem você já transacionou
  useEffect(() => {
    api<{ data: Array<{ nickname: string }> }>('/transactions/counterparts')
      .then(({ data }) => setSuggestions(data.map((person) => person.nickname)))
      .catch(() => setSuggestions([]))
  }, [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [localErrors, setLocalErrors] = useState<{ amount?: string; recipient?: string }>({})

  const balance = user?.balance ?? 0

  // Passo 1 → 2: valida aqui mesmo o que dá, e pergunta à API quem é o destinatário.
  async function handleReview(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const errors: typeof localErrors = {}
    if (amount <= 0) errors.amount = 'Digite um valor maior que zero.'
    else if (amount > balance)
      errors.amount = balanceHidden ? 'Saldo insuficiente.' : `Saldo insuficiente. Seu saldo atual é ${formatCents(balance)}.`
    if (!recipient.trim()) errors.recipient = 'Informe o email ou nickname de quem vai receber.'
    setLocalErrors(errors)
    if (Object.keys(errors).length > 0) return

    setLoading(true)
    try {
      const { data } = await api<{ data: Recipient }>('/users/lookup', { query: { identifier: recipient.trim() } })
      setStep({ name: 'confirm', recipient: data })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : null)
    } finally {
      setLoading(false)
    }
  }

  // Passo 2: agora sim, envia.
  async function handleConfirm() {
    if (step.name !== 'confirm') return
    setLoading(true)
    setError(null)
    try {
      const response = await api<OperationResponse>('/wallet/transfer', {
        method: 'POST',
        body: { recipient: step.recipient.nickname, amount, description: message.trim() || null },
      })
      setBalance(response.balance, response.balance_formatted)
      setStep({ name: 'done', recipient: step.recipient, transaction: response.transaction })
      onCompleted() // atualiza as últimas movimentações
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : null)
    } finally {
      setLoading(false)
    }
  }

  return (
    // Conteúdo da aba "Transferir" do card principal (a moldura e as abas ficam na Início)
    <div className="relative">
      <AnimatePresence mode="wait" initial={false}>
        {step.name === 'form' ? (
          <motion.form
            key="form"
            onSubmit={handleReview}
            noValidate
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-5"
          >
            <StepTitle step={1} title="Quanto e para quem?" />
            <div className="grid gap-5 md:grid-cols-2">
              <MoneyInput
                label="Valor"
                value={amount}
                autoFocus
                onChange={(cents) => {
                  setAmount(cents)
                  setLocalErrors((e) => ({ ...e, amount: undefined }))
                }}
                hint={balanceHint(amount, balance, balanceHidden)}
                error={localErrors.amount ?? error?.field('amount')}
              />
              {/* Select2 com sugestões de quem você já transacionou; aceita digitar qualquer nickname ou email */}
              <Combobox
                label="Para quem"
                freeText
                size="lg"
                options={suggestions}
                value={recipient || null}
                onChange={(value) => {
                  setRecipient(value ?? '')
                  setLocalErrors((e) => ({ ...e, recipient: undefined }))
                  setError(null)
                }}
                placeholder="nickname ou email"
                format={(nickname) => `@${nickname}`}
                hint={suggestions.length ? 'Digite o nickname ou email.' : 'Digite o nickname ou email.'}
                error={localErrors.recipient ?? (error && !error.field('amount') ? error.message : undefined)}
              />
            </div>
            <Field
              label="Mensagem (opcional)"
              placeholder="Ex.: almoço de sexta"
              maxLength={140}
              tooltip="Aparece para você e para quem recebe, no extrato e nos detalhes da transferência."
              hint={`${message.length}/140 caracteres`}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" loading={loading} loadingText="Buscando" icon={<ArrowUpRight className="size-4" />}>
                Transferir
              </Button>
            </div>
          </motion.form>
        ) : step.name === 'done' ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col gap-6"
          >
            <div className="flex items-center gap-4 pr-10">
              <span className="grid size-12 place-items-center rounded-full border border-in-line bg-in-soft text-in">
                <Check className="size-6" strokeWidth={2.5} />
              </span>
              <div>
                <h3 className="text-[17px] font-semibold">Transferência concluída</h3>
                <p className="text-[13px] text-subtle">{formatDateTime(step.transaction.created_at)}</p>
              </div>
            </div>

            <div className="grid gap-4 rounded-field border border-line-strong bg-surface-2/50 p-5 sm:grid-cols-2">
              <div>
                <p className="text-[12px] text-subtle">Valor enviado</p>
                <p className="money mt-1 text-[26px]">{formatCents(step.transaction.amount)}</p>
              </div>
              <div>
                <p className="text-[12px] text-subtle">Para</p>
                <p className="mt-1 text-[18px] font-medium">@{step.recipient.nickname}</p>
                <p className="text-[12px] text-subtle">Operação #{step.transaction.id}</p>
              </div>
              {step.transaction.description && (
                <div className="sm:col-span-2">
                  <p className="text-[12px] text-subtle">Mensagem</p>
                  <p className="mt-1 text-[14px] break-words text-fg/90">“{step.transaction.description}”</p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-line pt-5">
              <p className="text-[13px] text-muted">Envie o comprovante para quem recebeu:</p>
              <ReceiptActions transaction={step.transaction} counterpartEmailMasked={step.recipient.email_masked} />
            </div>

            <div className="flex justify-end">
              <Button variant="ghost" onClick={onClose}>
                Concluir
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-5"
          >
            <StepTitle step={2} title="Confira antes de enviar" />

            <div className="grid gap-4 rounded-field border border-line-strong bg-surface-2/50 p-5 sm:grid-cols-2">
              <div>
                <p className="text-[12px] text-subtle">Valor</p>
                <p className="money mt-1 text-[26px]">{formatCents(amount)}</p>
              </div>
              <div>
                <p className="text-[12px] text-subtle">Para</p>
                <p className="mt-1 text-[18px] font-medium">@{step.recipient.nickname}</p>
                <p className="text-[12px] text-subtle">{step.recipient.email_masked ?? 'email oculto'}</p>
              </div>
              {message.trim() && (
                <div className="sm:col-span-2">
                  <p className="text-[12px] text-subtle">Mensagem</p>
                  <p className="mt-1 text-[14px] break-words text-fg/90">“{message.trim()}”</p>
                </div>
              )}
            </div>

            <Alert tone="warning">
              Confira o destinatário. Se precisar, você pode reverter esta transferência em até 90 dias.
            </Alert>
            {/* Com o saldo oculto, a mensagem da API ("...seu saldo atual é R$ X") não pode aparecer inteira */}
            <Alert tone="error">
              {error ? (balanceHidden && error.message.startsWith('Saldo insuficiente') ? 'Saldo insuficiente.' : error.message) : null}
            </Alert>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" icon={<ArrowLeft className="size-4" />} onClick={() => setStep({ name: 'form' })} disabled={loading}>
                Voltar
              </Button>
              <Button loading={loading} loadingText="Transferindo" icon={<Check className="size-4" />} onClick={() => void handleConfirm()}>
                Confirmar transferência
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Frase embaixo do valor. Com o saldo escondido, nunca mostra o número:
 * só diz se o valor digitado cabe ou não no saldo.
 */
function balanceHint(amount: number, balance: number, hidden: boolean): string {
  if (!hidden) return `Disponível: ${formatCents(balance)}`
  if (amount === 0) return 'Seu saldo está oculto.'
  return amount <= balance ? '✓ Saldo suficiente' : 'Saldo insuficiente para este valor.'
}

function StepTitle({ step, title }: { step: number; title: string }) {
  return (
    <div className="flex items-center gap-3 pr-10">
      <span className="grid size-7 place-items-center rounded-full border border-accent-line bg-accent-soft text-[12px] font-semibold text-accent">
        {step}
      </span>
      <h3 className="text-[15px] font-medium">{title}</h3>
      <span className="text-[12px] text-subtle">Etapa {step} de 2</span>
    </div>
  )
}
