import { ArrowUpRight, Plus } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { type ReactNode, useLayoutEffect, useRef, useState } from 'react'
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
  { id: 'deposit', label: 'Depositar', icon: Plus, path: '/depositar' },
  { id: 'transfer', label: 'Transferir', icon: ArrowUpRight, path: '/transferir' },
] as const

type Tab = (typeof tabs)[number]['id']

/** Curva suave: começa rápido e desacelera devagar no final. */
const smooth = [0.22, 1, 0.36, 1] as const

/**
 * Anima a altura até o tamanho do conteúdo sempre que ele muda (ex.: Depositar → Transferir).
 * Enquanto anima, corta o que passa da borda; parado, deixa as listas de sugestão saírem do card.
 */
function SmoothHeight({ children }: { children: ReactNode }) {
  const inner = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | 'auto'>('auto')
  const [animating, setAnimating] = useState(false)

  useLayoutEffect(() => {
    const el = inner.current
    if (!el) return
    const observer = new ResizeObserver(() => setHeight(el.offsetHeight))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <motion.div
      animate={{ height }}
      transition={{ duration: 0.5, ease: smooth }}
      onAnimationStart={() => setAnimating(true)}
      onAnimationComplete={() => setAnimating(false)}
      className={animating ? 'overflow-hidden' : undefined}
    >
      <div ref={inner}>{children}</div>
    </motion.div>
  )
}

function tabFromPath(pathname: string): Tab | null {
  if (pathname === '/depositar') return 'deposit'
  if (pathname === '/transferir') return 'transfer'
  return null // "/": só o resumo, nenhum bloco aberto
}

/**
 * Início em dois cards, um embaixo do outro:
 * 1. Uma "segunda header": Olá à esquerda, abas Depositar | Transferir no centro, saldo à direita.
 * 2. O bloco da aba escolhida. Começa oculto; cada aba tem a própria URL
 *    ("/depositar" e "/transferir"), então o "voltar" do navegador funciona.
 *    Clicar de novo na aba aberta fecha o bloco.
 */
export function HomePage() {
  const { user } = useAuth()
  const { balanceHidden } = useOutletContext<AppOutletContext>()
  const navigate = useNavigate()
  const tab = tabFromPath(useLocation().pathname)
  const [refreshKey, setRefreshKey] = useState(0)
  const [transferKey, setTransferKey] = useState(0) // muda → o formulário de transferência recomeça
  const [panelOpen, setPanelOpen] = useState(true) // o card de baixo terminou de abrir?

  if (!user) return null
  const reload = () => setRefreshKey((key) => key + 1)

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        {/* Card 1: a "segunda header" */}
        <motion.div {...enterFrom(0)}>
          <Card className="relative grid grid-cols-2 items-center gap-x-6 gap-y-6 overflow-hidden border-accent-line/70 bg-gradient-to-br from-[#141826] via-surface to-surface p-5 sm:p-6 lg:grid-cols-[1fr_auto_1fr]">
            <div aria-hidden="true" className="pointer-events-none absolute -top-24 -left-16 size-72 rounded-full bg-accent-strong/15 blur-3xl" />

            <h1 className="relative min-w-0 truncate text-[20px] font-semibold tracking-tight sm:text-[22px]">Olá, @{user.nickname}</h1>

            {/* Abas: no celular vão para a linha de baixo, ocupando a largura toda */}
            <div
              role="tablist"
              aria-label="Ações"
              className="relative col-span-2 inline-flex justify-self-center rounded-full border border-line bg-surface-2/50 p-1 lg:col-span-1 lg:col-start-2 lg:row-start-1"
            >
              {tabs.map(({ id, label, icon: Icon, path }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  aria-controls="home-panel"
                  // Clicar na aba que já está aberta fecha o bloco
                  onClick={() => navigate(tab === id ? '/' : path)}
                  className={cn(
                    'relative inline-flex items-center gap-2 rounded-full px-5 py-2 text-[13px] font-medium transition-colors duration-200',
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

            <div className="relative col-start-2 row-start-1 min-w-0 text-right lg:col-start-3">
              <p className="text-[12px] text-muted">Saldo disponível</p>
              <p className="mt-1 text-[26px] leading-none font-medium sm:text-[30px]">
                <AnimatedBalance cents={user.balance} hidden={balanceHidden} variant="hero" />
              </p>
            </div>

            {user.balance < 0 && !balanceHidden && (
              <p className="relative col-span-2 text-right text-[12px] text-warn lg:col-span-3">
                Saldo negativo: o próximo valor que entrar quita a dívida primeiro.
              </p>
            )}
          </Card>
        </motion.div>

        {/* Card 2: depósito ou transferência. Fica oculto até escolher uma aba.
            Abrir/fechar: o card "desdobra" de altura 0 até o tamanho do conteúdo. */}
        <AnimatePresence initial={false}>
          {tab && (
            <motion.div
              key="home-panel"
              initial={{ height: 0, opacity: 0, marginTop: -16 }}
              animate={{ height: 'auto', opacity: 1, marginTop: 0 }}
              exit={{ height: 0, opacity: 0, marginTop: -16 }}
              transition={{ duration: 0.6, ease: smooth }}
              // Corta só durante a animação; aberto, libera para as listas de sugestão passarem da borda
              onAnimationStart={() => setPanelOpen(false)}
              onAnimationComplete={() => setPanelOpen(true)}
              className={panelOpen ? undefined : 'overflow-hidden'}
            >
              <Card className="p-5 sm:p-8">
                <SmoothHeight>
                  {/* Trocar de aba: o conteúdo antigo some, a altura se ajusta e o novo aparece */}
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={tab}
                      id="home-panel"
                      role="tabpanel"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0, transition: { duration: 0.45, ease: smooth, delay: 0.05 } }}
                      exit={{ opacity: 0, y: -6, transition: { duration: 0.25, ease: 'easeIn' } }}
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
                </SmoothHeight>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Section order={1} title="Últimas movimentações">
        {/* Reversão: o aviso aparece dentro do pop-up; aqui só atualiza o resto da tela */}
        <RecentTransactions refreshKey={refreshKey} onChanged={reload} />
      </Section>
    </div>
  )
}
