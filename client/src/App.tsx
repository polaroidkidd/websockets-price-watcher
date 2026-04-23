import { PriceWatcherProvider } from "./services"
import { PriceWatcherView } from "./views/price-watcher-dashboard-view/price-watcher-view"

export function App() {
  return (
    <PriceWatcherProvider url="ws://localhost:8080">

    <div className="flex min-h-svh p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
       <PriceWatcherView/>
      </div>
    </div>
    </PriceWatcherProvider>
  )
}

export default App
