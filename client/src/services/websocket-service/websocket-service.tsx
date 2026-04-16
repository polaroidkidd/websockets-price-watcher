import { useCallback } from "react";
import { useWebsocket, WebSocketContext } from "./use-websocket";

type WebSocketProvider = {
  url: string;
  children: React.ReactNode;
};

export function WebSocketProvider({ url, children }: WebSocketProvider) {
  const { socketRef, status } = useWebsocket(url);

  const subscribe = useCallback(
    (handler: (event: MessageEvent) => void) => {
      const socket = socketRef.current;
      if (status) {
        socket?.addEventListener("message", handler);
      }
      return () => socket?.removeEventListener("message", handler);
    },
    [socketRef, status],
  );

  return (
    <WebSocketContext.Provider value={{ wsRef: socketRef, subscribe }}>
      {children}
    </WebSocketContext.Provider>
  );
}
