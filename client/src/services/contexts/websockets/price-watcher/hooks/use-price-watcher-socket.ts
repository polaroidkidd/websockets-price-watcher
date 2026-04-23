import { useContext } from "react"
import { WebSocketContext } from "../context/websocket-context"

export const usePriceWatcherSocketContext = () => {
  const ctx = useContext(WebSocketContext)

  if (!ctx) {
    throw Error("PriceWatcherSocket Hook used outside of PriceWacherProvider")
  }
  return ctx
}


