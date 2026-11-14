import { Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useAuth } from '../../auth/useAuth'
import { api, ApiError } from '../../lib/api'
import { formatCents } from '../../lib/money'
import { useTimedMessage } from '../../lib/useTimedMessage'
import type { OperationResponse } from '../../types/api'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'
import { MoneyInput } from '../ui/MoneyInput'
import { Card } from '../ui/Section'

/** Depósito: valor com máscara e o botão alinhado à direita. */
export function DepositCard({ onDone }: { onDone: () => void }) {
  const { setBalance } = useAuth()
  const [amount, setAmount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useTimedMessage() // some sozinha após 5s

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    if (amount <= 0) {
      setError('Digite um valor maior que zero.')
      return
    }

    setLoading(true)
    try {
      const response = await api<OperationResponse>('/wallet/deposit', { method: 'POST', body: { amount } })
      setBalance(response.balance, response.balance_formatted)
      setSuccess(`Depósito de ${formatCents(amount)} realizado.`)
      setAmount(0)
      onDone()
    } catch (caught) {
      setError(caught instanceof ApiError ? (caught.field('amount') ?? caught.message) : 'Não foi possível depositar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="h-full">
      <form onSubmit={handleSubmit} noValidate className="flex h-full flex-col gap-4">
        <MoneyInput
          label="Valor"
          value={amount}
          onChange={(cents) => {
            setAmount(cents)
            setError(null)
            setSuccess(null)
          }}
          hint="Digite só os números: os centavos entram primeiro."
          error={error ?? undefined}
        />
        <Alert tone="success">{success}</Alert>
        <div className="mt-auto flex justify-end">
          <Button type="submit" variant="secondary" loading={loading} loadingText="Depositando" icon={<Plus className="size-4" />}>
            Depositar
          </Button>
        </div>
      </form>
    </Card>
  )
}
