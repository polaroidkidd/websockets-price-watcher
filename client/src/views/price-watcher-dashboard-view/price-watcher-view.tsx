// Modal to add new symbols
// Existing watched symbols
// State which holds the current symbols being watched

import { usePriceWatcher } from "@/services/contexts/price-watcher/hooks/use-price-watcher"
import { useEffect, useRef } from "react"
import { AddPriceWatcherDialog } from "./components/add-price-watcher-dialog"

export const PriceWatcherView = () => {
  const {isConnected, socket} = usePriceWatcher()

  const preRef = useRef<HTMLPreElement>(null)


  const update =(event: MessageEvent)=>{
    if (preRef.current) {
      
      preRef.current.textContent = event.data
    }
    
  }
  useEffect(() => {
    if (isConnected) {
      socket.current?.addEventListener("message", update)
    }
  }, [isConnected, socket])
  return (
    <div className="placeholder">
      Price Watcher Dashboard View Placeholder
      {isConnected ? <h1>Connected</h1> : <h1>NOT</h1>}
      <pre ref={preRef}></pre>
      <AddPriceWatcherDialog />
    </div>
  )
}
