import { ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { api } from '../../lib/api'
import type { Paginated, Transaction } from '../../types/api'
import { Card } from '../ui/Section'
import { Spinner } from '../ui/Spinner'
import { TransactionDetails } from './TransactionDetails'
import { TransactionRow } from './TransactionRow'

/**
 * As movimentações mais recentes. Clicar numa linha abre o pop-up de detalhes (e reversão).
 * "refreshKey" muda → recarrega (depois de depositar/transferir).
 */
export function RecentTransactions({
  refreshKey,
  limit = 5,
  showLink = true,
  onChanged,
}: {
  refreshKey: number
  limit?: number
  showLink?: boolean
  /** Chamado depois de uma reversão, com a mensagem de sucesso. */
  onChanged?: (message: string) => void
}) {
  const [items, setItems] = useState<Transaction[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [selected, setSelected] = useState<Transaction | null>(null)
  const [localKey, setLocalKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    api<Paginated<Transaction>>('/transactions', { signal: controller.signal })
      .then((page) => {
        setItems(page.data.slice(0, limit))
        setFailed(false)
      })
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setFailed(true)
      })
    return () => controller.abort()
  }, [refreshKey, localKey, limit])

  return (
    <Card className="py-2 sm:py-2">
      {items === null && !failed && (
        <div className="grid place-items-center py-10 text-muted">
          <Spinner className="size-5" />
        </div>
      )}
      {failed && <p className="py-8 text-center text-[13px] text-out">Não foi possível carregar suas movimentações.</p>}
      {items?.length === 0 && (
        <div className="py-10 text-center">
          <p className="text-[14px]">Nenhuma movimentação ainda</p>
          <p className="mt-1 text-[13px] text-subtle">Faça um depósito para começar.</p>
        </div>
      )}
      {items && items.length > 0 && (
        <>
          <div className="divide-y divide-line">
            {items.map((t) => (
              <TransactionRow key={t.id} t={t} onOpen={setSelected} />
            ))}
          </div>
          {showLink && (
            <div className="border-t border-line py-3 text-right">
              <Link to="/extrato" className="inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-fg">
                Ver extrato completo <ArrowRight className="size-3.5" />
              </Link>
            </div>
          )}
        </>
      )}

      <TransactionDetails
        transaction={selected}
        onClose={() => setSelected(null)}
        onReversed={(message) => {
          setSelected(null)
          setLocalKey((key) => key + 1)
          onChanged?.(message)
        }}
      />
    </Card>
  )
}
