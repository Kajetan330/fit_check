import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { App } from "./App";
import { registerServiceWorker } from "./lib/registerServiceWorker";
import { AppStateProvider } from "./state";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppStateProvider>
        <App />
        <Analytics />
      </AppStateProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

registerServiceWorker();
