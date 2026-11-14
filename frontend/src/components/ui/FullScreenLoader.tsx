import { Spinner } from './Spinner'

export function FullScreenLoader() {
  return (
    <div className="grid min-h-dvh place-items-center text-muted" role="status">
      <Spinner className="size-5" />
      <span className="sr-only">Carregando…</span>
    </div>
  )
}
