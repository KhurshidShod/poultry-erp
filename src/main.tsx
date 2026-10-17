
import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import { ThemeProvider } from "./context/ThemeContext";
import { WarehouseProvider } from "./context/WarehouseContext";

import "./index.css";

ReactDOM.createRoot(
  document.getElementById("root")!
).render(
  <React.StrictMode>
    <ThemeProvider>
      <WarehouseProvider>
        <App />
      </WarehouseProvider>
    </ThemeProvider>
  </React.StrictMode>
);
