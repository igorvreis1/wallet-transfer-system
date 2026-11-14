/**
 * Dinheiro no frontend também é INTEIRO EM CENTAVOS (igual à API). Nada de float.
 * 123456 → "1.234,56"
 */
export function formatCents(cents: number, { withSymbol = true } = {}): string {
  const negative = cents < 0
  const abs = Math.abs(Math.trunc(cents))
  const reais = Math.floor(abs / 100).toLocaleString('pt-BR')
  const centavos = String(abs % 100).padStart(2, '0')
  const value = `${reais},${centavos}`

  return `${negative ? '-' : ''}${withSymbol ? 'R$ ' : ''}${value}`
}

/** Limite por operação, o mesmo da API (R$ 1.000.000,00). */
export const MAX_AMOUNT_CENTS = 100_000_000
