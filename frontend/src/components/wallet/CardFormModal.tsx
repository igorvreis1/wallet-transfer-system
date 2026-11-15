import { Lock, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { api, ApiError } from '../../lib/api'
import { cardLength, detectBrand, formatCardNumber, formatExpiry, isExpiryInPast, isValidLuhn, onlyDigits, parseExpiry } from '../../lib/card'
import type { Card, CardBrand } from '../../types/api'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { Modal } from '../ui/Modal'
import { BrandMark } from './BrandMark'

/**
 * Cadastrar (card = null) ou editar um cartão (a "canetinha").
 * O número completo e o CVV ficam SÓ aqui no navegador: servem para validar
 * e descobrir a bandeira. Para a API vão a bandeira e os 4 últimos dígitos.
 *
 * Os campos usam autoComplete="off" (e não "cc-number", "cc-csc"...): em http://localhost,
 * sem HTTPS, o Chrome recusa o preenchimento de cartão e mostra um aviso em inglês por cima
 * do campo. Em produção, com HTTPS, os valores "cc-*" podem voltar para o navegador sugerir cartões.
 */
export function CardFormModal({
  open,
  card,
  onClose,
  onSaved,
  onDeleted,
}: {
  open: boolean
  card: Card | null
  onClose: () => void
  onSaved: (card: Card) => void
  onDeleted: (id: number) => void
}) {
  return (
    <Modal open={open} onClose={onClose} title={card ? 'Editar cartão' : 'Adicionar cartão'}>
      {open && <CardForm key={card?.id ?? 'new'} card={card} onSaved={onSaved} onDeleted={onDeleted} />}
    </Modal>
  )
}

function CardForm({ card, onSaved, onDeleted }: { card: Card | null; onSaved: (card: Card) => void; onDeleted: (id: number) => void }) {
  const editing = card !== null
  const [number, setNumber] = useState('')
  const [holder, setHolder] = useState(card?.holder_name ?? '')
  const [expiry, setExpiry] = useState(card ? card.expires.replace('/', '') : '')
  const [cvv, setCvv] = useState('')
  const [nickname, setNickname] = useState(card?.nickname ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const digits = onlyDigits(number)
  const brand: CardBrand = editing ? card.brand : detectBrand(digits)
  const last4 = editing ? card.last4 : digits.slice(-4)

  function validate(): Record<string, string> {
    const found: Record<string, string> = {}
    if (!editing) {
      if (digits.length < cardLength(brand)) found.number = 'Digite o número completo do cartão.'
      else if (!isValidLuhn(digits)) found.number = 'Número de cartão inválido. Confira os dígitos.'
      if (!/^\d{3,4}$/.test(cvv)) found.cvv = 'O CVV tem 3 dígitos (4 no Amex).'
    }
    if (holder.trim().length < 3) found.holder_name = 'Informe o nome impresso no cartão.'
    const exp = parseExpiry(expiry)
    if (!exp) found.exp_month = 'Validade no formato MM/AA.'
    else if (isExpiryInPast(exp.month, exp.year)) found.exp_month = 'Este cartão está vencido.'
    return found
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setApiError(null)
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return

    const exp = parseExpiry(expiry)!
    // Só isto sai do navegador. Número completo e CVV ficam de fora (de propósito).
    const body = {
      ...(editing ? {} : { brand, last4 }),
      holder_name: holder.trim(),
      exp_month: exp.month,
      exp_year: exp.year,
      nickname: nickname.trim() || null,
    }

    setLoading(true)
    try {
      const response = editing
        ? await api<{ card: Card }>(`/cards/${card.id}`, { method: 'PATCH', body })
        : await api<{ card: Card }>('/cards', { method: 'POST', body })
      onSaved(response.card)
    } catch (caught) {
      if (caught instanceof ApiError && Object.keys(caught.errors).length > 0) {
        setErrors(Object.fromEntries(Object.entries(caught.errors).map(([field, messages]) => [field, messages[0]])))
      } else {
        setApiError(caught instanceof ApiError ? caught.message : 'Não foi possível salvar o cartão.')
      }
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!card) return
    setLoading(true)
    try {
      await api(`/cards/${card.id}`, { method: 'DELETE' })
      onDeleted(card.id)
    } catch (caught) {
      setApiError(caught instanceof ApiError ? caught.message : 'Não foi possível excluir o cartão.')
      setLoading(false)
    }
  }

  const clear = (field: string) => setErrors(({ [field]: _ignored, ...rest }) => rest)

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <div className="pr-8">
        <h3 className="text-[17px] font-semibold">{editing ? 'Editar cartão' : 'Adicionar cartão'}</h3>
        <p className="mt-0.5 text-[13px] text-subtle">Usado para depositar na sua carteira (simulado, sem cobrança).</p>
      </div>

      <CardPreview brand={brand} last4={last4} digits={editing ? null : digits} holder={holder} expiry={formatExpiry(expiry)} nickname={nickname} />

      {!editing && (
        <Field
          label={noAutofill('Número do cartão')}
          inputMode="numeric"
          autoComplete="wallet-f1"
          placeholder="0000 0000 0000 0000"
          value={formatCardNumber(digits, brand)}
          maxLength={cardLength(brand) + 3}
          onChange={(event) => {
            setNumber(onlyDigits(event.target.value).slice(0, 19))
            clear('number')
          }}
          error={errors.number}
          hint="Usamos o número só para conferir e descobrir a bandeira. Guardamos apenas os 4 últimos dígitos."
          autoFocus
        />
      )}

      <Field
        label={noAutofill('Nome impresso no cartão')}
        autoComplete="wallet-f2"
        placeholder={noAutofill('COMO ESTÁ NO CARTÃO')}
        maxLength={60}
        value={holder}
        onChange={(event) => {
          setHolder(event.target.value.toUpperCase())
          clear('holder_name')
        }}
        error={errors.holder_name}
      />

      <div className="grid grid-cols-2 gap-4">
        <Field
          label={noAutofill('Validade')}
          inputMode="numeric"
          autoComplete="wallet-f3"
          placeholder={noAutofill('MM/AA')}
          value={formatExpiry(expiry)}
          maxLength={5}
          onChange={(event) => {
            setExpiry(onlyDigits(event.target.value).slice(0, 4))
            clear('exp_month')
            clear('exp_year')
          }}
          error={errors.exp_month ?? errors.exp_year}
        />
        {!editing && (
          <Field
            label={noAutofill('CVV')}
            inputMode="numeric"
            autoComplete="wallet-f4"
            placeholder="123"
            maxLength={4}
            tooltip="O código de 3 dígitos atrás do cartão. Só conferimos o formato aqui: ele nunca é enviado nem salvo."
            value={cvv}
            onChange={(event) => {
              setCvv(onlyDigits(event.target.value).slice(0, 4))
              clear('cvv')
            }}
            error={errors.cvv}
          />
        )}
      </div>

      <Field
        label="Apelido (opcional)"
        placeholder="Ex.: Cartão do dia a dia"
        maxLength={30}
        value={nickname}
        onChange={(event) => setNickname(event.target.value)}
        error={errors.nickname}
      />

      <p className="flex items-center gap-2 text-[12px] text-subtle">
        <Lock className="size-3.5 text-accent" /> O número completo e o CVV nunca saem do seu navegador.
      </p>

      <Alert tone="error">{apiError}</Alert>

      {confirmDelete ? (
        <div className="flex flex-col gap-3 rounded-field border border-out-line bg-out-soft/60 p-4">
          <p className="text-[13px]">Excluir o {card?.label}? Os depósitos antigos continuam mostrando este cartão no extrato.</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button variant="danger" loading={loading} loadingText="Excluindo" onClick={() => void handleDelete()}>
              Excluir cartão
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          {editing ? (
            <Button variant="ghost" icon={<Trash2 className="size-4" />} onClick={() => setConfirmDelete(true)} className="text-out hover:text-out">
              Excluir
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit" loading={loading} loadingText="Salvando">
            {editing ? 'Salvar alterações' : 'Salvar cartão'}
          </Button>
        </div>
      )}
    </form>
  )
}

/**
 * O Chrome descobre campos de cartão também pelo TEXTO do rótulo ("CVV", "Validade"...).
 * Em http://localhost (sem HTTPS) ele então mostra um aviso em inglês por cima do campo.
 * Um caractere invisível (U+2060, "word joiner") entre as letras não muda nada na tela,
 * mas faz o adivinhador do Chrome não reconhecer as palavras. Em produção, com HTTPS, não seria preciso.
 */
function noAutofill(text: string): string {
  return text.split('').join('\u2060')
}

/** Cartãozinho que vai se preenchendo enquanto a pessoa digita. */
function CardPreview({
  brand,
  last4,
  digits,
  holder,
  expiry,
  nickname,
}: {
  brand: CardBrand
  last4: string
  digits: string | null
  holder: string
  expiry: string
  nickname: string
}) {
  const shown = digits !== null ? formatCardNumber(digits.padEnd(cardLength(brand), '•'), brand) : `•••• •••• •••• ${last4}`

  return (
    <div className="relative aspect-[1.7/1] w-full max-w-[320px] self-center overflow-hidden rounded-[16px] border border-accent-line/70 bg-gradient-to-br from-[#1a2238] via-[#121521] to-[#0d0e12] p-5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)]">
      <div aria-hidden="true" className="pointer-events-none absolute -top-16 -right-10 size-44 rounded-full bg-accent-strong/20 blur-2xl" />
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between">
          <span className="text-[12px] text-muted">{nickname.trim() || 'wallet easy'}</span>
          <BrandMark brand={brand} className="scale-125" />
        </div>
        <p className="money text-[17px] tracking-wider text-fg">{shown}</p>
        <div className="flex items-end justify-between text-[11px]">
          <span className="truncate pr-3 text-fg/90 uppercase">{holder.trim() || 'NOME NO CARTÃO'}</span>
          <span className="money shrink-0 text-muted">{expiry || 'MM/AA'}</span>
        </div>
      </div>
    </div>
  )
}
