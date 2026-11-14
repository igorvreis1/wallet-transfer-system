import { ArrowRight } from 'lucide-react'
import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { AuthLayout } from '../components/layout/AuthLayout'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { Switch } from '../components/ui/Switch'
import { ApiError } from '../lib/api'
import type { RegisterPayload } from '../types/api'

const empty: RegisterPayload = { email: '', nickname: '', password: '', password_confirmation: '', email_visible: true }

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState<RegisterPayload>(empty)
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(false)

  const update = (field: 'email' | 'password' | 'password_confirmation') => (event: ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [field]: event.target.value })

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await register(form)
      navigate('/', { replace: true })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError(0, { message: 'Algo deu errado. Tente novamente.' }))
      setLoading(false)
    }
  }

  const hasFieldErrors = error ? Object.keys(error.errors).length > 0 : false

  return (
    <AuthLayout title="Criar conta" subtitle="Leva menos de um minuto. Sua carteira começa com saldo zero.">
      <form onSubmit={handleSubmit} noValidate className="grid gap-5">
        <Alert tone="error">{error && !hasFieldErrors ? error.message : null}</Alert>

        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          placeholder="voce@email.com"
          tooltip="Usado para entrar na sua conta. Outras pessoas também podem transferir para você usando seu email."
          hint="Você pode usar o email para entrar e para receber transferências."
          value={form.email}
          error={error?.field('email')}
          onChange={update('email')}
          required
          autoFocus
        />

        <Field
          label="Nickname"
          name="nickname"
          autoComplete="username"
          autoCapitalize="none"
          maxLength={30}
          placeholder="alice"
          tooltip="Seu nome público na carteira: de 3 a 30 caracteres, só letras minúsculas, números e _ (underline). Não pode ser alterado depois."
          hint="É uma das formas de te identificarem na rede: outras pessoas usam seu nickname para transferir para você."
          value={form.nickname}
          error={error?.field('nickname')}
          onChange={(event) => setForm({ ...form, nickname: event.target.value.toLowerCase() })}
          required
        />

        <Switch
          label="Mostrar meu email para outras pessoas"
          tooltip="Seu nickname é sempre público, porque é por ele que as pessoas te encontram. O email é opcional: oculto, ninguém vê e ninguém consegue transferir usando ele. Você pode mudar isso depois."
          hint={
            form.email_visible
              ? 'Outras pessoas podem transferir para você pelo email ou pelo nickname.'
              : 'Ninguém vê seu email: as pessoas só te encontram pelo nickname.'
          }
          checked={form.email_visible}
          onChange={(email_visible) => setForm({ ...form, email_visible })}
        />

        <Field
          label="Senha"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo de 8 caracteres"
          hint="Use pelo menos 8 caracteres, com letras e números."
          value={form.password}
          error={error?.field('password')}
          onChange={update('password')}
          required
        />

        <Field
          label="Confirme a senha"
          name="password_confirmation"
          type="password"
          autoComplete="new-password"
          placeholder="Digite a senha de novo"
          value={form.password_confirmation}
          error={error?.field('password_confirmation')}
          onChange={update('password_confirmation')}
          required
        />

        <Button type="submit" size="lg" fullWidth loading={loading} loadingText="Criando sua conta" className="mt-1">
          Criar conta <ArrowRight className="size-4" />
        </Button>
      </form>

      <p className="mt-8 text-center text-[13px] text-muted">
        Já tem conta?{' '}
        <Link to="/entrar" className="font-medium text-fg underline-offset-4 hover:text-accent hover:underline">
          Entrar
        </Link>
      </p>
    </AuthLayout>
  )
}
