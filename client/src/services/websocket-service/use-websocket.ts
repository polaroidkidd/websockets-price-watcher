import { useCallback, useEffect, useRef, useState } from "react";

type NumberInRange<Min extends number, Max extends number> = number & {
  __brand: `NumberInRange<${Min}, ${Max}>`;
};

function inRange<Min extends number, Max extends number>(
  value: number,
  min: Min,
  max: Max,
): NumberInRange<Min, Max> {
  if (value >= min && value <= max) {
    return value as NumberInRange<Min, Max>;
  }
  throw new Error(`Value ${value} is not in range [${min}, ${max}]`);
}

type SocketOptions = {
  onMessage: (message: string) => void;
  onOpen: () => void;
  onClose: () => void;
  reconnect: boolean;
  retries: NumberInRange<1, 100>;
};

const MAX_DEFAULT_RETRIES = 10;
const MAX_GLOBAL_RETRIES = 100;

export type WebSocketStauts = 
    | WebSocket["CLOSED"]
    | WebSocket["OPEN"]
    | undefined
export const useWebsocket = (
  url: string,
  options?: Partial<SocketOptions>,
): {
  status:WebSocketStauts
  socketRef: React.RefObject<WebSocket | null>} => {
  const maxRetries = inRange(
    options?.retries ?? MAX_DEFAULT_RETRIES,
    0,
    MAX_GLOBAL_RETRIES,
  );
  const socketRef = useRef<WebSocket>(null);
  const reconectionTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const attemptCounter = useRef<number>(0);
  const scheduleReconnectRef = useRef<(() => void) | null>(null);
  const [status, setStatus] = useState<WebSocketStauts>(undefined);

  const connect = useCallback(() => {
    const socket = new WebSocket(url);
    socketRef.current = socket;

    socketRef.current.onopen = () => {
      setStatus(WebSocket.OPEN)
      options?.onOpen?.();
    };

    socketRef.current.onmessage = (event) => {
      options?.onMessage?.(JSON.parse(event.data));
    };
    socketRef.current.onclose = (event) => {
      setStatus(WebSocket.CLOSED)
      options?.onClose?.();
      if (options?.reconnect && event.code !== 1000) {
        scheduleReconnectRef.current?.();
      }
    };

    socketRef.current.onerror = () => {
      socketRef.current?.close();
    };
  }, [options, url]);

  const reconnect = useCallback(() => {
    if (attemptCounter.current <= maxRetries) {
      const baseDelay = Math.min(1_000 * 2 * attemptCounter.current, 30_000);
      const jitter = Math.random() * 1_000;
      const delay = baseDelay + jitter;
      reconectionTimer.current = setTimeout(() => {
        attemptCounter.current += 1;
        connect();
      }, delay);
    }
  }, [connect, maxRetries]);

  useEffect(() => {
    scheduleReconnectRef.current = reconnect;
  }, [reconnect]);

  useEffect(() => {
    connect();
    return () => {
      if (reconectionTimer.current) {
        clearTimeout(reconectionTimer.current);
      }
    };
  }, [connect]);

  return {socketRef, status}
};

import { createContext, useContext } from "react";

export const WebSocketContext = createContext<{
  wsRef: React.RefObject<WebSocket | null>;
  subscribe: (handler: (event: MessageEvent) => void) => () => void | undefined;
} | null>(null);

export function useSocketRef() {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error("useSocket outside WebSocketProvider");
  return ctx;
}
