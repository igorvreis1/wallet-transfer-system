import { Alert } from '../components/ui/Alert'
import { Section } from '../components/ui/Section'
import { RecentTransactions } from '../components/wallet/RecentTransactions'
import { useTimedMessage } from '../lib/useTimedMessage'

/** Extrato. Provisório: na próxima etapa ganha filtros e paginação. */
export function StatementPage() {
  const [notice, setNotice] = useTimedMessage()

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight">Extrato</h1>
        <p className="mt-1 text-muted">Toque numa operação para ver os detalhes e, quando permitido, reverter.</p>
      </div>
      <Alert tone="success">{notice}</Alert>
      <Section title="Movimentações" description="As 15 mais recentes. Filtros e paginação chegam na próxima etapa.">
        <RecentTransactions refreshKey={0} limit={15} showLink={false} onChanged={setNotice} />
      </Section>
    </div>
  )
}
