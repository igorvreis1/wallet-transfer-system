import { ArrowUpRight, Eye, EyeOff, House, LogOut, ReceiptText } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import { api, ApiError } from '../../lib/api'
import { cn } from '../../lib/cn'
import type { User } from '../../types/api'
import { Logo } from '../ui/Logo'
import { Switch } from '../ui/Switch'
import { AnimatedBalance } from '../wallet/AnimatedBalance'
import { useBalanceVisibility, type AppOutletContext } from './BalanceVisibility'

const tabs = [
  { to: '/', label: 'Início', icon: House, end: true },
  { to: '/transferir', label: 'Transferir', icon: ArrowUpRight, end: false },
  { to: '/extrato', label: 'Extrato', icon: ReceiptText, end: false },
]

/**
 * Moldura das telas logadas: header fixo (logo, abas, saldo e perfil).
 * No celular, as abas viram uma barra fixa embaixo, ao alcance do polegar.
 */
export function AppLayout() {
  const { user } = useAuth()
  const { hidden, toggle } = useBalanceVisibility()

  if (!user) return null
  const context: AppOutletContext = { balanceHidden: hidden, toggleBalance: toggle }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <NavLink to="/" aria-label="Início">
            <Logo />
          </NavLink>

          <nav aria-label="Principal" className="hidden items-center gap-1 rounded-full border border-line bg-surface/60 p-1 md:flex">
            {tabs.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors duration-200',
                    isActive ? 'bg-white/[0.08] text-fg shadow-[inset_0_0_0_1px_#2a2a30]' : 'text-muted hover:text-fg',
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={toggle}
              aria-label={hidden ? 'Mostrar saldo' : 'Esconder saldo'}
              className="group flex items-center gap-2 rounded-full px-2 py-1.5 transition-colors hover:bg-white/[0.04]"
            >
              <span className="text-[13px]">
                <AnimatedBalance cents={user.balance} hidden={hidden} variant="inline" />
              </span>
              <span className="text-subtle transition-colors group-hover:text-fg">
                {hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </span>
            </button>
            <ProfileMenu user={user} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-8 pb-28 sm:px-6 md:pb-16">
        <Outlet context={context} />
      </main>

      <MobileTabBar />
    </div>
  )
}

function MobileTabBar() {
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-line bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      {tabs.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
              isActive ? 'text-fg' : 'text-subtle',
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && <span className="absolute top-0 h-px w-10 bg-accent" />}
              <Icon className="size-5" strokeWidth={isActive ? 2.2 : 1.8} />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

/** Bolinha com as iniciais: abre perfil, privacidade do email e sair. */
function ProfileMenu({ user }: { user: User }) {
  const { logout, updateUser } = useAuth()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => !ref.current?.contains(event.target as Node) && setOpen(false)
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function togglePrivacy(emailVisible: boolean) {
    setSaving(true)
    setError(null)
    try {
      const response = await api<{ user: User }>('/account/privacy', { method: 'PATCH', body: { email_visible: emailVisible } })
      updateUser(response.user)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Abrir menu do perfil"
        className="grid size-9 place-items-center rounded-full border border-line-strong bg-surface-2 text-[12px] font-semibold text-fg uppercase transition-colors hover:border-[#3a3a42]"
      >
        {user.nickname.slice(0, 2)}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-2rem))] origin-top-right rounded-card border border-line-strong bg-surface p-2 shadow-[0_16px_48px_rgba(0,0,0,0.6)]"
          >
            <div className="px-3 py-2.5">
              <p className="font-medium">@{user.nickname}</p>
              <p className="truncate text-[12px] text-subtle">{user.email}</p>
            </div>
            <div className="p-1">
              <Switch
                label="Mostrar meu email"
                tooltip="Seu nickname é sempre público. Com o email oculto, ninguém vê nem transfere usando ele."
                hint={user.email_visible ? 'Te encontram pelo email ou nickname.' : 'Te encontram só pelo nickname.'}
                checked={user.email_visible}
                disabled={saving}
                onChange={(value) => void togglePrivacy(value)}
              />
              {error && <p className="px-1 pt-2 text-[12px] text-out">{error}</p>}
            </div>
            <div className="mt-1 border-t border-line pt-1">
              <button
                type="button"
                role="menuitem"
                onClick={() => void logout()}
                className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-[13px] text-muted transition-colors hover:bg-white/[0.05] hover:text-fg"
              >
                <LogOut className="size-4" /> Sair
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
