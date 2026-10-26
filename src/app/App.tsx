import { useEffect, useState } from "react";
import { App as NativeApp } from "@capacitor/app";
import { usePlanning } from "./context.tsx";
import { isNative } from "../services/files.ts";
import { formatDate } from "../domain/planning.ts";
import { type Collection, type RecordItem } from "../domain/schema.ts";
import {
  Icon,
  Logo,
  Modal,
  matchesQuery,
  DeleteRecord,
} from "../components/ui.tsx";
import { RecordEditor } from "../components/edit-record.tsx";
import { ExpenseDetails } from "../components/expense-details.tsx";
import { GuestInvitation, ImportResponse } from "../components/invitations.tsx";
import { Overview, type ViewActions } from "../views/overview.tsx";
import {
  Budget,
  Guests,
  Tasks,
  Vendors,
  Timeline,
} from "../views/collections.tsx";
import { Reminders, Settings } from "../views/settings.tsx";

const views = {
  overview: "Visão geral",
  budget: "Orçamento",
  guests: "Convidados",
  tasks: "Checklist",
  vendors: "Fornecedores",
  timeline: "Cronograma",
  reminders: "Lembretes",
  settings: "Configurações",
};
type Route = keyof typeof views;
type Editor =
  | {
      kind: "edit";
      collection: Collection;
      record?: RecordItem;
      vendorId?: string;
    }
  | { kind: "delete"; collection: Collection; record: RecordItem }
  | { kind: "finance"; id: string }
  | { kind: "invite"; id: string }
  | { kind: "search" | "response" }
  | null;
const routeFromHash = () =>
  Object.hasOwn(views, location.hash.slice(1))
    ? (location.hash.slice(1) as Route)
    : "overview";
export function App() {
  const { plan, busy } = usePlanning();
  const [route, setRoute] = useState<Route>(routeFromHash);
  const [editor, setEditor] = useState<Editor>(null);
  const [menu, setMenu] = useState(false);
  const [mobile, setMobile] = useState(matchMedia("(max-width:780px)").matches);
  useEffect(() => {
    const change = () => {
      if (location.hash === "#main-content") return;
      setRoute(routeFromHash());
      setMenu(false);
      setEditor(null);
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    const mq = matchMedia("(max-width:780px)");
    const listener = () => setMobile(mq.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);
  useEffect(() => {
    document.body.classList.toggle("menu-open", menu);
    return () => document.body.classList.remove("menu-open");
  }, [menu]);
  useEffect(() => {
    document.title = `${views[route]} · Nosso Casamento`;
  }, [route]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(false);
      if (
        event.key === "/" &&
        !document.querySelector("dialog[open]") &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          document.activeElement?.tagName || "",
        )
      ) {
        event.preventDefault();
        setEditor({ kind: "search" });
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    if (!isNative()) return;
    const listener = NativeApp.addListener("backButton", async () => {
      const dialog = document.querySelector<HTMLDialogElement>("dialog[open]");
      if (dialog) {
        setEditor(null);
        dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
      } else if (menu) setMenu(false);
      else if (route !== "overview") location.hash = "overview";
      else await NativeApp.minimizeApp();
    });
    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, [menu, route]);
  const actions: ViewActions = {
    edit: (collection, record, vendorId) =>
      setEditor({ kind: "edit", collection, record, vendorId }),
    remove: (collection, record) =>
      setEditor({ kind: "delete", collection, record }),
    finance: (id) => setEditor({ kind: "finance", id }),
    invite: (id) => setEditor({ kind: "invite", id }),
    response: () => setEditor({ kind: "response" }),
  };
  const links: [Route, string][] = [
    ["overview", "grid"],
    ["budget", "wallet"],
    ["guests", "users"],
    ["tasks", "checklist"],
    ["vendors", "store"],
    ["timeline", "calendar"],
    ["reminders", "bell"],
  ];
  return (
    <>
      <a className="skip-link" href="#main-content">
        Pular para o conteúdo
      </a>
      <aside
        className="sidebar"
        id="sidebar"
        aria-label="Menu principal"
        inert={mobile && !menu}
      >
        <a className="brand" href="#overview">
          <span className="brand-mark">
            <Logo />
          </span>
          <span>
            nosso
            <span className="brand-second">
              casamento<span className="brand-dot">.</span>
            </span>
          </span>
        </a>
        <button
          className="sidebar-close icon-button"
          aria-label="Fechar menu"
          onClick={() => setMenu(false)}
        >
          <Icon name="close" />
        </button>
        <span className="sidebar-caption">O NOSSO PLANEJAMENTO</span>
        <nav>
          {links.map(([key, symbol]) => (
            <a
              className={`nav-item ${route === key ? "active" : ""}`}
              key={key}
              href={`#${key}`}
              aria-current={route === key ? "page" : undefined}
            >
              <Icon name={symbol} />
              <span>{views[key]}</span>
              {key === "tasks" && (
                <span className="nav-count">
                  {plan.tasks.filter((item) => !item.done).length}
                </span>
              )}
            </a>
          ))}
        </nav>
        <div className="sidebar-love">
          <span className="love-doodle">
            <Icon name="heart" />
          </span>
          <p>
            Um dia especial.
            <br />
            <strong>Uma vida inteira juntos.</strong>
          </p>
          <span>Cada detalhe conta uma história.</span>
        </div>
        <div className="sidebar-bottom">
          <a
            className={`nav-item ${route === "settings" ? "active" : ""}`}
            href="#settings"
          >
            <Icon name="settings" />
            <span>Configurações</span>
          </a>
          <div className="sidebar-date">
            <Icon name="calendar" />
            <span>{formatDate(plan.settings.weddingDate, true)}</span>
            <span className="tiny-star">✦</span>
          </div>
        </div>
      </aside>
      <button
        className="mobile-overlay"
        aria-label="Fechar menu"
        onClick={() => setMenu(false)}
      />
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-expanded={menu}
              aria-controls="sidebar"
              aria-label="Abrir menu"
              onClick={() => setMenu(!menu)}
            >
              <Icon name="menu" />
            </button>
            <span className="breadcrumb-home">Nosso casamento</span>
            <span className="breadcrumb-slash">/</span>
            <strong>{views[route]}</strong>
          </div>
          <div className="topbar-actions">
            <span className="local-mode">
              <i />
              {busy ? "Salvando…" : "Modo local"}
            </span>
            <button
              className="search-trigger"
              aria-label="Buscar no planejamento"
              onClick={() => setEditor({ kind: "search" })}
            >
              <Icon name="search" />
              <span>Buscar no planejamento</span>
              <kbd>/</kbd>
            </button>
            <span className="header-divider" />
            <a
              className="icon-button notification"
              href="#reminders"
              aria-label="Ver lembretes"
            >
              <Icon name="bell" />
              <span />
            </a>
            <a
              className="avatar"
              href="#settings"
              aria-label="Configurações do casal"
            >
              <Icon name="heart" />
            </a>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          {route === "overview" ? (
            <Overview actions={actions} />
          ) : route === "budget" ? (
            <Budget actions={actions} />
          ) : route === "guests" ? (
            <Guests actions={actions} />
          ) : route === "tasks" ? (
            <Tasks actions={actions} />
          ) : route === "vendors" ? (
            <Vendors actions={actions} />
          ) : route === "timeline" ? (
            <Timeline actions={actions} />
          ) : route === "reminders" ? (
            <Reminders />
          ) : (
            <Settings key={plan.id} />
          )}
          <footer className="page-footer">
            <span>
              <Logo /> Nosso casamento<span className="footer-dot">·</span>feito
              para o nosso sim.
            </span>
            {plan.demo ? (
              <a className="demo-indicator" href="#settings">
                <i /> Explorando dados de exemplo
              </a>
            ) : (
              <span className="saved-indicator">
                Dados salvos neste aparelho
              </span>
            )}
          </footer>
        </main>
      </div>
      {editor?.kind === "edit" && (
        <RecordEditor
          collection={editor.collection}
          record={editor.record}
          vendorId={editor.vendorId}
          onClose={() => setEditor(null)}
        />
      )}
      {editor?.kind === "delete" && (
        <DeleteRecord
          collection={editor.collection}
          record={editor.record}
          onClose={() => setEditor(null)}
        />
      )}
      {editor?.kind === "finance" && (
        <ExpenseDetails id={editor.id} onClose={() => setEditor(null)} />
      )}
      {editor?.kind === "invite" &&
        plan.guests.some((item) => item.id === editor.id) && (
          <GuestInvitation
            guest={plan.guests.find((item) => item.id === editor.id)!}
            onClose={() => setEditor(null)}
          />
        )}
      {editor?.kind === "response" && (
        <ImportResponse onClose={() => setEditor(null)} />
      )}
      {editor?.kind === "search" && (
        <Search actions={actions} onClose={() => setEditor(null)} />
      )}
    </>
  );
}
function Search({
  actions,
  onClose,
}: {
  actions: ViewActions;
  onClose: () => void;
}) {
  const { plan } = usePlanning();
  const [query, setQuery] = useState("");
  const collections: [Collection, string][] = [
    ["expenses", "Despesa"],
    ["guests", "Convidado"],
    ["tasks", "Tarefa"],
    ["vendors", "Fornecedor"],
    ["timeline", "Cronograma"],
  ];
  const results = query.trim()
    ? collections
        .flatMap(([collection, label]) =>
          plan[collection]
            .filter((item) => matchesQuery(item.name, query.trim()))
            .map((record) => ({ collection, label, record })),
        )
        .slice(0, 20)
    : [];
  return (
    <Modal
      title="O que estamos procurando?"
      subtitle="Busque um detalhe do nosso planejamento."
      onClose={onClose}
    >
      <label className="global-search-field">
        <Icon name="search" />
        <input
          type="search"
          autoFocus
          aria-label="Buscar em todo o planejamento"
          placeholder="Digite um nome ou detalhe…"
          maxLength={160}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="search-results">
        {results.map((item) => (
          <button
            className="search-result"
            key={item.record.id}
            onClick={() => actions.edit(item.collection, item.record)}
          >
            <span>
              <small>{item.label}</small>
              <strong>{item.record.name}</strong>
            </span>
            <Icon name="arrow" />
          </button>
        ))}
        {!results.length && (
          <p className="muted">
            {query
              ? "Nenhum resultado encontrado. Tente outro termo."
              : "Os resultados vão aparecer aqui."}
          </p>
        )}
      </div>
    </Modal>
  );
}
