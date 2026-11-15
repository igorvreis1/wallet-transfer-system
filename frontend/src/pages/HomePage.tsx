import { ArrowUpRight, Plus } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { useLocation, useNavigate, useOutletContext } from 'react-router'
import { useAuth } from '../auth/useAuth'
import type { AppOutletContext } from '../components/layout/BalanceVisibility'
import { Card, Section } from '../components/ui/Section'
import { AnimatedBalance } from '../components/wallet/AnimatedBalance'
import { DepositCard } from '../components/wallet/DepositCard'
import { RecentTransactions } from '../components/wallet/RecentTransactions'
import { TransferPanel } from '../components/wallet/TransferPanel'
import { cn } from '../lib/cn'
import { enterFrom } from '../lib/motion'

const tabs = [
  { id: 'deposit', label: 'Depositar', icon: Plus, path: '/' },
  { id: 'transfer', label: 'Transferir', icon: ArrowUpRight, path: '/transferir' },
] as const

/**
 * Início: UM card grande com o saldo de um lado e as abas Depositar | Transferir do outro.
 * Cada aba tem a própria URL ("/" e "/transferir"), então o "voltar" do navegador funciona.
 */
export function HomePage() {
  const { user } = useAuth()
  const { balanceHidden } = useOutletContext<AppOutletContext>()
  const navigate = useNavigate()
  const tab = useLocation().pathname === '/transferir' ? 'transfer' : 'deposit'
  const [refreshKey, setRefreshKey] = useState(0)
  const [transferKey, setTransferKey] = useState(0) // muda → o formulário de transferência recomeça

  if (!user) return null
  const reload = () => setRefreshKey((key) => key + 1)

  return (
    <div className="flex flex-col gap-10">
      <motion.div {...enterFrom(0)}>
        {/* Sem overflow-hidden no card: as listas de sugestão precisam poder passar da borda */}
        <Card className="relative grid gap-8 border-accent-line/70 bg-gradient-to-br from-[#141826] via-surface to-surface p-6 sm:p-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-10">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-card">
            <div className="absolute -top-24 -left-16 size-72 rounded-full bg-accent-strong/15 blur-3xl" />
          </div>

          {/* Lado do saldo */}
          <div className="relative flex flex-col">
            <h1 className="text-[22px] font-semibold tracking-tight">Olá, @{user.nickname}</h1>
            <p className="mt-0.5 text-[13px] text-muted">Aqui está o resumo da sua carteira.</p>

            <div className="mt-10">
              <p className="text-[13px] text-muted">Saldo disponível</p>
              <p className="mt-2 text-[44px] leading-none font-medium sm:text-[52px]">
                <AnimatedBalance cents={user.balance} hidden={balanceHidden} variant="hero" />
              </p>
              {user.balance < 0 && !balanceHidden && (
                <p className="mt-3 text-[13px] text-warn">Saldo negativo: o próximo valor que entrar quita a dívida primeiro.</p>
              )}
            </div>
          </div>

          {/* Lado das ações: abas Depositar | Transferir */}
          <div className="relative flex min-w-0 flex-col gap-6 border-t border-line pt-8 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
            <div role="tablist" aria-label="Ações" className="inline-flex self-start rounded-full border border-line bg-surface-2/50 p-1">
              {tabs.map(({ id, label, icon: Icon, path }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => navigate(path)}
                  className={cn(
                    'relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-colors duration-200',
                    tab === id ? 'text-bg' : 'text-muted hover:text-fg',
                  )}
                >
                  {/* "Pílula" clara que desliza entre as abas */}
                  {tab === id && (
                    <motion.span
                      layoutId="home-tab"
                      className="absolute inset-0 rounded-full bg-fg"
                      transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                    />
                  )}
                  <Icon className="relative size-4" />
                  <span className="relative">{label}</span>
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={tab}
                role="tabpanel"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                {tab === 'deposit' ? (
                  <DepositCard onDone={reload} />
                ) : (
                  // Cancelar/Concluir recomeçam o formulário, ficando na aba
                  <TransferPanel
                    key={transferKey}
                    onClose={() => setTransferKey((key) => key + 1)}
                    onCompleted={reload}
                    balanceHidden={balanceHidden}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </Card>
      </motion.div>

      <Section order={1} title="Últimas movimentações">
        {/* Reversão: o aviso aparece dentro do pop-up; aqui só atualiza o resto da tela */}
        <RecentTransactions refreshKey={refreshKey} onChanged={reload} />
      </Section>
    </div>
  )
}
