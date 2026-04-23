import { useWebSocket } from "@/hooks/use-websocket"
import { useCallback, useMemo, useRef, useState } from "react"
import {
  PriceWatcherApiContext,
  PriceWatcherStatusContext,
  type Price,
  type PriceWatcherApi,
} from "./price-watcher-context"

type PriceWatcherProviderProps = {
  children: React.ReactNode
  url: string
}

// The server's wire protocol. We narrow incoming JSON to this union so the
// compiler forces us to handle each event type (and so we can't typo a field).
type ServerMessage =
  | { event: "connected"; supportedSymbols: string[]; message?: string }
  | { event: "stocks-update"; stocks: Record<string, Price> }
  | { event: "disconnecting"; reason: string }
  | { event: "error"; reason: string }

// =============================================================================
// Why this provider is cheap, even with ~300ms price ticks
// =============================================================================
//
// Rule of thumb with React Context: every consumer re-renders when the context
// VALUE changes. If we piped live prices through context, every tick would
// re-render every consumer of the provider — even ones that don't display
// prices. With dozens of symbols and a 300ms cadence that's a firehose of
// wasted work.
//
// The fix is to recognize that prices are *external mutable state*. React does
// not need to own them. The provider keeps them in a plain `Map` held by a
// `useRef` — mutating a ref does NOT trigger a render. Components that want
// to display a price register a per-symbol listener; the provider invokes only
// the listeners for the symbol that just ticked.
//
// The two contexts below are split on purpose:
//   • PriceWatcherApiContext — a STABLE object of function references. It is
//     memoized against `[send]`, and `send` itself is a stable useCallback
//     from useWebSocket. So after mount this context's value never changes,
//     meaning subscribers to it never re-render from context alone.
//   • PriceWatcherStatusContext — changes only when `isConnected` flips or
//     when the server announces supportedSymbols. These are rare events.
//
// Net effect: the only things that cause React renders in this system are
// (a) the open/close of the socket, and (b) each individual subscribed
// component's decision to call setState inside its listener (which the
// current consumer avoids entirely by writing to the DOM via a ref).
// =============================================================================
export const PriceWatcherProvider = ({
  children,
  url,
}: PriceWatcherProviderProps) => {
  // `pricesRef` is our external store. A Map keyed by symbol -> latest price.
  // We mutate this directly on every tick. No setState, no render.
  const pricesRef = useRef<Map<string, Price>>(new Map())

  // `listenersRef` maps a symbol to the set of callbacks interested in it.
  // A Set (not array) gives O(1) add/delete and automatic dedupe. Using a
  // ref — rather than state — means adding/removing a listener doesn't
  // re-render the provider.
  const listenersRef = useRef<Map<string, Set<() => void>>>(new Map())

  // Supported symbols are advertised once by the server on connect. This is
  // rare enough that React state is fine; consumers that show a symbol
  // picker will re-render exactly once when the list arrives.
  const [supportedSymbols, setSupportedSymbols] = useState<string[]>([])

  // The hot path. This runs on every WebSocket message (~300ms). It must:
  //   1) never call setState for price updates
  //   2) only wake components that actually care about the updated symbol
  //
  // `useCallback([])` keeps the function identity stable so useWebSocket's
  // effect doesn't reattach handlers on every render.
  const handleMessage = useCallback((raw: string) => {
    let msg: ServerMessage
    try {
      msg = JSON.parse(raw) as ServerMessage
    } catch {
      // Server sent malformed JSON — drop it silently rather than crash
      // the whole socket.
      return
    }

    if (msg.event === "connected") {
      // One-time setup message: safe to take a real render here.
      setSupportedSymbols(msg.supportedSymbols ?? [])
      return
    }

    if (msg.event === "stocks-update") {
      // The hot path. For each updated symbol:
      //   - write the new price into the external store
      //   - notify ONLY the listeners for that specific symbol
      // A component watching "AAPL" is not woken when "GOOG" ticks.
      for (const [symbol, price] of Object.entries(msg.stocks ?? {})) {
        pricesRef.current.set(symbol, price)
        const listeners = listenersRef.current.get(symbol)
        if (listeners) {
          for (const cb of listeners) cb()
        }
      }
    }
  }, [])

  // The WebSocket hook owns the connection lifecycle. We pass `handleMessage`
  // as a ref-stabilized callback so message delivery doesn't cause renders
  // here. `send` is a stable useCallback we can forward to consumers.
  const { isConnected, send } = useWebSocket({ url, onMessage: handleMessage })

  // The imperative API we expose. Everything in it is ref-backed, so this
  // object's identity is stable across renders — which is the whole point:
  // a stable context value means zero re-renders for pure API consumers.
  const api = useMemo<PriceWatcherApi>(
    () => ({
      // Register a listener for a symbol. Returns an unsubscribe fn (the
      // same shape useSyncExternalStore expects) so callers can hand the
      // return value straight to React's effect cleanup.
      subscribe(symbol, listener) {
        let set = listenersRef.current.get(symbol)
        if (!set) {
          set = new Set()
          listenersRef.current.set(symbol, set)
        }
        set.add(listener)
        return () => {
          const s = listenersRef.current.get(symbol)
          if (!s) return
          s.delete(listener)
          // Drop the empty Set so the Map doesn't grow unboundedly as
          // symbols come and go.
          if (s.size === 0) listenersRef.current.delete(symbol)
        }
      },
      // Synchronous read of the latest price. Cheap — just a Map lookup.
      // Used for initial paint and (optionally) by useSyncExternalStore.
      getSnapshot(symbol) {
        return pricesRef.current.get(symbol)
      },
      // Ask the server to start streaming these symbols to us. No-op on
      // empty list so callers don't have to guard.
      watch(symbols) {
        if (symbols.length === 0) return
        send({ event: "subscribe", stocks: symbols })
      },
      // The inverse. Consumers should call this from effect cleanup so we
      // stop paying for symbols nobody is watching.
      unwatch(symbols) {
        if (symbols.length === 0) return
        send({ event: "unsubscribe", stocks: symbols })
      },
    }),
    // `send` is stable (useCallback([]) inside useWebSocket), so in practice
    // this memo resolves to the same object for the lifetime of the provider.
    [send]
  )

  // Status context is a small, rarely-changing object. We still memoize it
  // so that a parent re-render (for some unrelated reason) doesn't hand
  // consumers a fresh object and trigger a no-op re-render.
  const status = useMemo(
    () => ({ isConnected, supportedSymbols }),
    [isConnected, supportedSymbols]
  )

  // Two providers, nested. Components pick the context they actually need:
  //   - A "Connected/Disconnected" badge uses status only.
  //   - A price row uses the API only.
  // Each one re-renders only when *its* context changes.
  return (
    <PriceWatcherApiContext value={api}>
      <PriceWatcherStatusContext value={status}>
        {children}
      </PriceWatcherStatusContext>
    </PriceWatcherApiContext>
  )
}
