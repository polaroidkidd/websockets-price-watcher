import { useEffect, useReducer, useRef } from "react"

type UseWebSocket = {
  url: string
}

export type WebsocketState<T = string> = {
  connected: boolean
  error: string | undefined
  message: T | undefined
}

const DefaultState = {
  connected: false,
  error: undefined,
  message: undefined,
}
type Action<T = string> =
  | {
      type: "connect"
    }
  | {
      type: "close"
    }
  | {
      type: "error"
      text: string
    }
  | {
      type: "message"
      message: T
    }
const reducer = <T>(
  state: WebsocketState<T>,
  action: Action<T>
): WebsocketState<T> => {
  switch (action.type) {
    case "connect": {
      return { ...state, connected: true }
    }
    case "close": {
      return { ...state, connected: false }
    }
    case "error": {
      return { ...state, connected: false, error: action.text }
    }
    case "message": {
      return { ...state, message: action.message }
    }

    default: {
      return state
    }
  }
}

export const useWebSocket = <T = string>({ url }: UseWebSocket) => {
  const socketRef = useRef<WebSocket>(null)
  const [state, dispatch] = useReducer(
    reducer<T>,
    DefaultState as WebsocketState<T>
  )
  useEffect(() => {
    socketRef.current = new WebSocket(url)
    
    socketRef.current.close = () => {
      dispatch({ type: "close" })
    }
    socketRef.current.onopen = () => {
      dispatch({ type: "connect" })
      socketRef.current?.send(JSON.stringify({
      event: "subscribe",
      stocks: ["WF", "DVU"],
    }))
    }

    socketRef.current.onerror = (error: Event) => {
      dispatch({ type: "error", text: error.type })
    }
    socketRef.current.onmessage = (event: MessageEvent<string>) => {
      dispatch({ type: "message", message: JSON.parse(event.data) as T })
    }

    return () => socketRef.current?.close()
  }, [url])

  return { state, socketRef }
}
