import { FilterX } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { Button } from '../components/ui/Button'
import { Combobox } from '../components/ui/Combobox'
import { DateInput } from '../components/ui/DateInput'
import { LoadingText } from '../components/ui/LoadingText'
import { Card } from '../components/ui/Section'
import { TransactionDetails } from '../components/wallet/TransactionDetails'
import { TransactionRow } from '../components/wallet/TransactionRow'
import { api, ApiError } from '../lib/api'
import { cn } from '../lib/cn'
import { ease, enterFrom } from '../lib/motion'
import type { Paginated, Transaction, TransactionType } from '../types/api'

interface Filters {
  from: string // AAAA-MM-DD (o formato que a API espera; a tela mostra dd/mm/aaaa)
  to: string
  counterpart: string | null
  type: TransactionType | null
  direction: 'in' | 'out' | null
}

const noFilters: Filters = { from: '', to: '', counterpart: null, type: null, direction: null }

const typeOptions: Array<{ value: TransactionType | null; label: string }> = [
  { value: null, label: 'Todos' },
  { value: 'deposit', label: 'Depósitos' },
  { value: 'transfer', label: 'Transferências' },
  { value: 'reversal', label: 'Reversões' },
]

const directionOptions: Array<{ value: 'in' | 'out' | null; label: string }> = [
  { value: null, label: 'Tudo' },
  { value: 'in', label: 'Entradas' },
  { value: 'out', label: 'Saídas' },
]

/**
 * Extrato com filtros dinâmicos: cada mudança já busca de novo na API
 * (GET /api/transactions?from&to&counterpart&type&direction), sem botão de "aplicar".
 */
export function StatementPage() {
  const { refreshUser } = useAuth()
  const [filters, setFilters] = useState<Filters>(noFilters)
  const [counterparts, setCounterparts] = useState<string[]>([])
  // Resultado da última busca, marcado com os filtros que o geraram.
  // Se os filtros mudarem, o resultado antigo deixa de valer (= carregando), sem precisar zerar nada.
  const [result, setResult] = useState<{
    key: string
    items: Transaction[]
    meta: Paginated<Transaction>['meta'] | null
    error: ApiError | null
  } | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selected, setSelected] = useState<Transaction | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const hasFilters = JSON.stringify(filters) !== JSON.stringify(noFilters)
  const queryKey = JSON.stringify(filters) + ':' + reloadKey
  const current = result?.key === queryKey ? result : null
  const items = current ? current.items : null
  const meta = current?.meta ?? null
  const error = current?.error ?? null
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => setFilters((current) => ({ ...current, [key]: value }))

  // Pessoas com quem você já transacionou (opções do campo "Pessoa")
  useEffect(() => {
    api<{ data: Array<{ nickname: string }> }>('/transactions/counterparts')
      .then(({ data }) => setCounterparts(data.map((person) => person.nickname)))
      .catch(() => setCounterparts([]))
  }, [reloadKey])

  // Busca a 1ª página sempre que um filtro muda
  useEffect(() => {
    const controller = new AbortController()
    const key = JSON.stringify(filters) + ':' + reloadKey
    api<Paginated<Transaction>>('/transactions', { query: toQuery(filters), signal: controller.signal })
      .then((page) => setResult({ key, items: page.data, meta: page.meta, error: null }))
      .catch((caught) => {
        if (caught instanceof DOMException && caught.name === 'AbortError') return
        setResult({ key, items: [], meta: null, error: caught instanceof ApiError ? caught : null })
      })
    return () => controller.abort()
  }, [filters, reloadKey])

  async function loadMore() {
    if (!meta || meta.current_page >= meta.last_page) return
    setLoadingMore(true)
    try {
      const page = await api<Paginated<Transaction>>('/transactions', { query: { ...toQuery(filters), page: meta.current_page + 1 } })
      setResult((previous) => (previous ? { ...previous, items: [...previous.items, ...page.data], meta: page.meta } : previous))
    } finally {
      setLoadingMore(false)
    }
  }

  const dateError = error?.field('to') ?? error?.field('from')

  return (
    <div className="flex flex-col gap-8">
      <motion.div {...enterFrom(0)}>
        <h1 className="text-[26px] font-semibold tracking-tight">Extrato</h1>
        <p className="mt-1 text-muted">Filtre por período, pessoa e tipo. Toque numa operação para ver os detalhes.</p>
      </motion.div>

      {/* Filtros */}
      <motion.div {...enterFrom(1)}>
        <Card className="flex flex-col gap-5">
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_1.3fr]">
            <DateInput label="De" value={filters.from} max={filters.to || undefined} onChange={(value) => set('from', value)} />
            <DateInput label="Até" value={filters.to} min={filters.from || undefined} onChange={(value) => set('to', value)} />
            <Combobox
              label="Pessoa"
              options={counterparts}
              value={filters.counterpart}
              onChange={(value) => set('counterpart', value)}
              placeholder="Digite um nickname"
              emptyText={counterparts.length ? 'Ninguém com esse nome no seu histórico' : 'Você ainda não transacionou com ninguém'}
              format={(nickname) => `@${nickname}`}
            />
          </div>
          {dateError && <p className="-mt-2 text-[12px] text-out">{dateError}</p>}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-3">
              <Segmented label="Tipo" options={typeOptions} value={filters.type} onChange={(value) => set('type', value)} />
              <Segmented label="Direção" options={directionOptions} value={filters.direction} onChange={(value) => set('direction', value)} />
            </div>
            {hasFilters && (
              <Button variant="ghost" icon={<FilterX className="size-4" />} onClick={() => setFilters(noFilters)}>
                Limpar filtros
              </Button>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Resultado */}
      <motion.div {...enterFrom(2)} className="flex flex-col gap-3">
        <p className="px-1 text-[13px] text-subtle">
          {meta && items ? `${meta.total} ${meta.total === 1 ? 'operação' : 'operações'}${hasFilters ? ' com esses filtros' : ''}` : ' '}
        </p>
        <Card className="py-2 sm:py-2">
          {items === null && (
            <div className="grid place-items-center py-10">
              <LoadingText text="Buscando operações" />
            </div>
          )}
          {items?.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-[14px]">{hasFilters ? 'Nenhuma operação com esses filtros' : 'Nenhuma movimentação ainda'}</p>
              <p className="mt-1 text-[13px] text-subtle">{hasFilters ? 'Tente outro período ou limpe os filtros.' : 'Faça um depósito para começar.'}</p>
            </div>
          )}
          {items && items.length > 0 && (
            <div className="divide-y divide-line">
              {items.map((t, index) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease, delay: Math.min(index, 10) * 0.04 }}
                >
                  <TransactionRow t={t} onOpen={setSelected} />
                </motion.div>
              ))}
            </div>
          )}
          {meta && meta.current_page < meta.last_page && items && items.length > 0 && (
            <div className="flex justify-center border-t border-line py-3">
              <Button variant="secondary" loading={loadingMore} loadingText="Carregando" onClick={() => void loadMore()}>
                Carregar mais
              </Button>
            </div>
          )}
        </Card>
      </motion.div>

      <TransactionDetails
        transaction={selected}
        onClose={() => setSelected(null)}
        onReversed={() => {
          setReloadKey((key) => key + 1)
          void refreshUser() // atualiza o saldo do header
        }}
      />
    </div>
  )
}

/** Filtros → query string da API (só os que estão preenchidos) */
function toQuery(filters: Filters): Record<string, string | undefined> {
  return {
    from: filters.from || undefined,
    to: filters.to || undefined,
    counterpart: filters.counterpart ?? undefined,
    type: filters.type ?? undefined,
    direction: filters.direction ?? undefined,
  }
}

/** Grupo de opções em pílulas (uma escolhida por vez). */
function Segmented<T extends string | null>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-full border border-line bg-surface-2/40 p-1">
      {options.map((option) => (
        <button
          key={option.label}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-full px-3.5 py-1.5 text-[13px] transition-colors duration-200',
            option.value === value ? 'bg-white/[0.09] text-fg shadow-[inset_0_0_0_1px_#2a2a30]' : 'text-muted hover:text-fg',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
