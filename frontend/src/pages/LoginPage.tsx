import { ArrowRight } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { AuthLayout } from '../components/layout/AuthLayout'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { ApiError } from '../lib/api'

export function LoginPage() {
  const { login, notice, clearNotice } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ login: '', password: '' })
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    clearNotice()

    try {
      await login(form)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from ?? '/', { replace: true })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError(0, { message: 'Algo deu errado. Tente novamente.' }))
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Entrar" subtitle="Acesse sua carteira com email ou nickname.">
      <form onSubmit={handleSubmit} noValidate className="grid gap-5">
        <Alert tone="warning">{notice}</Alert>
        {/* Erro geral (ex.: senha errada, muitas tentativas). Erros de campo aparecem embaixo de cada um. */}
        <Alert tone="error">{error && Object.keys(error.errors).length === 0 ? error.message : null}</Alert>

        <Field
          label="Email ou nickname"
          name="login"
          autoComplete="username"
          autoCapitalize="none"
          placeholder="alice ou alice@email.com"
          hint="Use o email ou o nickname que você escolheu no cadastro."
          value={form.login}
          error={error?.field('login')}
          onChange={(event) => setForm({ ...form, login: event.target.value })}
          required
          autoFocus
        />

        <Field
          label="Senha"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Sua senha"
          value={form.password}
          error={error?.field('password')}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
          required
        />

        <Button type="submit" size="lg" fullWidth loading={loading} className="mt-1">
          Entrar <ArrowRight className="size-4" />
        </Button>
      </form>

      <p className="mt-8 text-center text-[13px] text-muted">
        Ainda não tem conta?{' '}
        <Link to="/cadastro" className="font-medium text-fg underline-offset-4 hover:text-accent hover:underline">
          Criar conta
        </Link>
      </p>
    </AuthLayout>
  )
}
