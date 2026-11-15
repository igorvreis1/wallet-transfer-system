import { ArrowRight } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { api } from '../../lib/api'
import { ease } from '../../lib/motion'
import type { Paginated, Transaction } from '../../types/api'
import { Card } from '../ui/Section'
import { LoadingText } from '../ui/LoadingText'
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
  /** Chamado depois de uma reversão (para atualizar o resto da tela). */
  onChanged?: () => void
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
        <div className="grid place-items-center py-10">
          <LoadingText text="Carregando movimentações" />
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
            {/* Linhas surgem uma depois da outra (fade + leve subida) */}
            {items.map((t, index) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease, delay: Math.min(index, 10) * 0.06 }}
              >
                <TransactionRow t={t} onOpen={setSelected} />
              </motion.div>
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
        onReversed={() => {
          // O pop-up continua aberto mostrando o aviso; a lista atrás já se atualiza
          setLocalKey((key) => key + 1)
          onChanged?.()
        }}
      />
    </Card>
  )
}
