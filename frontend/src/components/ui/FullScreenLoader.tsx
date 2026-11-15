import { LoadingText } from './LoadingText'
import { Logo } from './Logo'

/** Tela de transição (ex.: conferindo o login ao abrir o app). */
export function FullScreenLoader({ text = 'Carregando' }: { text?: string }) {
  return (
    <div className="grid min-h-dvh place-items-center">
      <div className="flex flex-col items-center gap-5">
        <Logo size="lg" />
        <LoadingText text={text} />
      </div>
    </div>
  )
}
