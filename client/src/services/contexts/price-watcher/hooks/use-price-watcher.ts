import { useContext } from "react"
import { PriceWatcherContext } from "../context/price-watcher-context"

const usePriceWatcherContext = () => {
  const ctx = useContext(PriceWatcherContext)

  if (!ctx) {
    throw Error("PriceWatcherSocket Hook used outside of PriceWacherProvider")
  }
  return ctx
}

export const usePriceWatcher = () => {
  const { isConnected, socket } = usePriceWatcherContext()

  return {isConnected, socket}
}
