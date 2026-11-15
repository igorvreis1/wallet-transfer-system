import { motion } from 'motion/react'
import { enterFrom } from '../lib/motion'
import { Section } from '../components/ui/Section'
import { RecentTransactions } from '../components/wallet/RecentTransactions'

/** Extrato. Provisório: na próxima etapa ganha filtros e paginação. */
export function StatementPage() {
  return (
    <div className="flex flex-col gap-10">
      <motion.div {...enterFrom(0)}>
        <h1 className="text-[26px] font-semibold tracking-tight">Extrato</h1>
        <p className="mt-1 text-muted">Toque numa operação para ver os detalhes e, quando permitido, reverter.</p>
      </motion.div>
      <Section order={1} title="Movimentações" description="As 15 mais recentes. Filtros e paginação chegam na próxima etapa.">
        <RecentTransactions refreshKey={0} limit={15} showLink={false} />
      </Section>
    </div>
  )
}
