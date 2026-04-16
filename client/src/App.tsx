import "./App.css";
import heroImg from "./assets/hero.png";
import reactLogo from "./assets/react.svg";
import viteLogo from "./assets/vite.svg";
import { PriceWatcher } from "./components/price-watcher/price-watcher";

import { WebSocketProvider } from "./services/websocket-service/websocket-service";

function App() {
  return (
    <WebSocketProvider url="ws://0.0.0.0:8080">
      <section id="center">
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>
        <div>
          <h1>Web Socket Demo</h1>
          <PriceWatcher />
        </div>
      </section>
    </WebSocketProvider>
  );
}

export default App;
