/**
 * Datas no padrão brasileiro, sempre com o ano em 4 dígitos.
 * A API manda em ISO 8601 (UTC); o navegador converte para o fuso de quem está usando.
 */
const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })

/** "14/11/2026" */
export function formatDate(iso: string | null | undefined): string {
  return iso ? dateFormat.format(new Date(iso)) : ''
}

/** "14/11/2026 às 16:40" */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  return `${dateFormat.format(date)} às ${timeFormat.format(date)}`
}
