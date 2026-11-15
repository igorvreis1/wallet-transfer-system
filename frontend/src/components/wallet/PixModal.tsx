import { Check, Copy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatCents } from '../../lib/money'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { BrandMark } from './BrandMark'

/**
 * Pix SIMULADO: mostra um QR Code e um "copia e cola" de mentira.
 * Ao clicar em "Já paguei", o depósito é confirmado na API.
 */
export function PixModal({
  open,
  amount,
  nickname,
  loading,
  error,
  onClose,
  onConfirm,
}: {
  open: boolean
  amount: number
  nickname: string
  loading: boolean
  error: string | null
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <Modal open={open} onClose={onClose} title="Depósito por Pix">
      {open && <PixContent amount={amount} nickname={nickname} loading={loading} error={error} onConfirm={onConfirm} />}
    </Modal>
  )
}

function PixContent({
  amount,
  nickname,
  loading,
  error,
  onConfirm,
}: {
  amount: number
  nickname: string
  loading: boolean
  error: string | null
  onConfirm: () => void
}) {
  // Código fictício no formato visual do Pix "copia e cola" (não é um BR Code válido)
  const [seed] = useState(() => Math.random().toString(36).slice(2, 10).toUpperCase())
  const code = `00020126580014BR.GOV.BCB.PIX0136walleteasy-${nickname}-${seed}5204000053039865406${(amount / 100).toFixed(2)}5802BR5911WALLET EASY6009SAO PAULO62070503***6304${seed.slice(0, 4)}`
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      /* sem permissão de área de transferência: a pessoa pode selecionar o texto */
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex items-center gap-3 pr-8">
        <BrandMark brand="pix" className="scale-125" />
        <div>
          <h3 className="text-[17px] font-semibold">Pague com Pix</h3>
          <p className="text-[13px] text-subtle">Escaneie o QR Code ou use o copia e cola.</p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="rounded-[14px] bg-white p-3">
          <FakeQrCode value={code} />
        </div>
        <p className="money text-[24px]">{formatCents(amount)}</p>
        <p className="text-[11px] text-subtle">QR Code ilustrativo · projeto de demonstração</p>
      </div>

      {/* min-w-0 em tudo: sem isso, o código (um texto enorme sem espaços) empurra a caixa para fora da tela */}
      <div className="grid min-w-0 gap-1.5">
        <p className="text-[13px] font-medium">Pix copia e cola</p>
        <div className="flex min-w-0 items-center gap-3 overflow-hidden rounded-field border border-line-strong bg-surface-2/60 p-2 pl-3.5">
          {/* Mostra só o começo da chave; o botão copia o código inteiro */}
          <span className="money min-w-0 flex-1 truncate text-[12px] text-muted" title={code}>
            {code.slice(0, 26)}…
          </span>
          <Button
            variant="secondary"
            className="shrink-0"
            icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            onClick={() => void copy()}
          >
            {copied ? 'Copiado' : 'Copiar'}
          </Button>
        </div>
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

const QR_SIZE = 25

/** Casas pretas do QR fictício: pseudoaleatórias, mas sempre iguais para o mesmo texto. */
function fakeQrCells(value: string): Array<[number, number]> {
  const size = QR_SIZE
  let hash = 2166136261
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  const random = () => {
    hash ^= hash << 13
    hash ^= hash >>> 17
    hash ^= hash << 5
    return (hash >>> 0) / 4294967296
  }
  // Área dos 3 quadrados de canto (fica livre para desenhá-los depois)
  const finder = (x: number, y: number) =>
    [
      [0, 0],
      [size - 7, 0],
      [0, size - 7],
    ].some(([fx, fy]) => x >= fx - 1 && x <= fx + 7 && y >= fy - 1 && y <= fy + 7)

  const filled: Array<[number, number]> = []
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!finder(x, y) && random() > 0.52) filled.push([x, y])
  return filled
}

/**
 * QR Code de mentira: um padrão 25x25 gerado a partir do texto (sempre igual para o mesmo texto),
 * com os 3 quadrados de canto que todo QR tem. Não é lido por câmeras, é só ilustrativo.
 */
function FakeQrCode({ value }: { value: string }) {
  const size = QR_SIZE
  const cells = useMemo(() => fakeQrCells(value), [value])

  const finderSquare = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width={7} height={7} fill="#0a0a0b" />
      <rect x={x + 1} y={y + 1} width={5} height={5} fill="#fff" />
      <rect x={x + 2} y={y + 2} width={3} height={3} fill="#0a0a0b" />
    </g>
  )

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="size-44" shapeRendering="crispEdges" role="img" aria-label="QR Code ilustrativo do Pix">
      {cells.map(([x, y]) => (
        <rect key={`${x}:${y}`} x={x} y={y} width={1} height={1} fill="#0a0a0b" />
      ))}
      {finderSquare(0, 0)}
      {finderSquare(size - 7, 0)}
      {finderSquare(0, size - 7)}
    </svg>
  )
}
