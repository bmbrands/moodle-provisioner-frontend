import "./styles/globals.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "sonner";
import App from "./App";
import { PrivacyPage } from "./components/PrivacyPage";

// The data protection declaration is a public page outside the app (no login).
const isPrivacyPage = window.location.pathname.replace(/\/+$/, "") === "/privacy";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {isPrivacyPage ? <PrivacyPage /> : <App />}
    <Toaster richColors position="top-right" />
  </React.StrictMode>
);
