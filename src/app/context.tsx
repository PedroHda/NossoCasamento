import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Plan } from "../domain/schema.ts";
import { errorMessage } from "../domain/schema.ts";
import { createPlan, parsePlan } from "../domain/migration.ts";
import { createServices, type ApplicationServices } from "../data/services.ts";
import { RevisionConflictError } from "../data/contracts.ts";
import { scheduleReminders } from "../services/reminders.ts";
import { saveText } from "../services/files.ts";

interface Notice {
  message: string;
  error?: boolean;
  undo?: () => void;
}
interface PlanningContext {
  plan: Plan;
  busy: boolean;
  notificationCount: number;
  notify: (message: string, error?: boolean) => void;
  update: (
    transform: (current: Plan) => Plan,
    message?: string,
    undoable?: boolean,
  ) => Promise<void>;
  replace: (plan: Plan, message: string) => Promise<void>;
}
const Context = createContext<PlanningContext | null>(null);
export const usePlanning = () => {
  const context = useContext(Context);
  if (!context) throw new Error("Planejamento indisponível.");
  return context;
};

export function PlanningProvider({
  children,
  services: supplied,
}: {
  children: ReactNode;
  services?: ApplicationServices;
}) {
  const services = useRef<ApplicationServices | null>(supplied || null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const current = useRef<Plan | null>(null);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const notify = (message: string, error = false) =>
    setNotice({ message, error });
  const accept = (value: Plan) => {
    current.current = value;
    setPlan(value);
  };
  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | undefined;
    try {
      services.current ||= createServices();
    } catch (error) {
      setLoadError(errorMessage(error));
      return;
    }
    const repository = services.current.repository;
    void repository
      .load()
      .then(async (loaded) => {
        let initial = loaded;
        if (!initial) {
          try {
            initial = await repository.save(createPlan(), 0);
          } catch (error) {
            if (!(error instanceof RevisionConflictError)) throw error;
            initial = await repository.load();
            if (!initial) throw error;
          }
        }
        if (mounted) {
          accept(initial);
          setLoadError("");
        }
      })
      .catch((error) => {
        if (mounted) setLoadError(errorMessage(error));
      });
    unsubscribe = repository.subscribe(() => {
      void repository
        .load()
        .then((value) => {
          if (
            mounted &&
            value &&
            value.revision !== current.current?.revision
          ) {
            accept(value);
            notify("Planejamento atualizado por outra aba.");
          }
          if (mounted && !value)
            setLoadError(
              "O armazenamento foi limpo em outra aba. Recarregue ou importe seu backup.",
            );
        })
        .catch((error) => {
          if (mounted) notify(errorMessage(error), true);
        });
    });
    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), notice.undo ? 12000 : 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!plan) return;
    let mounted = true;
    void scheduleReminders(plan)
      .then((count) => {
        if (mounted) setNotificationCount(count);
      })
      .catch((error) => {
        if (mounted) {
          setNotificationCount(0);
          notify(errorMessage(error), true);
        }
      });
    return () => {
      mounted = false;
    };
  }, [plan]);

  const update: PlanningContext["update"] = async (
    transform,
    message = "Detalhe salvo com carinho.",
    undoable = true,
  ) => {
    if (saving.current)
      throw new Error("Aguarde a gravação anterior terminar.");
    const repository = services.current!.repository;
    const before = current.current!;
    saving.current = true;
    setBusy(true);
    try {
      const next = await repository.save(
        transform(structuredClone(before)),
        before.revision,
      );
      accept(next);
      setNotice({
        message,
        undo: undoable
          ? () => {
              if (current.current?.revision !== next.revision) {
                notify(
                  "Há alterações mais recentes. Use a lixeira para restaurar registros excluídos.",
                  true,
                );
                return;
              }
              void update(
                () => ({ ...before, revision: next.revision }),
                "Alteração desfeita.",
                false,
              ).catch((error) => notify(errorMessage(error), true));
            }
          : undefined,
      });
    } catch (error) {
      if (error instanceof RevisionConflictError) {
        const fresh = await repository.load();
        if (fresh) accept(fresh);
      }
      if (
        error instanceof DOMException &&
        ["QuotaExceededError", "SecurityError"].includes(error.name)
      )
        throw new Error(
          "Não foi possível salvar no armazenamento local. Exporte um backup e libere espaço, inclusive na lixeira.",
        );
      throw error;
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  const replace: PlanningContext["replace"] = async (imported, message) => {
    if (saving.current)
      throw new Error("Aguarde a gravação anterior terminar.");
    saving.current = true;
    setBusy(true);
    try {
      const saved = await services.current!.repository.replace(imported);
      accept(saved);
      setLoadError("");
      notify(message);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  if (loadError)
    return (
      <main className="recovery-page card">
        <h1>Vamos cuidar dos nossos dados.</h1>
        <p role="alert">{loadError}</p>
        <p>
          Baixe uma cópia dos dados locais antes de substituí-los por um backup.
        </p>
        <button
          className="button secondary"
          onClick={() => {
            void services.current?.repository
              .rawBackup()
              .then((raw) =>
                saveText("nosso-casamento-recuperacao.json", raw || "{}"),
              )
              .catch((error) => notify(errorMessage(error), true));
          }}
        >
          Baixar cópia dos dados locais
        </button>
        <label className="button primary">
          Importar backup para substituir
          <input
            hidden
            type="file"
            accept="application/json,.json"
            onChange={async (event) => {
              const file = event.currentTarget.files?.[0];
              if (!file) return;
              try {
                if (file.size > 6 * 1024 * 1024)
                  throw new Error("Use um backup de até 6 MB.");
                const imported = parsePlan(JSON.parse(await file.text()));
                if (
                  window.confirm(
                    "Substituir os dados locais pelo backup selecionado? Preserve uma cópia antes de continuar.",
                  )
                )
                  await replace(imported, "Planejamento recuperado.");
              } catch (error) {
                setLoadError(errorMessage(error));
              }
            }}
          />
        </label>
        {notice && <p role="alert">{notice.message}</p>}
      </main>
    );
  if (!plan)
    return (
      <div className="loading-page">
        <span className="loading-heart">♡</span>
        <p>Abrindo os nossos planos…</p>
      </div>
    );
  return (
    <Context.Provider
      value={{ plan, busy, notificationCount, notify, update, replace }}
    >
      {children}
      {notice && (
        <div
          className={`toast visible ${notice.error ? "is-error" : ""}`}
          role={notice.error ? "alert" : "status"}
        >
          <span>{notice.message}</span>
          {notice.undo && <button onClick={notice.undo}>Desfazer</button>}
          <button
            className="toast-close"
            onClick={() => setNotice(null)}
            aria-label="Fechar mensagem"
          >
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
