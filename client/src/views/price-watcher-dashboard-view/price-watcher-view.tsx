// Modal to add new symbols
// Existing watched symbols
// State which holds the current symbols being watched

import { usePriceWatcher } from "@/services/contexts/price-watcher/hooks/use-price-watcher"
import { useEffect, useRef } from "react"
import { AddPriceWatcherDialog } from "./components/add-price-watcher-dialog"

export const PriceWatcherView = () => {
  const state = usePriceWatcher()

  const preRef = useRef<HTMLPreElement>(null)

  useEffect(() => {
    if (preRef.current) {
      preRef.current.textContent = JSON.stringify(state.message, null, 2)
    }
  }, [state])
  return (
    <div className="placeholder">
      Price Watcher Dashboard View Placeholder
      {state.connected ? <h1>Connected</h1> : <h1>NOT</h1>}
      <pre ref={preRef}></pre>
      <AddPriceWatcherDialog />
    </div>
  )
}
