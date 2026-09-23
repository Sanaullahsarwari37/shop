import { Component, StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { LanguageProvider } from "./i18n/LanguageContext";
import { ToastProvider } from "./components/Toast";
import { SettingsProvider } from "./contexts/SettingsContext";

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            fontFamily: "system-ui, sans-serif",
            padding: 32,
            maxWidth: 560,
            margin: "40px auto",
            color: "#0f172a",
          }}
        >
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: "#64748b", fontSize: 14, marginBottom: 16 }}>
            {this.state.error.message}
          </p>
          <pre
            style={{
              background: "#f1f5f9",
              padding: 12,
              borderRadius: 8,
              fontSize: 12,
              overflow: "auto",
            }}
          >
            {this.state.error.stack}
          </pre>
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.removeItem("shop_settings_v3");
                localStorage.removeItem("shop_settings_v2");
                localStorage.removeItem("shop_settings_v1");
              } catch {}
              window.location.reload();
            }}
            style={{
              marginTop: 16,
              padding: "10px 16px",
              background: "#0ea5e9",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Clear theme settings & reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <SettingsProvider>
        <LanguageProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </LanguageProvider>
      </SettingsProvider>
    </ErrorBoundary>
  </StrictMode>
);
