import { useCallback, useEffect, useReducer, useRef } from "react"

type UseWebSocket = {
  url: string
  onMessage?: (data: string) => void
}

export type WebsocketState = {
  connected: boolean
  error: string | undefined
}

const DefaultState: WebsocketState = {
  connected: false,
  error: undefined,
}

type Action =
  | { type: "connect" }
  | { type: "close" }
  | { type: "error"; text: string }

const reducer = (state: WebsocketState, action: Action): WebsocketState => {
  switch (action.type) {
    case "connect":
      return { ...state, connected: true }
    case "close":
      return { ...state, connected: false }
    case "error":
      return { ...state, connected: false, error: action.text }
    default:
      return state
  }
}

export const useWebSocket = ({ url, onMessage }: UseWebSocket) => {
  const socketRef = useRef<WebSocket | null>(null)
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  const [state, dispatch] = useReducer(reducer, DefaultState)

  useEffect(() => {
    const ws = new WebSocket(url)
    socketRef.current = ws

    ws.onopen = () => dispatch({ type: "connect" })
    ws.onclose = () => dispatch({ type: "close" })
    ws.onerror = (event: Event) => dispatch({ type: "error", text: event.type })
    ws.onmessage = (event: MessageEvent) => onMessageRef.current?.(event.data)

    return () => {
      ws.onopen = null
      ws.onclose = null
      ws.onerror = null
      ws.onmessage = null
      ws.close()
      socketRef.current = null
    }
  }, [url])

  const send = useCallback((payload: unknown) => {
    const ws = socketRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(typeof payload === "string" ? payload : JSON.stringify(payload))
    }
  }, [])

  return {
    isConnected: state.connected,
    error: state.error,
    send,
  }
}
