import { Download, MessageCircle, Share2 } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { cn } from '../../lib/cn'
import { buildReceiptPdf, downloadReceipt, receiptShareText, shareReceipt, whatsappLink } from '../../lib/receipt'
import { useTimedMessage } from '../../lib/useTimedMessage'
import type { Transaction } from '../../types/api'
import { Button } from '../ui/Button'

/**
 * Botões do comprovante:
 *  - Compartilhar: menu do sistema com o PDF (no celular, o WhatsApp aparece na lista)
 *  - WhatsApp: abre a conversa com o resumo em texto
 *  - Baixar PDF
 */
export function ReceiptActions({
  transaction,
  counterpartEmailMasked,
  className,
}: {
  transaction: Transaction
  counterpartEmailMasked?: string | null
  className?: string
}) {
  const { user } = useAuth()
  const [busy, setBusy] = useState<'share' | 'download' | null>(null)
  const [feedback, setFeedback] = useTimedMessage()

  if (!user) return null
  const ctx = { me: user, counterpartEmailMasked }
  const text = receiptShareText(transaction, ctx)

  async function handleShare() {
    setBusy('share')
    try {
      const result = await shareReceipt(await buildReceiptPdf(transaction, ctx), transaction, text)
      if (result === 'downloaded') setFeedback('Seu navegador não envia arquivos direto: o PDF foi baixado para você anexar.')
    } finally {
      setBusy(null)
    }
  }

  async function handleDownload() {
    setBusy('download')
    try {
      downloadReceipt(await buildReceiptPdf(transaction, ctx), transaction)
      setFeedback('Comprovante baixado.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" icon={<Download className="size-4" />} loading={busy === 'download'} loadingText="Gerando" onClick={() => void handleDownload()}>
          Baixar PDF
        </Button>
        <a
          href={whatsappLink(text)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center gap-2 rounded-full border border-line-strong bg-white/[0.04] px-4 text-[13px] font-medium text-fg transition-colors hover:border-[#3a3a42] hover:bg-white/[0.07]"
        >
          <MessageCircle className="size-4" /> WhatsApp
        </a>
        <Button icon={<Share2 className="size-4" />} loading={busy === 'share'} loadingText="Gerando" onClick={() => void handleShare()}>
          Compartilhar comprovante
        </Button>
      </div>
      {feedback && <p className="text-right text-[12px] text-subtle">{feedback}</p>}
    </div>
  )
}
