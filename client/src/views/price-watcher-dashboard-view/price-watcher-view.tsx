// Modal to add new symbols
// Existing watched symbols
// State which holds the current symbols being watched

import { usePriceWatcherSocketContext } from "@/services/contexts/websockets/price-watcher/hooks/use-price-watcher-socket"
import { AddPriceWatcherDialog } from "./components/add-price-watcher-dialog"

export const PriceWatcherView = () => {
  const { isConnected } = usePriceWatcherSocketContext()


  return (
    <div className="placeholder">
      Price Watcher Dashboard View Placeholder
      {isConnected ? <h1>Connected</h1> : <h1>NOT</h1>}
      <AddPriceWatcherDialog />
    </div>
  )
}
