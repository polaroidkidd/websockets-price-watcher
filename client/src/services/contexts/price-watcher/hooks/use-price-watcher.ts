import { useCallback, useContext, useSyncExternalStore } from "react"
import {
  PriceWatcherApiContext,
  PriceWatcherStatusContext,
  type Price,
} from "../context/price-watcher-context"

export const usePriceWatcherApi = () => {
  const ctx = useContext(PriceWatcherApiContext)
  if (!ctx) {
    throw Error("usePriceWatcherApi used outside of PriceWatcherProvider")
  }
  return ctx
}

export const usePriceWatcherStatus = () => {
  const ctx = useContext(PriceWatcherStatusContext)
  if (!ctx) {
    throw Error("usePriceWatcherStatus used outside of PriceWatcherProvider")
  }
  return ctx
}

export const useWatchedSymbol = (symbol: string): Price | undefined => {
  const { subscribe, getSnapshot } = usePriceWatcherApi()

  const sub = useCallback(
    (cb: () => void) => subscribe(symbol, cb),
    [subscribe, symbol]
  )
  const snap = useCallback(() => getSnapshot(symbol), [getSnapshot, symbol])

  return useSyncExternalStore(sub, snap, snap)
}

export const useAvailableSymbols = (): string[] =>
  usePriceWatcherStatus().supportedSymbols
