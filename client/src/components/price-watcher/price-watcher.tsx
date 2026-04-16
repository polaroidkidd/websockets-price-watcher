import { useCallback, useEffect, useRef } from "react";
import { useSocketRef } from "../../services/websocket-service/use-websocket";

export const PriceWatcher = () => {
  const { wsRef, subscribe } = useSocketRef();
const priceDataRef = useRef<HTMLPreElement>(null)
  const sub = useCallback(() => {
    const socket = wsRef.current;

    socket?.send(
      JSON.stringify({
        event: "subscribe",
        stocks: ["WF", "ZHT"],
      }),
    );
  }, [wsRef]);

  const handler = useCallback((event: MessageEvent) => {
    const data = JSON.stringify(event.data)

    if (priceDataRef.current) {
        priceDataRef.current.textContent = data;
    }
  }, []);

  useEffect(() => {
    subscribe(handler);
  }, [handler, subscribe, wsRef]);
  return (
    <div className="price-watcher">
      <h3 className="instrument"></h3>

      <button onClick={sub} className="btn subscribe">
        Subscribe
      </button>

      <pre className="price-data" ref={priceDataRef}></pre>
    </div>
  );
};
