import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, ShieldCheck, Smartphone } from 'lucide-react'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { Logo } from '../ui/Logo'

/**
 * Moldura das telas de login e cadastro.
 * Desktop: painel da marca à esquerda + formulário à direita. Celular: só o formulário.
 */
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <BrandPanel />

      <main className="flex flex-col px-4 py-8 sm:px-8">
        <Logo size="lg" className="lg:hidden" />

        <div className="flex flex-1 items-center justify-center py-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[400px]"
          >
            <h1 className="text-[26px] font-semibold tracking-tight">{title}</h1>
            <p className="mt-1.5 mb-8 text-muted">{subtitle}</p>
            {children}
          </motion.div>
        </div>

        <p className="text-center text-[12px] text-subtle">Projeto de demonstração · os valores não são reais</p>
      </main>
    </div>
  )
}

function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden border-r border-line bg-surface lg:flex lg:flex-col lg:justify-between lg:p-12">
      {/* Brilho azul sutil + grade fininha ao fundo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -left-40 size-[560px] rounded-full bg-accent-strong/20 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(to_right,#1f1f23_1px,transparent_1px),linear-gradient(to_bottom,#1f1f23_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_30%_40%,black_20%,transparent_70%)]"
      />

      <Logo size="lg" className="relative" />

      <div className="relative">
        <h2 className="max-w-md text-[34px] leading-[1.15] font-semibold tracking-tight">
          Seu dinheiro, <span className="text-muted">sem complicação.</span>
        </h2>
        <p className="mt-4 max-w-sm text-muted">
          Deposite, transfira por email ou nickname e acompanhe tudo em um extrato claro.
        </p>

        <PreviewCard />
        <ComingSoon />
      </div>

      <p className="relative flex items-center gap-2 text-[12px] text-subtle">
        <ShieldCheck className="size-4 text-accent" />
        Toda operação é registrada e pode ser revertida em até 90 dias.
      </p>
    </aside>
  )
}

/** Próximos passos do projeto (fases 7 e 8). */
function ComingSoon() {
  const items = [
    { icon: Smartphone, text: 'App Android em Flutter, usando a mesma API' },
    { icon: ArrowLeftRight, text: 'Câmbio entre real, dólar e euro' },
  ]

  return (
    <div className="mt-8 flex max-w-sm flex-col gap-2">
      <span className="text-[11px] font-medium tracking-wide text-subtle uppercase">Em breve</span>
      {items.map(({ icon: Icon, text }) => (
        <span key={text} className="flex items-center gap-2.5 text-[13px] text-muted">
          <span className="grid size-7 place-items-center rounded-full border border-accent-line bg-accent-soft text-accent">
            <Icon className="size-3.5" />
          </span>
          {text}
        </span>
      ))}
    </div>
  )
}

/** Mini extrato decorativo, flutuando. */
function PreviewCard() {
  const rows = [
    { icon: ArrowDownLeft, who: 'De carol', meta: 'Transferência · agora', value: '+ R$ 5,00', tone: 'text-in' },
    { icon: ArrowUpRight, who: 'Para bob', meta: 'Transferência · ontem', value: '- R$ 30,00', tone: 'text-out' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: [0, -6, 0] }}
      transition={{ opacity: { duration: 0.6, delay: 0.2 }, y: { duration: 6, repeat: Infinity, ease: 'easeInOut' } }}
      className="mt-10 max-w-sm rounded-card border border-accent-line/70 bg-gradient-to-br from-[#141826] to-surface p-5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)]"
    >
      <div className="flex items-center justify-between text-[12px] text-muted">
        Saldo disponível
        <span className="rounded-full border border-accent-line bg-accent-soft px-2 py-0.5 text-[11px] text-accent">
          ● Conta ativa
        </span>
      </div>
      <p className="money mt-2 text-[30px] font-medium">
        R$ 1.250<span className="text-subtle">,00</span>
      </p>
      <div className="mt-4 divide-y divide-line border-t border-line">
        {rows.map(({ icon: Icon, who, meta, value, tone }) => (
          <div key={who} className="flex items-center justify-between py-2.5">
            <span className="flex items-center gap-2.5">
              <span className="grid size-7 place-items-center rounded-full border border-line-strong bg-surface-2 text-muted">
                <Icon className="size-3.5" />
              </span>
              <span className="leading-tight">
                <span className="block text-[13px]">{who}</span>
                <span className="text-[11px] text-subtle">{meta}</span>
              </span>
            </span>
            <span className={`money text-[13px] ${tone}`}>{value}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
