import {
  usePriceWatcherApi,
  usePriceWatcherStatus,
} from "@/services/contexts/price-watcher/hooks/use-price-watcher"
import { useEffect, useRef } from "react"
import { AddPriceWatcherDialog } from "./components/add-price-watcher-dialog"

const DEFAULT_SYMBOLS = ["WF", "DVU"] as const

// The dashboard itself only cares about *connection status* and the *watch API*.
// It does NOT read prices, so it will not re-render when prices tick.
// The only re-renders this component does are:
//   1) on mount
//   2) when isConnected flips (open/close — rare)
// Price updates (every ~300ms) are delivered to the <span>s below via direct
// DOM writes, completely bypassing React's render cycle.
export const PriceWatcherView = () => {
  const { isConnected } = usePriceWatcherStatus()
  const { watch, unwatch } = usePriceWatcherApi()

  // Tell the server which symbols to stream to us. Re-runs only on (re)connect.
  useEffect(() => {
    if (!isConnected) return
    const symbols = [...DEFAULT_SYMBOLS]
    watch(symbols)
    return () => unwatch(symbols)
  }, [isConnected, watch, unwatch])

  return (
    <div className="placeholder">
      Price Watcher Dashboard View
      {isConnected ? <h1>Connected</h1> : <h1>NOT</h1>}
      {DEFAULT_SYMBOLS.map((symbol) => (
        <WatchedSymbolRow key={symbol} symbol={symbol} />
      ))}
      <AddPriceWatcherDialog />
    </div>
  )
}

const format = (price: number | undefined) =>
  price !== undefined ? price.toFixed(2) : "—"

// === Why this component does not re-render on price updates ===
//
// A naive implementation would store the price in React state (useState /
// useSyncExternalStore). Every tick would call setState → React would
// reconcile this component → diff the virtual DOM → commit. At 300ms per tick,
// across many symbols, that's a lot of unnecessary work: the ONLY thing that
// actually changes on screen is the text node inside <span>.
//
// Instead we treat the price as *external, mutable state* that React does not
// own. The flow is:
//
//   1. The provider holds a Map<symbol, price> in a ref (no React state).
//   2. On each WebSocket message it mutates that Map and calls the listeners
//      registered for the affected symbol only.
//   3. This component registers a listener once, in useEffect, that writes
//      the new price directly to the DOM via `priceRef.current.textContent`.
//
// `textContent = ...` is one of the cheapest DOM operations available — it
// bypasses:
//   - React's render phase (no component function re-execution)
//   - React's commit phase (no virtual DOM diff)
//   - The parser (it's treated as plain text, not HTML)
//
// The trade-off: this text is now outside React's control. If a parent
// re-renders for some *other* reason, React will overwrite our imperatively-
// written text with whatever it renders as the initial child of <span> — so
// we seed that initial child with `format(getSnapshot(symbol))` to make sure
// it stays consistent.
const WatchedSymbolRow = ({ symbol }: { symbol: string }) => {
  // `subscribe` and `getSnapshot` come from a stable API object (memoized in
  // the provider). They never change identity after mount, so the effect
  // below only runs once per symbol — not on every parent render.
  const { subscribe, getSnapshot } = usePriceWatcherApi()

  // A ref to the DOM node we'll mutate directly. Refs don't trigger renders
  // when assigned, so nothing about this line causes React work later.
  const priceRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    // `render` is the bridge between the external store and the DOM.
    // It reads the latest price from the provider's in-memory Map and writes
    // it straight into the span. No setState, no reconciliation.
    const render = () => {
      if (priceRef.current) {
        priceRef.current.textContent = format(getSnapshot(symbol))
      }
    }

    // Paint the current value immediately so we don't show a stale "—"
    // between mount and the next WebSocket tick.
    render()

    // Register with the provider's per-symbol listener set. The provider
    // calls `render` ONLY when *this* symbol updates — updates to other
    // symbols won't wake this component at all.
    //
    // `subscribe` returns its own unsubscribe function, which we return from
    // the effect so React runs it on unmount / dep change. This is what
    // prevents the listener leak the original implementation had.
    return subscribe(symbol, render)
  }, [subscribe, getSnapshot, symbol])

  // Initial markup. After mount, the <span>'s textContent is owned by the
  // effect above; React will not touch it again unless this component itself
  // re-renders (which, per the reasoning above, it won't on price ticks).
  return (
    <pre>
      {symbol}: <span ref={priceRef}>{format(getSnapshot(symbol))}</span>
    </pre>
  )
}
