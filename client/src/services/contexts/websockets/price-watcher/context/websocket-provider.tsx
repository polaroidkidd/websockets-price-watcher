import { useEffect, useRef, useState } from "react"
import { WebSocketContext } from "./websocket-context"

type WebSocketProviderProps = {
  children: React.ReactNode
  url: string
}

export const WebSocketProvider = ({
  children,
  url,
}: WebSocketProviderProps) => {
  const socketRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  useEffect(() => {
    const socket = new WebSocket(url)
    socketRef.current = socket

    socketRef.current.onopen = () => {
      setIsConnected(true)
    }
    socketRef.current.onclose = () => {
      setIsConnected(false)
    }
  }, [url])

  useEffect(
    () => () => {
      socketRef.current?.close()
    },
    []
  )
  return (
    <WebSocketContext
      value={{
        isConnected,
        socket: socketRef,
      }}
    >
      {children}
    </WebSocketContext>
  )
}
