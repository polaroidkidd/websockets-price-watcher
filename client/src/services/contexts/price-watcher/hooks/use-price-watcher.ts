import { useCallback, useContext, useSyncExternalStore } from "react"
import {
  PriceWatcherApiContext,
  PriceWatcherStatusContext,
  type Price,
} from "../context/price-watcher-context"

// =============================================================================
// Consumer hooks for the PriceWatcher subsystem.
//
// The provider exposes *two* contexts: an API (stable function references) and
// a Status (isConnected, supportedSymbols). The hooks in this file are the
// only thing consumers should touch — they wrap the raw `useContext` calls and
// bake in the right guardrails.
//
// Why a hook layer at all?
//   1. Guard against missing providers exactly once, at the boundary.
//   2. Give the call site a domain name ("useWatchedSymbol") instead of a
//      generic one ("useContext(PriceWatcherApiContext).subscribe(...)").
//   3. Isolate callers from the context's internal shape, so we can refactor
//      the provider without a codebase-wide find/replace.
// =============================================================================

/**
 * Returns the *imperative* API for the price stream: `subscribe`, `getSnapshot`,
 * `watch`, and `unwatch`.
 *
 * Key property: the returned object is memoized inside the provider against a
 * stable `send` callback, so after mount its identity never changes. That
 * means calling this hook alone will NOT cause your component to re-render
 * when prices tick, when the socket reconnects, or when anything else
 * changes. It is the right hook for components that only *do* things with
 * the stream — e.g. a button that calls `watch(['AAPL'])` or a form that
 * reads a one-shot snapshot via `getSnapshot('AAPL')`.
 *
 * The throw is a programmer-error guardrail. If you reach this line at
 * runtime, it means a component used this hook outside a PriceWatcherProvider
 * — a bug to fix in code, not a runtime condition to handle.
 */
export const usePriceWatcherApi = () => {
  const ctx = useContext(PriceWatcherApiContext)
  if (!ctx) {
    throw Error("usePriceWatcherApi used outside of PriceWatcherProvider")
  }
  return ctx
}

/**
 * Returns the rarely-changing connection slice: `{ isConnected, supportedSymbols }`.
 *
 * This is deliberately split from the API context. `isConnected` flips on
 * open/close (rare) and `supportedSymbols` is set once, when the server's
 * "connected" message lands. Splitting them means components that only use
 * the API context don't re-render on connection blips, and vice versa.
 *
 * Use this for: connection badges, "offline" overlays, symbol-picker dropdowns
 * populated from `supportedSymbols`.
 */
export const usePriceWatcherStatus = () => {
  const ctx = useContext(PriceWatcherStatusContext)
  if (!ctx) {
    throw Error("usePriceWatcherStatus used outside of PriceWatcherProvider")
  }
  return ctx
}

/**
 * Subscribes to live price updates for a single `symbol` and returns its
 * current value (or `undefined` if we haven't received a tick for it yet).
 *
 * This is the hook that produces React renders in lockstep with the WebSocket.
 * It wires the provider's per-symbol `subscribe` + `getSnapshot` pair into
 * React's `useSyncExternalStore`, which is the officially-blessed primitive
 * for reading from mutable external stores. It handles tearing, concurrent
 * rendering, and server rendering correctly — which an ad-hoc
 * `useEffect` + `useState` implementation would not.
 *
 * How the re-render discipline works:
 *   • `subscribe` in the provider registers `cb` in a Set keyed by `symbol`.
 *     When a message for that symbol arrives, the provider calls *only* the
 *     listeners in that Set. Components watching other symbols are not woken.
 *   • `useSyncExternalStore` calls `getSnapshot` after each notification. If
 *     the returned value is `Object.is`-equal to the previous one, React
 *     skips the re-render. A price change from 123.45 → 123.46 will cause a
 *     render; a redundant tick at 123.45 won't.
 *
 * Why the `useCallback` wrappers matter:
 *   `useSyncExternalStore` compares `subscribe` and `getSnapshot` by identity
 *   across renders. If we passed fresh inline closures every render, React
 *   would tear down the subscription and re-create it each render — which is
 *   both wasteful and slightly broken (you can miss an update that lands
 *   between the unsubscribe and re-subscribe). Memoizing against
 *   `[subscribe, symbol]` / `[getSnapshot, symbol]` — both stable — means we
 *   subscribe exactly once per mounted symbol.
 *
 * Why `snap` is passed as the third argument too:
 *   The full signature is
 *   `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot?)`.
 *   The third argument is used during server-side rendering. Our store is
 *   empty on the server (no WebSocket has ever ticked), so `snap` returns
 *   `undefined` there, which is exactly what we want. If you were SSR-ing
 *   with pre-seeded prices, this is where you'd plug them in.
 *
 * Return type is `Price | undefined`. Don't invent a sentinel like `0` or
 * `NaN` — let the caller render a dash for "no data yet".
 */
export const useWatchedSymbol = (symbol: string): Price | undefined => {
  const { subscribe, getSnapshot } = usePriceWatcherApi()

  // Bind `subscribe` to this specific symbol. Stable across renders as long
  // as `subscribe` (provider-stable) and `symbol` (usually a prop) don't
  // change — which means we subscribe to the provider exactly once per
  // symbol switch, not once per render.
  const sub = useCallback(
    (cb: () => void) => subscribe(symbol, cb),
    [subscribe, symbol]
  )

  // Bind `getSnapshot` to this symbol too. Used both on every notification
  // (to read the new value) and once as the SSR snapshot.
  const snap = useCallback(() => getSnapshot(symbol), [getSnapshot, symbol])

  return useSyncExternalStore(sub, snap, snap)
}

/**
 * Returns the list of symbols the server said it can stream.
 *
 * A one-liner, but it pays its rent:
 *   1. *Naming.* `useAvailableSymbols()` reads better at the call site than
 *      `usePriceWatcherStatus().supportedSymbols`.
 *   2. *Refactor anchor.* If `supportedSymbols` later moves to its own
 *      context, or gets derived (e.g. filtered by user permissions), only
 *      this hook changes — every call site keeps working.
 *   3. *Single seam for logic.* If you ever want to sort, dedupe, or filter
 *      the list, do it here once instead of at every call site.
 *
 * Re-render behavior: inherits from `usePriceWatcherStatus`. In practice
 * this fires exactly once — when the server's "connected" message arrives.
 */
export const useAvailableSymbols = (): string[] =>
  usePriceWatcherStatus().supportedSymbols
