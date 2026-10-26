import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { paths, logo } from "../icons.js";
import { usePlanning } from "../app/context.tsx";
import {
  errorMessage,
  type Collection,
  type RecordItem,
} from "../domain/schema.ts";
import { moveToTrash } from "../domain/planning.ts";

export function Icon({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  return (
    <svg
      className={`icon ${className}`}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{
        __html: paths[name as keyof typeof paths] || paths.heart,
      }}
    />
  );
}
export function Logo() {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      dangerouslySetInnerHTML={{
        __html: logo.replace(/^<svg[^>]*>|<\/svg>$/g, ""),
      }}
    />
  );
}
export function Badge({
  children,
  color = "green",
}: {
  children: ReactNode;
  color?: string;
}) {
  return (
    <span className={`badge ${color}`}>
      <i className="status-dot" />
      {children}
    </span>
  );
}
export function PageHeading({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">PLANEJANDO O NOSSO SIM</div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
export function CardHeading({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="card-heading">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
export function EmptyState({
  title,
  description,
  children,
  symbol = "heart",
}: {
  title: string;
  description: string;
  children?: ReactNode;
  symbol?: string;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name={symbol} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function Filters({
  options,
  selected,
  onFilter,
  query,
  onQuery,
  placeholder,
}: {
  options: string[];
  selected: string;
  onFilter: (value: string) => void;
  query: string;
  onQuery: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="list-toolbar">
      <div className="filter-tabs" aria-label="Filtrar registros">
        {options.map((option) => (
          <button
            key={option}
            className={`filter-tab ${option === selected ? "selected" : ""}`}
            aria-pressed={option === selected}
            onClick={() => onFilter(option)}
          >
            {option}
          </button>
        ))}
      </div>
      <label className="table-search">
        <Icon name="search" />
        <input
          type="search"
          aria-label={placeholder}
          placeholder={placeholder}
          value={query}
          onChange={(event) => onQuery(event.target.value)}
        />
      </label>
    </div>
  );
}
export const matchesQuery = (value: string, query: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .includes(
      query
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase(),
    );
export function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? "wide-modal" : ""}
      aria-labelledby="dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            onClose();
        }
      }}
    >
      <div className="dialog-heading">
        <div>
          <span className="eyebrow">CADA DETALHE IMPORTA</span>
          <h2 id="dialog-title">{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label="Fechar janela"
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Confirm({
  title,
  description,
  label,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  label: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={title} subtitle={description} onClose={onClose}>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <button className="button secondary" disabled={busy} onClick={onClose}>
          Cancelar
        </button>
        <button
          className="button danger"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
              onClose();
            } catch (error) {
              setError(errorMessage(error));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Salvando…" : label}
        </button>
      </div>
    </Modal>
  );
}
export function DeleteRecord({
  collection,
  record,
  onClose,
}: {
  collection: Collection;
  record: RecordItem;
  onClose: () => void;
}) {
  const { update } = usePlanning();
  return (
    <Confirm
      title="Guardar este detalhe na lixeira?"
      description={`“${record.name}” sairá da lista. Você poderá restaurá-lo em Configurações.`}
      label="Mover para a lixeira"
      onClose={onClose}
      onConfirm={() =>
        update(
          (plan) => moveToTrash(plan, collection, record.id),
          "Registro movido para a lixeira.",
        )
      }
    />
  );
}
export function RowActions({
  name,
  onEdit,
  onDelete,
}: {
  name: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="row-actions">
      <button
        className="icon-button"
        onClick={onEdit}
        aria-label={`Editar ${name}`}
      >
        <Icon name="edit" />
      </button>
      <button
        className="icon-button danger-hover"
        onClick={onDelete}
        aria-label={`Excluir ${name}`}
      >
        <Icon name="trash" />
      </button>
    </div>
  );
}
export function SubmitForm({
  children,
  onSubmit,
  onClose,
  label = "Salvar",
  formId,
  disabled = false,
}: {
  children: ReactNode;
  onSubmit: (data: FormData) => Promise<void>;
  onClose: () => void;
  label?: string;
  formId?: string;
  disabled?: boolean;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await onSubmit(data);
      onClose();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form id={formId} onSubmit={submit}>
      {children}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <button
          type="button"
          className="button secondary"
          disabled={busy}
          onClick={onClose}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="button primary"
          disabled={busy || disabled}
        >
          <Icon name="check" />
          {busy ? "Salvando…" : label}
        </button>
      </div>
    </form>
  );
}
export const stringField = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();
export const numberField = (data: FormData, key: string) =>
  Number(data.get(key));
export function ActionButton({
  action,
  children,
  className = "button secondary",
}: {
  action: () => Promise<unknown>;
  children: ReactNode;
  className?: string;
}) {
  const { notify } = usePlanning();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className={className}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await action();
        } catch (error) {
          if (!/cancel|aborted/i.test(errorMessage(error)))
            notify(errorMessage(error), true);
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Preparando…" : children}
    </button>
  );
}
