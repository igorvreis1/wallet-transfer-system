import type { Transaction, User } from '../types/api'
import { formatDateTime } from './date'
import { formatCents } from './money'

/** O que o comprovante precisa saber, além da transação. */
export interface ReceiptContext {
  me: Pick<User, 'nickname'>
  /** Email mascarado do destinatário, quando a transferência acabou de ser feita (null se oculto) */
  counterpartEmailMasked?: string | null
}

export function receiptTitle(t: Transaction): string {
  if (t.type === 'deposit') return 'Comprovante de depósito'
  if (t.type === 'reversal') return 'Comprovante de estorno'
  return 'Comprovante de transferência'
}

export function receiptFileName(t: Transaction): string {
  return `comprovante-wallet-easy-${t.id}.pdf`
}

/** Texto curto para acompanhar o arquivo (e para o link do WhatsApp). */
export function receiptShareText(t: Transaction, { me }: ReceiptContext): string {
  const value = formatCents(t.amount)
  const when = formatDateTime(t.created_at)
  if (t.type === 'deposit') return `Comprovante Wallet Easy: depósito de ${value} em ${when}.`
  const from = t.direction === 'out' ? me.nickname : t.counterpart
  const to = t.direction === 'out' ? t.counterpart : me.nickname
  return `Comprovante Wallet Easy: ${t.type === 'reversal' ? 'estorno' : 'transferência'} de ${value} de @${from} para @${to} em ${when}. Operação #${t.id}.`
}

/**
 * Gera o PDF do comprovante no próprio navegador.
 * O jsPDF é carregado só quando alguém pede um comprovante (import dinâmico = app mais leve).
 */
export async function buildReceiptPdf(t: Transaction, ctx: ReceiptContext): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a5' }) // 148 x 210 mm, tamanho de comprovante
  // Título que aparece na aba do navegador ao abrir o PDF
  doc.setProperties({ title: `${receiptTitle(t)} #${t.id} · Wallet Easy`, author: 'Wallet Easy' })
  const W = 148
  const M = 14 // margem

  // Faixa superior escura com a marca
  doc.setFillColor(10, 10, 11)
  doc.rect(0, 0, W, 30, 'F')
  doc.setFillColor(237, 237, 237)
  doc.roundedRect(M, 9, 12, 12, 3, 3, 'F')
  doc.setDrawColor(10, 10, 11)
  doc.setLineWidth(0.8)
  doc.roundedRect(M + 3, 13, 6, 4.5, 1, 1, 'S')
  doc.setFillColor(59, 111, 224) // o pontinho azul da marca
  doc.circle(M + 7.3, 15.25, 0.75, 'F')
  doc.setTextColor(237, 237, 237)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('wallet', M + 16, 17.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(139, 139, 148)
  doc.text('easy', M + 16 + doc.getTextWidth('wallet ') + 0.5, 17.5)
  doc.setFontSize(8)
  doc.text(formatDateTime(t.created_at), W - M, 17.5, { align: 'right' })

  // Título e valor
  let y = 46
  doc.setTextColor(90, 90, 98)
  doc.setFontSize(10)
  doc.text(receiptTitle(t).toUpperCase(), M, y)
  y += 12
  doc.setTextColor(10, 10, 11)
  doc.setFont('courier', 'bold')
  doc.setFontSize(26)
  doc.text(formatCents(t.amount), M, y)
  y += 6
  if (t.status === 'reversed') {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(180, 120, 0)
    doc.text('Esta operação foi revertida.', M, y + 2)
    y += 4
  }

  // Linhas de detalhe
  y += 8
  const from = t.type === 'deposit' ? null : t.direction === 'out' ? ctx.me.nickname : t.counterpart
  const to = t.type === 'deposit' ? ctx.me.nickname : t.direction === 'out' ? t.counterpart : ctx.me.nickname
  const rows: Array<[string, string]> = [
    ['Data e hora', formatDateTime(t.created_at)],
    ...(from ? ([['De', `@${from}`]] as Array<[string, string]>) : []),
    ['Para', `@${to}${ctx.counterpartEmailMasked && t.direction === 'out' ? `  (${ctx.counterpartEmailMasked})` : ''}`],
    ['Tipo', t.type_label],
    ...(t.payment_detail ? ([['Forma de pagamento', t.payment_detail]] as Array<[string, string]>) : []),
    ...(t.description ? ([['Mensagem', `"${t.description}"`]] as Array<[string, string]>) : []),
    ...(t.type === 'reversal' && t.reason ? ([['Motivo', t.reason]] as Array<[string, string]>) : []),
    ['Nº da operação', `#${t.id}`],
  ]

  doc.setDrawColor(225, 225, 230)
  doc.setLineWidth(0.2)
  for (const [label, value] of rows) {
    doc.line(M, y, W - M, y)
    y += 7
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(120, 120, 128)
    doc.text(label, M, y)
    doc.setTextColor(10, 10, 11)
    const lines = doc.splitTextToSize(value, 80) as string[]
    doc.text(lines, W - M, y, { align: 'right' })
    y += 4 + (lines.length - 1) * 4
  }
  doc.line(M, y, W - M, y)

  // Rodapé
  doc.setFontSize(7.5)
  doc.setTextColor(150, 150, 158)
  doc.text('Projeto de demonstração · os valores não são reais.', W / 2, 196, { align: 'center' })
  doc.text(`Autenticação: WE-${String(t.id).padStart(8, '0')}-${(t.created_at ?? '').replace(/\D/g, '').slice(0, 14)}`, W / 2, 200, {
    align: 'center',
  })

  return doc.output('blob')
}

export type ShareResult = 'shared' | 'downloaded' | 'cancelled'

/**
 * Compartilha o PDF pelo menu do sistema (no celular aparece o WhatsApp, no Windows o painel
 * de compartilhar). Se o navegador não suportar enviar arquivos, baixa o PDF.
 */
export async function shareReceipt(blob: Blob, t: Transaction, text: string): Promise<ShareResult> {
  const file = new File([blob], receiptFileName(t), { type: 'application/pdf' })

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: receiptTitle(t), text })
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
      // Qualquer outro erro: cai para o download
    }
  }

  downloadReceipt(blob, t)
  return 'downloaded'
}

/**
 * Abre o PDF numa aba nova, no leitor de PDF do próprio navegador (que já tem o botão de baixar e imprimir).
 * A aba precisa ser aberta NO CLIQUE (antes de gerar o PDF), senão o navegador bloqueia como pop-up.
 * Por isso quem chama abre a aba primeiro e passa aqui.
 */
export function showReceiptInTab(tab: Window | null, blob: Blob, t: Transaction): void {
  const url = URL.createObjectURL(blob)
  if (tab && !tab.closed) {
    tab.location.href = url
  } else {
    downloadReceipt(blob, t) // pop-up bloqueado: baixa direto
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export function downloadReceipt(blob: Blob, t: Transaction): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = receiptFileName(t)
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** Abre o WhatsApp (app ou web) com o texto do comprovante. Link não consegue anexar arquivo. */
export function whatsappLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}
