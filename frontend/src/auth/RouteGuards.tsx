import { Navigate, Outlet, useLocation } from 'react-router'
import { FullScreenLoader } from '../components/ui/FullScreenLoader'
import { useAuth } from './useAuth'

/** Só entra quem está logado. Equivalente ao middleware auth:sanctum, do lado do frontend. */
export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <FullScreenLoader />
  if (status === 'guest') return <Navigate to="/entrar" replace state={{ from: location.pathname }} />
  return <Outlet />
}

/** Login e cadastro: quem já está logado vai direto para o painel. */
export function GuestOnly() {
  const { status } = useAuth()

  if (status === 'loading') return <FullScreenLoader />
  if (status === 'authenticated') return <Navigate to="/" replace />
  return <Outlet />
}
