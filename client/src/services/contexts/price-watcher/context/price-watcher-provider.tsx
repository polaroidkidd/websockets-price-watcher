import { useWebSocket } from "@/hooks/use-websocket"
import { PriceWatcherContext } from "./price-watcher-context"

type PriceWatcherProviderProps = {
  children: React.ReactNode
  url: string
}

export const PriceWatcherProvider = ({
  children,
  url,
}: PriceWatcherProviderProps) => {
  const { socketRef, isConnected } = useWebSocket<{
    supportedSymbols: string[]
  }>({ url })


  return (
    <PriceWatcherContext
      value={{
        isConnected,
        socket: socketRef,
      }}
    >
      {children}
    </PriceWatcherContext>
  )
}
