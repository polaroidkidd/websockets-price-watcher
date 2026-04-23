import { WebSocketProvider } from "./services"
import { PriceWatcherView } from "./views/price-watcher-dashboard-view/price-watcher-view"

export function App() {
  return (
    <WebSocketProvider url="ws://localhost:8080">

    <div className="flex min-h-svh p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
       <PriceWatcherView/>
      </div>
    </div>
    </WebSocketProvider>
  )
}

export default App
