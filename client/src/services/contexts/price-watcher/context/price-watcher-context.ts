import { createContext } from "react"

export type Price = number

export type PriceWatcherApi = {
  subscribe: (symbol: string, listener: () => void) => () => void
  getSnapshot: (symbol: string) => Price | undefined
  watch: (symbols: string[]) => void
  unwatch: (symbols: string[]) => void
}

export type PriceWatcherStatus = {
  isConnected: boolean
  supportedSymbols: string[]
}

export const PriceWatcherApiContext = createContext<PriceWatcherApi | null>(
  null
)

export const PriceWatcherStatusContext =
  createContext<PriceWatcherStatus | null>(null)
