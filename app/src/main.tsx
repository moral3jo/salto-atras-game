import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./estilo.css";
import "./vistas.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
