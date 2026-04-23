import { createContext } from "react"

type WebSocketContextProps = {
  socket: React.RefObject<WebSocket | null>
  isConnected: boolean
} | null

export const WebSocketContext = createContext<WebSocketContextProps>(null)



