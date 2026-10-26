import { useState } from "react";
import { usePlanning } from "../app/context.tsx";
import { newId, nowIso, type Expense } from "../domain/schema.ts";
import {
  paidAmount,
  remainingAmount,
  installmentRemaining,
  generateInstallments,
  formatDate,
  money,
  today,
} from "../domain/planning.ts";
import { readAttachment, downloadAttachment } from "../services/files.ts";
import {
  Modal,
  SubmitForm,
  stringField,
  numberField,
  Icon,
  Badge,
  ActionButton,
} from "./ui.tsx";

export function ExpenseDetails({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const { plan, update } = usePlanning();
  const [tab, setTab] = useState("Pagamentos");
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState("");
  const [remove, setRemove] = useState("");
  const expense = plan.expenses.find((item) => item.id === id);
  if (!expense)
    return (
      <Modal title="A despesa foi removida" onClose={onClose}>
        <p>
          Este registro não está mais na lista. Confira a lixeira em
          Configurações.
        </p>
      </Modal>
    );
  const pending = expense.installments.filter(
    (item) => installmentRemaining(expense, item) > 0,
  );
  const selectedInstallment = expense.installments.find(
    (item) => item.id === selected,
  );
  function change(transform: (expense: Expense) => Expense, message?: string) {
    return update(
      (current) => ({
        ...current,
        expenses: current.expenses.map((item) =>
          item.id === id ? { ...transform(item), updatedAt: nowIso() } : item,
        ),
      }),
      message,
    );
  }
  return (
    <Modal
      wide
      title={expense.name}
      subtitle="Cada pagamento e cada detalhe, no mesmo lugar."
      onClose={onClose}
    >
      <div className="finance-summary">
        <div>
          <span>Contratado</span>
          <strong>{money(expense.amount)}</strong>
        </div>
        <div>
          <span>Já pago</span>
          <strong>{money(paidAmount(expense))}</strong>
        </div>
        <div>
          <span>Falta pagar</span>
          <strong>{money(remainingAmount(expense))}</strong>
        </div>
      </div>
      <div className="filter-tabs modal-tabs">
        {["Pagamentos", "Parcelas", "Comprovantes"].map((item) => (
          <button
            key={item}
            className={`filter-tab ${tab === item ? "selected" : ""}`}
            aria-pressed={tab === item}
            onClick={() => {
              setTab(item);
              setAdding(false);
              setRemove("");
            }}
          >
            {item}
          </button>
        ))}
      </div>
      {tab === "Pagamentos" && (
        <>
          <div className="detail-list">
            {expense.payments.map((payment) => (
              <div className="detail-row" key={payment.id}>
                <span className="category-symbol green">
                  <Icon name="coins" />
                </span>
                <div>
                  <strong>{money(payment.amount)}</strong>
                  <small>
                    {payment.date
                      ? formatDate(payment.date, true)
                      : "Data não informada · saldo importado"}
                    {payment.installmentId
                      ? ` · ${expense.installments.find((item) => item.id === payment.installmentId)?.name}`
                      : " · pagamento avulso"}
                  </small>
                  {payment.note && <p>{payment.note}</p>}
                </div>
                {payment.receiptId && (
                  <ActionButton
                    className="icon-button"
                    action={() =>
                      downloadAttachment(
                        expense.attachments.find(
                          (item) => item.id === payment.receiptId,
                        )!,
                      )
                    }
                  >
                    <span className="sr-only">Baixar comprovante</span>
                    <Icon name="download" />
                  </ActionButton>
                )}
                {remove === payment.id ? (
                  <div className="inline-confirm">
                    <ActionButton
                      className="button danger"
                      action={() =>
                        change(
                          (item) => ({
                            ...item,
                            payments: item.payments.filter(
                              (entry) => entry.id !== payment.id,
                            ),
                          }),
                          "Pagamento removido. Você pode desfazer a alteração.",
                        ).then(() => setRemove(""))
                      }
                    >
                      Confirmar
                    </ActionButton>
                    <button className="text-link" onClick={() => setRemove("")}>
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    className="icon-button danger-hover"
                    aria-label={`Remover pagamento de ${money(payment.amount)}`}
                    onClick={() => setRemove(payment.id)}
                  >
                    <Icon name="trash" />
                  </button>
                )}
              </div>
            ))}
            {!expense.payments.length && (
              <p className="detail-empty">
                Nenhum pagamento registrado. Comece pelo primeiro sinal.
              </p>
            )}
          </div>
          {!adding && remainingAmount(expense) > 0 && (
            <button
              className="button primary"
              onClick={() => {
                setSelected(pending[0]?.id || "");
                setAdding(true);
              }}
            >
              <Icon name="plus" /> Registrar pagamento
            </button>
          )}
          {adding && (
            <div className="inline-form">
              <h3>Novo pagamento</h3>
              <SubmitForm
                label="Registrar pagamento"
                onClose={() => setAdding(false)}
                onSubmit={async (data) => {
                  const receiptFile = data.get("receipt");
                  const receipt =
                    receiptFile instanceof File && receiptFile.size
                      ? await readAttachment(receiptFile)
                      : null;
                  const payment = {
                    id: newId(),
                    amount: numberField(data, "amount"),
                    date: stringField(data, "date"),
                    note: stringField(data, "note"),
                    installmentId: stringField(data, "installmentId") || null,
                    receiptId: receipt?.id || null,
                  };
                  await change(
                    (item) => ({
                      ...item,
                      payments: [...item.payments, payment],
                      attachments: receipt
                        ? [...item.attachments, receipt]
                        : item.attachments,
                    }),
                    "Pagamento registrado. Mais um detalhe resolvido!",
                  );
                }}
              >
                <label>
                  Vincular à parcela
                  <select
                    name="installmentId"
                    value={selected}
                    onChange={(event) => setSelected(event.target.value)}
                  >
                    <option value="">Pagamento avulso</option>
                    {pending.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} · saldo{" "}
                        {money(installmentRemaining(expense, item))}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="form-grid">
                  <label>
                    Valor pago (R$)
                    <input
                      key={selected}
                      name="amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={remainingAmount(expense)}
                      defaultValue={
                        selectedInstallment
                          ? installmentRemaining(expense, selectedInstallment)
                          : remainingAmount(expense)
                      }
                      required
                    />
                  </label>
                  <label>
                    Data do pagamento
                    <input
                      type="date"
                      name="date"
                      min="1900-01-01"
                      max="2100-12-31"
                      defaultValue={today()}
                      required
                    />
                  </label>
                </div>
                <label>
                  Observação
                  <input
                    name="note"
                    maxLength={300}
                    placeholder="Ex.: sinal por Pix"
                  />
                </label>
                <label>
                  Comprovante opcional
                  <input
                    type="file"
                    name="receipt"
                    accept="application/pdf,image/png,image/jpeg"
                  />
                  <small>
                    PDF, PNG ou JPG de até 500 KB. Limite local total: 1,5 MB.
                  </small>
                </label>
              </SubmitForm>
            </div>
          )}
        </>
      )}
      {tab === "Parcelas" && (
        <>
          <p className="field-note">
            Divida o saldo restante. A última data de cada mês é respeitada e os
            centavos são distribuídos sem arredondar o total.
          </p>
          <div className="detail-list">
            {expense.installments.map((item) => (
              <div className="detail-row" key={item.id}>
                <span className="category-symbol blue">
                  <Icon name="calendar" />
                </span>
                <div>
                  <strong>
                    {item.name} · {money(item.amount)}
                  </strong>
                  <small>
                    {formatDate(item.dueDate, true)} · saldo{" "}
                    {money(installmentRemaining(expense, item))}
                  </small>
                </div>
                <Badge
                  color={
                    installmentRemaining(expense, item) === 0
                      ? "green"
                      : item.dueDate < today()
                        ? "orange"
                        : "blue"
                  }
                >
                  {installmentRemaining(expense, item) === 0
                    ? "Paga"
                    : item.dueDate < today()
                      ? "Atrasada"
                      : "Pendente"}
                </Badge>
              </div>
            ))}
          </div>
          {remainingAmount(expense) > 0 &&
            !expense.payments.some((item) => item.installmentId) && (
              <div className="inline-form">
                <h3>
                  {expense.installments.length
                    ? "Refazer parcelas do saldo"
                    : "Dividir o saldo em parcelas"}
                </h3>
                <SubmitForm
                  label={
                    expense.installments.length
                      ? "Substituir parcelas sem pagamento"
                      : "Gerar parcelas"
                  }
                  onClose={onClose}
                  onSubmit={async (data) => {
                    await change(
                      (item) => ({
                        ...item,
                        installments: generateInstallments(
                          item,
                          numberField(data, "count"),
                          stringField(data, "firstDate"),
                        ),
                      }),
                      "Parcelas organizadas.",
                    );
                  }}
                >
                  <div className="form-grid">
                    <label>
                      Quantidade
                      <input
                        type="number"
                        name="count"
                        min="1"
                        max="36"
                        defaultValue={3}
                        required
                      />
                    </label>
                    <label>
                      Primeiro vencimento
                      <input
                        type="date"
                        name="firstDate"
                        min="1900-01-01"
                        max="2100-12-31"
                        defaultValue={
                          expense.dueDate || plan.settings.weddingDate
                        }
                        required
                      />
                    </label>
                  </div>
                </SubmitForm>
              </div>
            )}
          {expense.payments.some((item) => item.installmentId) && (
            <p className="field-note">
              Já há pagamentos vinculados. O parcelamento é preservado para
              manter o histórico consistente.
            </p>
          )}
        </>
      )}
      {tab === "Comprovantes" && (
        <>
          <div className="detail-list">
            {expense.attachments.map((file) => (
              <div key={file.id} className="detail-row">
                <span className="category-symbol orange">
                  <Icon name="checklist" />
                </span>
                <div>
                  <strong>{file.name}</strong>
                  <small>
                    {Math.ceil(file.size / 1024)} KB ·{" "}
                    {file.mime === "application/pdf" ? "PDF" : "Imagem"}
                  </small>
                </div>
                <ActionButton
                  className="icon-button"
                  action={() => downloadAttachment(file)}
                >
                  <span className="sr-only">Baixar {file.name}</span>
                  <Icon name="download" />
                </ActionButton>
                {remove === file.id ? (
                  <div className="inline-confirm">
                    <ActionButton
                      className="button danger"
                      action={() =>
                        change(
                          (item) => ({
                            ...item,
                            attachments: item.attachments.filter(
                              (entry) => entry.id !== file.id,
                            ),
                            payments: item.payments.map((payment) =>
                              payment.receiptId === file.id
                                ? { ...payment, receiptId: null }
                                : payment,
                            ),
                          }),
                          "Comprovante removido. Você pode desfazer.",
                        ).then(() => setRemove(""))
                      }
                    >
                      Confirmar
                    </ActionButton>
                    <button className="text-link" onClick={() => setRemove("")}>
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    className="icon-button danger-hover"
                    aria-label={`Remover ${file.name}`}
                    onClick={() => setRemove(file.id)}
                  >
                    <Icon name="trash" />
                  </button>
                )}
              </div>
            ))}
            {!expense.attachments.length && (
              <p className="detail-empty">
                Guarde aqui recibos, comprovantes e pequenos documentos desta
                despesa.
              </p>
            )}
          </div>
          <div className="inline-form">
            <SubmitForm
              label="Guardar comprovante"
              onClose={onClose}
              onSubmit={async (data) => {
                const file = data.get("attachment");
                if (!(file instanceof File) || !file.size)
                  throw new Error("Selecione um arquivo.");
                const receipt = await readAttachment(file);
                await change(
                  (item) => ({
                    ...item,
                    attachments: [...item.attachments, receipt],
                  }),
                  "Comprovante guardado no aparelho.",
                );
              }}
            >
              <label>
                Adicionar arquivo
                <input
                  type="file"
                  name="attachment"
                  accept="application/pdf,image/png,image/jpeg"
                  required
                />
                <small>
                  Até 500 KB por arquivo e 1,5 MB no planejamento, incluindo a
                  lixeira. Os comprovantes fazem parte do backup.
                </small>
              </label>
            </SubmitForm>
          </div>
        </>
      )}
    </Modal>
  );
}
