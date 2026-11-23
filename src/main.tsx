import "./styles/globals.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "sonner";
import App from "./App";
import { PrivacyPage } from "./components/PrivacyPage";

// The data protection declaration is a public page outside the app (no login).
// Linked as "/?privacy" so it works on any web server without an SPA
// fallback; "/privacy" also works where the server provides one (nucky).
const isPrivacyPage =
  new URLSearchParams(window.location.search).has("privacy") ||
  window.location.pathname.replace(/\/+$/, "") === "/privacy";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {isPrivacyPage ? <PrivacyPage /> : <App />}
    <Toaster richColors position="top-right" />
  </React.StrictMode>
);
