import type { WebsocketState } from "@/hooks/use-websocket"
import { createContext } from "react"


export type PriceWacherState = WebsocketState<{
  supportedSymbols: string[]
}> 
type PriceWatcherContextProps = {
  socket: React.RefObject<WebSocket | null>
  isConnected: boolean
} | null

export const PriceWatcherContext = createContext<PriceWatcherContextProps>(null)
