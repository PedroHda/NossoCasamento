import { usePlanning } from "../app/context.tsx";
import {
  CATEGORIES,
  GUEST_GROUPS,
  GUEST_STATUSES,
  VENDOR_STATUSES,
  newId,
  nowIso,
  type Collection,
  type RecordItem,
  type Expense,
  type Guest,
  type Task,
  type Vendor,
  type TimelineEvent,
} from "../domain/schema.ts";
import { updateRecord } from "../domain/planning.ts";
import { Modal, SubmitForm, stringField, numberField } from "./ui.tsx";

export function RecordEditor({
  collection,
  record,
  vendorId,
  onClose,
}: {
  collection: Collection;
  record?: RecordItem;
  vendorId?: string;
  onClose: () => void;
}) {
  const { plan, update } = usePlanning();
  const vendor = plan.vendors.find((item) => item.id === vendorId);
  const expense = record as Expense | undefined;
  const guest = record as Guest | undefined;
  const task = record as Task | undefined;
  const supplier = record as Vendor | undefined;
  const event = record as TimelineEvent | undefined;
  const names = {
    expenses: "despesa",
    guests: "convidado",
    tasks: "tarefa",
    vendors: "fornecedor",
    timeline: "momento",
  };
  const title = `${record ? "Editar" : ["expenses", "tasks"].includes(collection) ? "Nova" : "Novo"} ${names[collection]}`;
  async function submit(data: FormData) {
    const base = {
      id: record?.id || newId(),
      name: stringField(data, "name"),
      updatedAt: nowIso(),
    };
    let item: RecordItem;
    if (collection === "expenses")
      item = {
        ...base,
        category: stringField(data, "category") as Expense["category"],
        amount: numberField(data, "amount"),
        estimatedAmount: numberField(data, "estimatedAmount"),
        dueDate: stringField(data, "dueDate"),
        vendorId: stringField(data, "vendorId") || null,
        notes: stringField(data, "notes"),
        payments: expense?.payments || [],
        installments: expense?.installments || [],
        attachments: expense?.attachments || [],
      };
    else if (collection === "guests")
      item = {
        ...base,
        group: stringField(data, "group") as Guest["group"],
        status: stringField(data, "status") as Guest["status"],
        companions: numberField(data, "companions"),
        confirmedCompanions:
          stringField(data, "confirmedCompanions") === ""
            ? null
            : numberField(data, "confirmedCompanions"),
        phone: stringField(data, "phone"),
        dietary: stringField(data, "dietary"),
        notes: stringField(data, "notes"),
        inviteToken: guest?.inviteToken || newId(),
        lastResponseAt: guest?.lastResponseAt || "",
      };
    else if (collection === "tasks")
      item = {
        ...base,
        category: stringField(data, "category") as Task["category"],
        dueDate: stringField(data, "dueDate"),
        done: data.get("done") === "on",
        owner: stringField(data, "owner"),
        priority: stringField(data, "priority") as Task["priority"],
      };
    else if (collection === "vendors")
      item = {
        ...base,
        category: stringField(data, "category") as Vendor["category"],
        contact: stringField(data, "contact"),
        status: stringField(data, "status") as Vendor["status"],
        notes: stringField(data, "notes"),
        quoteAmount:
          stringField(data, "quoteAmount") === ""
            ? null
            : numberField(data, "quoteAmount"),
      };
    else
      item = {
        ...base,
        date: stringField(data, "date"),
        time: stringField(data, "time"),
        location: stringField(data, "location"),
        notes: stringField(data, "notes"),
      };
    await update((current) =>
      updateRecord(current, collection, item, record?.updatedAt),
    );
  }
  return (
    <Modal
      title={title}
      subtitle="Mais um detalhe do nosso grande dia."
      onClose={onClose}
    >
      <SubmitForm
        onSubmit={submit}
        onClose={onClose}
        label={`Salvar ${names[collection]}`}
      >
        <label>
          {collection === "guests" ? "Nome do convidado" : "Nome / descrição"}
          <input
            name="name"
            defaultValue={record?.name || vendor?.name || ""}
            maxLength={160}
            required
            autoFocus
          />
        </label>
        {collection !== "guests" && collection !== "timeline" && (
          <label>
            Categoria
            <select
              name="category"
              defaultValue={
                (record as Expense)?.category ||
                vendor?.category ||
                CATEGORIES[0]
              }
            >
              {CATEGORIES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        )}
        {collection === "expenses" && (
          <>
            <div className="form-grid">
              <label>
                Valor estimado (R$)
                <input
                  name="estimatedAmount"
                  type="number"
                  min="0"
                  max="1000000000"
                  step="0.01"
                  defaultValue={
                    expense?.estimatedAmount ?? vendor?.quoteAmount ?? ""
                  }
                  required
                />
              </label>
              <label>
                Valor contratado (R$)
                <input
                  name="amount"
                  type="number"
                  min="0"
                  max="1000000000"
                  step="0.01"
                  defaultValue={expense?.amount ?? vendor?.quoteAmount ?? ""}
                  required
                />
              </label>
            </div>
            <label>
              Fornecedor vinculado
              <select
                name="vendorId"
                defaultValue={expense?.vendorId || vendorId || ""}
              >
                <option value="">Sem fornecedor</option>
                {expense?.vendorId &&
                  !plan.vendors.some(
                    (item) => item.id === expense.vendorId,
                  ) && (
                    <option value={expense.vendorId}>
                      Fornecedor na lixeira
                    </option>
                  )}
                {plan.vendors.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Vencimento do saldo
              <input
                type="date"
                name="dueDate"
                defaultValue={expense?.dueDate || ""}
                min="1900-01-01"
                max="2100-12-31"
              />
            </label>
            <p className="field-note">
              Depois de salvar, abra “Pagamentos e parcelas” para registrar
              pagamentos ou dividir o saldo.
            </p>
          </>
        )}
        {collection === "guests" && (
          <>
            <div className="form-grid">
              <label>
                Grupo
                <select name="group" defaultValue={guest?.group || "Família"}>
                  {GUEST_GROUPS.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label>
                Limite de acompanhantes
                <input
                  name="companions"
                  type="number"
                  min="0"
                  max="20"
                  step="1"
                  defaultValue={guest?.companions || 0}
                  required
                />
              </label>
            </div>
            <div className="form-grid">
              <label>
                Confirmação
                <select
                  name="status"
                  defaultValue={guest?.status || "Pendente"}
                >
                  {GUEST_STATUSES.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label>
                Acompanhantes confirmados
                <input
                  name="confirmedCompanions"
                  type="number"
                  min="0"
                  max="20"
                  step="1"
                  defaultValue={guest?.confirmedCompanions ?? ""}
                  placeholder="Vazio = limite do convite"
                />
              </label>
            </div>
            <label>
              Contato
              <input
                name="phone"
                defaultValue={guest?.phone || ""}
                maxLength={80}
              />
            </label>
            <label>
              Restrições alimentares
              <input
                name="dietary"
                defaultValue={guest?.dietary || ""}
                maxLength={300}
                placeholder="Ex.: vegetariano, alergia a amendoim"
              />
            </label>
          </>
        )}
        {collection === "tasks" && (
          <>
            <label>
              Fazer até
              <input
                name="dueDate"
                type="date"
                defaultValue={task?.dueDate || ""}
                min="1900-01-01"
                max="2100-12-31"
              />
            </label>
            <div className="form-grid">
              <label>
                Responsável
                <input
                  name="owner"
                  maxLength={80}
                  defaultValue={task?.owner || "Nós"}
                />
              </label>
              <label>
                Prioridade
                <select
                  name="priority"
                  defaultValue={task?.priority || "Normal"}
                >
                  <option>Normal</option>
                  <option>Alta</option>
                </select>
              </label>
            </div>
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="done"
                defaultChecked={task?.done || false}
              />{" "}
              Tarefa concluída
            </label>
          </>
        )}
        {collection === "vendors" && (
          <>
            <div className="form-grid">
              <label>
                Proposta (R$)
                <input
                  name="quoteAmount"
                  type="number"
                  min="0"
                  max="1000000000"
                  step="0.01"
                  defaultValue={supplier?.quoteAmount ?? ""}
                />
              </label>
              <label>
                Etapa
                <select
                  name="status"
                  defaultValue={supplier?.status || "Em pesquisa"}
                >
                  {VENDOR_STATUSES.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Contato
              <input
                name="contact"
                maxLength={200}
                defaultValue={supplier?.contact || ""}
                placeholder="Telefone, e-mail ou @instagram"
              />
            </label>
          </>
        )}
        {collection === "timeline" && (
          <>
            <div className="form-grid">
              <label>
                Data
                <input
                  type="date"
                  name="date"
                  defaultValue={event?.date || plan.settings.weddingDate}
                  min="1900-01-01"
                  max="2100-12-31"
                  required
                />
              </label>
              <label>
                Horário de Brasília
                <input
                  type="time"
                  name="time"
                  defaultValue={event?.time || "16:00"}
                  required
                />
              </label>
            </div>
            <label>
              Local
              <input
                name="location"
                maxLength={200}
                defaultValue={event?.location || plan.settings.location}
              />
            </label>
          </>
        )}
        {collection !== "tasks" && (
          <label>
            Observações
            <textarea
              name="notes"
              rows={3}
              maxLength={1000}
              defaultValue={(record as Expense)?.notes || ""}
            />
          </label>
        )}
      </SubmitForm>
    </Modal>
  );
}
