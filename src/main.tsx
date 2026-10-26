import { createRoot } from "react-dom/client";
import { useEffect, useState, Component, type ReactNode } from "react";
import "./style.css";
import "./improvements.css";
import { App } from "./app/App.tsx";
import { PlanningProvider } from "./app/context.tsx";
import { PublicRsvp } from "./components/invitations.tsx";

class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="recovery-page card">
        <h1>Vamos abrir os nossos planos de novo.</h1>
        <p>
          Houve um problema ao exibir a tela. Seus dados salvos continuam no
          aparelho.
        </p>
        <button className="button primary" onClick={() => location.reload()}>
          Recarregar
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
function Root() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const listener = () => setHash(location.hash);
    window.addEventListener("hashchange", listener);
    return () => window.removeEventListener("hashchange", listener);
  }, []);
  return hash.startsWith("#rsvp/") ? (
    <PublicRsvp code={hash.slice(6)} />
  ) : (
    <PlanningProvider>
      <App />
    </PlanningProvider>
  );
}
createRoot(document.getElementById("app")!).render(
  <ErrorBoundary>
    <Root />
  </ErrorBoundary>,
);
