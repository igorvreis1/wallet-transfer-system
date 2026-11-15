import type { CardBrand } from '../types/api'

/**
 * Utilitários do número do cartão. Tudo roda SÓ no navegador:
 * o número completo é usado para validar e descobrir a bandeira, e depois é descartado.
 * Para a API vão apenas a bandeira e os 4 últimos dígitos (regra do PCI DSS).
 */

/** Só os dígitos: "4242 4242" → "42424242" */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * Algoritmo de Luhn: o dígito verificador que todo cartão tem.
 * Pega um número digitado errado (ex.: dois dígitos trocados) antes de enviar.
 */
export function isValidLuhn(digits: string): boolean {
  if (!/^\d{13,19}$/.test(digits)) return false
  let sum = 0
  let double = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i])
    if (double) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    double = !double
  }
  return sum % 10 === 0
}

/** Bandeira pelo início do número (faixas simplificadas). */
export function detectBrand(digits: string): CardBrand {
  if (/^(4011(78|79)|43(1274|8935)|45(1416|7393|763(1|2))|50(4175|6699|67[0-7][0-9]|9000)|627780|63(6297|6368)|650(0|4|5)|65165|65500)/.test(digits))
    return 'elo'
  if (/^(606282|3841)/.test(digits)) return 'hipercard'
  if (/^3[47]/.test(digits)) return 'amex'
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(digits)) return 'mastercard'
  if (/^4/.test(digits)) return 'visa'
  return 'other'
}

/** Quantos dígitos o cartão tem (Amex tem 15, os outros 16). */
export function cardLength(brand: CardBrand): number {
  return brand === 'amex' ? 15 : 16
}

/** Formata enquanto digita: "4242 4242 4242 4242" (Amex: "3782 822463 10005"). */
export function formatCardNumber(digits: string, brand: CardBrand): string {
  const groups = brand === 'amex' ? [4, 6, 5] : [4, 4, 4, 4]
  const parts: string[] = []
  let index = 0
  for (const size of groups) {
    if (index >= digits.length) break
    parts.push(digits.slice(index, index + size))
    index += size
  }
  return parts.join(' ')
}

/** "1229" → { month: 12, year: 2029 } (ou null se incompleto/inválido) */
export function parseExpiry(value: string): { month: number; year: number } | null {
  const digits = onlyDigits(value)
  if (digits.length !== 4) return null
  const month = Number(digits.slice(0, 2))
  const year = 2000 + Number(digits.slice(2))
  if (month < 1 || month > 12) return null
  return { month, year }
}

/** Formata a validade enquanto digita: "12" → "12/", "1229" → "12/29" */
export function formatExpiry(value: string): string {
  const digits = onlyDigits(value).slice(0, 4)
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits
}

export function isExpiryInPast(month: number, year: number, now = new Date()): boolean {
  const lastMoment = new Date(year, month, 0, 23, 59, 59) // dia 0 do mês seguinte = último dia deste
  return lastMoment < now
}
