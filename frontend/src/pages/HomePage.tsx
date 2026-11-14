import { LogOut } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { Button } from '../components/ui/Button'
import { Logo } from '../components/ui/Logo'

/**
 * Painel provisório (etapa 1): confirma que o login funcionou.
 * Na etapa 2 vira o painel completo, com menu lateral, depósito e transferência.
 */
export function HomePage() {
  const { user, logout } = useAuth()
  const [leaving, setLeaving] = useState(false)

  if (!user) return null
  const [reais, cents] = user.balance_formatted.split(',')

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-4 py-6 sm:px-8">
      <header className="flex items-center justify-between">
        <Logo />
        <Button
          variant="ghost"
          loading={leaving}
          icon={<LogOut className="size-4" />}
          onClick={() => {
            setLeaving(true)
            void logout()
          }}
        >
          Sair
        </Button>
      </header>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="mt-10 rounded-card border border-accent-line/70 bg-gradient-to-br from-[#141826] to-surface p-6"
      >
        <p className="text-[13px] text-muted">Olá, @{user.nickname}</p>
        <p className="mt-4 text-[12px] text-muted">Saldo disponível</p>
        <p className="money mt-1 text-[40px] font-medium">
          {reais}
          <span className="text-subtle">,{cents}</span>
        </p>
        <p className="mt-6 text-[12px] text-subtle">Depósito, transferência e extrato chegam na próxima etapa.</p>
      </motion.section>
    </div>
  )
}
