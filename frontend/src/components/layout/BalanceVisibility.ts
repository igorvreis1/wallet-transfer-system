import { useCallback, useState } from 'react'

const KEY = 'wallet.hideBalance'

/** Olhinho do saldo: esconder/mostrar, lembrando a escolha neste navegador. */
export function useBalanceVisibility() {
  const [hidden, setHidden] = useState<boolean>(() => {
    try {
      return localStorage.getItem(KEY) === '1'
    } catch {
      return false
    }
  })

  const toggle = useCallback(() => {
    setHidden((value) => {
      try {
        localStorage.setItem(KEY, value ? '0' : '1')
      } catch {
        /* sem armazenamento: vale só nesta aba */
      }
      return !value
    })
  }, [])

  return { hidden, toggle }
}

/** O que as páginas recebem do layout (via <Outlet context>). */
export interface AppOutletContext {
  balanceHidden: boolean
  toggleBalance: () => void
}

export const HIDDEN_MONEY = 'R$ ••••••'
