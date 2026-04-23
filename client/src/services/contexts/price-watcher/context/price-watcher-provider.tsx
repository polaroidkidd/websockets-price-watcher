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
  const { socketRef, state } = useWebSocket<{
    supportedSymbols: string[]
  }>({ url })


  return (
    <PriceWatcherContext
      value={{
        state: state,
        socket: socketRef,
      }}
    >
      {children}
    </PriceWatcherContext>
  )
}
