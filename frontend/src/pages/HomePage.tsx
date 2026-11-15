import { ArrowUpRight } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { useLocation, useNavigate, useOutletContext } from 'react-router'
import { useAuth } from '../auth/useAuth'
import type { AppOutletContext } from '../components/layout/BalanceVisibility'
import { AnimatedBalance } from '../components/wallet/AnimatedBalance'
import { Button } from '../components/ui/Button'
import { Card, Section } from '../components/ui/Section'
import { DepositCard } from '../components/wallet/DepositCard'
import { RecentTransactions } from '../components/wallet/RecentTransactions'
import { TransferPanel } from '../components/wallet/TransferPanel'
import { enterFrom } from '../lib/motion'

/**
 * Início. A aba "Transferir" (/transferir) é esta mesma tela com o bloco de transferência aberto,
 * entre a primeira linha (saldo + depósito) e as últimas movimentações.
 */
export function HomePage() {
  const { user } = useAuth()
  const { balanceHidden } = useOutletContext<AppOutletContext>()
  const navigate = useNavigate()
  const transferOpen = useLocation().pathname === '/transferir'
  const [refreshKey, setRefreshKey] = useState(0)

  if (!user) return null
  const reload = () => setRefreshKey((key) => key + 1)

  return (
    <div className="flex flex-col gap-10">
      <motion.div {...enterFrom(0)}>
        <h1 className="text-[26px] font-semibold tracking-tight">Olá, @{user.nickname}</h1>
        <p className="mt-1 text-muted">Aqui está o resumo da sua carteira.</p>
      </motion.div>

      {/* Linha 1: saldo + depósito */}
      <div className="grid gap-10 lg:grid-cols-[1.35fr_1fr] lg:gap-6">
        <Section order={1} title="Saldo disponível" description="Atualizado a cada operação.">
          <Card className="relative h-full overflow-hidden border-accent-line/70 bg-gradient-to-br from-[#141826] to-surface">
            <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-accent-strong/15 blur-3xl" />
            <p className="relative text-[44px] leading-none font-medium sm:text-[52px]">
              <AnimatedBalance cents={user.balance} hidden={balanceHidden} variant="hero" />
            </p>
            {user.balance < 0 && !balanceHidden && (
              <p className="relative mt-3 text-[13px] text-warn">Saldo negativo: o próximo valor que entrar quita a dívida primeiro.</p>
            )}
            <div className="relative mt-8 flex justify-end">
              <Button
                icon={<ArrowUpRight className="size-4" />}
                disabled={transferOpen}
                onClick={() => navigate('/transferir')}
              >
                Transferir
              </Button>
            </div>
          </Card>
        </Section>

        <Section order={2} title="Depositar" description="O valor entra na hora no seu saldo.">
          <DepositCard onDone={reload} />
        </Section>
      </div>

      {/* Bloco de transferência: abre entre a primeira linha e as movimentações */}
      <AnimatePresence initial={false}>
        {transferOpen && (
          <motion.div
            key="transfer"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <Section title="Transferir" description="Por nickname ou email, com confirmação antes de enviar.">
              {/* Ao concluir, o bloco continua aberto mostrando o comprovante; "Concluir" fecha. */}
              <TransferPanel onClose={() => navigate('/')} onCompleted={reload} balanceHidden={balanceHidden} />
            </Section>
          </motion.div>
        )}
      </AnimatePresence>

      <Section order={3} title="Últimas movimentações">
        {/* Reversão: o aviso aparece dentro do pop-up; aqui só atualiza o resto da tela */}
        <RecentTransactions refreshKey={refreshKey} onChanged={reload} />
      </Section>
    </div>
  )
}
