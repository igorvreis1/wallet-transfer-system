import { Check, Copy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatDate } from '../../lib/date'
import { formatCents } from '../../lib/money'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { BrandMark } from './BrandMark'

/**
 * Boleto SIMULADO: mostra a linha digitável, um código de barras ilustrativo e o vencimento.
 * Ao clicar em "Já paguei", o depósito é confirmado na API.
 * (Num banco real, o boleto só compensaria em até 3 dias úteis.)
 */
export function BoletoModal({
  open,
  amount,
  loading,
  error,
  onClose,
  onConfirm,
}: {
  open: boolean
  amount: number
  loading: boolean
  error: string | null
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <Modal open={open} onClose={onClose} title="Depósito por boleto">
      {open && <BoletoContent amount={amount} loading={loading} error={error} onConfirm={onConfirm} />}
    </Modal>
  )
}

function BoletoContent({ amount, loading, error, onConfirm }: { amount: number; loading: boolean; error: string | null; onConfirm: () => void }) {
  // Dados fictícios gerados uma vez por boleto
  const [{ line, dueDate }] = useState(() => {
    const random = (size: number) => Array.from({ length: size }, () => Math.floor(Math.random() * 10)).join('')
    const value = String(amount).padStart(10, '0')
    const digits = `00190${random(5)}${random(11)}${random(11)}${random(1)}${'9999'}${value}` // 47 dígitos
    const due = new Date()
    due.setDate(due.getDate() + 3)
    return { line: digits, dueDate: due.toISOString() }
  })
  const [copied, setCopied] = useState(false)

  // Formato da linha digitável: 00190.00009 01234.567890 12345.678901 2 99990000015000
  const formatted = `${line.slice(0, 5)}.${line.slice(5, 10)} ${line.slice(10, 15)}.${line.slice(15, 21)} ${line.slice(21, 26)}.${line.slice(26, 32)} ${line.slice(32, 33)} ${line.slice(33)}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(line)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      /* sem permissão de área de transferência */
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex items-center gap-3 pr-8">
        <BrandMark brand="boleto" className="scale-125" />
        <div>
          <h3 className="text-[17px] font-semibold">Pague o boleto</h3>
          <p className="text-[13px] text-subtle">Use a linha digitável no app do seu banco.</p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 rounded-field bg-white px-4 py-5">
        <FakeBarcode value={line} />
        <p className="money text-center text-[11px] break-all text-[#0a0a0b]">{formatted}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-field border border-line-strong bg-surface-2/50 p-4">
        <div>
          <p className="text-[12px] text-subtle">Valor</p>
          <p className="money mt-1 text-[20px]">{formatCents(amount)}</p>
        </div>
        <div>
          <p className="text-[12px] text-subtle">Vencimento</p>
          <p className="money mt-1 text-[20px]">{formatDate(dueDate)}</p>
        </div>
      </div>

      <div className="grid min-w-0 gap-1.5">
        <p className="text-[13px] font-medium">Linha digitável</p>
        <div className="flex min-w-0 items-center gap-3 overflow-hidden rounded-field border border-line-strong bg-surface-2/60 p-2 pl-3.5">
          <span className="money min-w-0 flex-1 truncate text-[12px] text-muted" title={formatted}>
            {formatted.slice(0, 24)}…
          </span>
          <Button variant="secondary" className="shrink-0" icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />} onClick={() => void copy()}>
            {copied ? 'Copiado' : 'Copiar'}
          </Button>
        </div>
        <p className="text-[11px] text-subtle">Boleto ilustrativo · projeto de demonstração</p>
      </div>

      <Alert tone="error">{error}</Alert>

      <div className="flex justify-end">
        <Button size="lg" loading={loading} loadingText="Confirmando" icon={<Check className="size-4" />} onClick={onConfirm}>
          Já paguei
        </Button>
      </div>
    </div>
  )
}

/** Código de barras fictício: barras de larguras variadas, sempre iguais para a mesma linha. */
function FakeBarcode({ value }: { value: string }) {
  const bars = useMemo(() => {
    let x = 0
    const result: Array<{ x: number; w: number }> = []
    for (const char of value + value) {
      const digit = Number(char)
      const w = digit % 3 === 0 ? 2 : 1
      result.push({ x, w })
      x += w + 1 + (digit % 2)
    }
    return { result, width: x }
  }, [value])

  return (
    <svg viewBox={`0 0 ${bars.width} 40`} preserveAspectRatio="none" className="h-14 w-full" role="img" aria-label="Código de barras ilustrativo">
      {bars.result.map((bar) => (
        <rect key={bar.x} x={bar.x} y={0} width={bar.w} height={40} fill="#0a0a0b" />
      ))}
    </svg>
  )
}
