import { usePlanning } from "../app/context.tsx";
import {
  HOUSEHOLD_STATUSES,
  newId,
  nowIso,
  type Family,
  type HouseholdItem,
} from "../domain/schema.ts";
import { updateRecord } from "../domain/planning.ts";
import { Modal, SubmitForm, stringField, numberField } from "./ui.tsx";

export function FamilyEditor({
  family,
  onClose,
}: {
  family?: Family;
  onClose: () => void;
}) {
  const { update } = usePlanning();
  return (
    <Modal
      title={family ? "Editar família" : "Uma família, um convite"}
      subtitle="Crie o núcleo e depois adicione cada pessoa para acompanhar as respostas individualmente."
      onClose={onClose}
    >
      <SubmitForm
        onClose={onClose}
        label="Salvar família"
        onSubmit={async (data) => {
          const record: Family = {
            id: family?.id || newId(),
            name: stringField(data, "name"),
            updatedAt: nowIso(),
            contact: stringField(data, "contact"),
            phone: stringField(data, "phone"),
            table: stringField(data, "table"),
            notes: stringField(data, "notes"),
            inviteToken: family?.inviteToken || newId(),
            lastResponseAt: family?.lastResponseAt || "",
          };
          await update(
            (current) =>
              updateRecord(current, "families", record, family?.updatedAt),
            "Família salva. Agora você pode adicionar os membros.",
          );
        }}
      >
        <label>
          Nome da família ou núcleo
          <input
            name="name"
            defaultValue={family?.name || ""}
            required
            maxLength={160}
            autoFocus
            placeholder="Ex.: Família Oliveira"
          />
        </label>
        <div className="form-grid">
          <label>
            Pessoa de contato
            <input
              name="contact"
              defaultValue={family?.contact || ""}
              maxLength={160}
            />
          </label>
          <label>
            WhatsApp / telefone
            <input
              name="phone"
              type="tel"
              defaultValue={family?.phone || ""}
              maxLength={80}
            />
          </label>
        </div>
        <label>
          Mesa da família (opcional)
          <input
            name="table"
            defaultValue={family?.table || ""}
            maxLength={80}
            placeholder="Ex.: Mesa 4"
          />
        </label>
        <label>
          Observações
          <textarea
            name="notes"
            defaultValue={family?.notes || ""}
            maxLength={1000}
            rows={3}
          />
        </label>
        <p className="field-note">
          Os membros mantêm suas próprias confirmações. Uma mesma pessoa deve
          aparecer uma única vez; use acompanhantes apenas para pessoas ainda
          não cadastradas pelo nome.
        </p>
      </SubmitForm>
    </Modal>
  );
}

export function HouseholdEditor({
  item,
  onClose,
}: {
  item?: HouseholdItem;
  onClose: () => void;
}) {
  const { plan, update } = usePlanning();
  return (
    <Modal
      title={
        item ? "Editar item da nossa casa" : "Mais um detalhe do nosso lar"
      }
      subtitle="Registre o que já temos e o que falta comprar, sem gerar uma despesa do casamento."
      onClose={onClose}
    >
      <SubmitForm
        onClose={onClose}
        label="Salvar item da casa"
        onSubmit={async (data) => {
          const record: HouseholdItem = {
            id: item?.id || newId(),
            name: stringField(data, "name"),
            updatedAt: nowIso(),
            room: stringField(data, "room"),
            category: stringField(data, "category"),
            quantity: numberField(data, "quantity"),
            ownedQuantity: numberField(data, "ownedQuantity"),
            estimatedUnitAmount: numberField(data, "estimatedUnitAmount"),
            status: stringField(data, "status") as HouseholdItem["status"],
            priority: stringField(
              data,
              "priority",
            ) as HouseholdItem["priority"],
            store: stringField(data, "store"),
            url: stringField(data, "url"),
            purchaseDate: stringField(data, "purchaseDate"),
            deliveryDate: stringField(data, "deliveryDate"),
            owner: stringField(data, "owner"),
            notes: stringField(data, "notes"),
          };
          await update(
            (current) =>
              updateRecord(current, "household", record, item?.updatedAt),
            "Item salvo na lista da nossa casa.",
          );
        }}
      >
        <label>
          Nome do item
          <input
            name="name"
            defaultValue={item?.name || ""}
            maxLength={160}
            required
            autoFocus
            placeholder="Ex.: Geladeira"
          />
        </label>
        <div className="form-grid">
          <label>
            Cômodo
            <input
              name="room"
              defaultValue={item?.room || "Cozinha"}
              list="house-rooms"
              maxLength={80}
              required
            />
            <datalist id="house-rooms">
              {[
                ...new Set([
                  "Cozinha",
                  "Quarto",
                  "Sala",
                  "Banheiro",
                  "Lavanderia",
                  "Escritório",
                  ...plan.household.map((i) => i.room),
                ]),
              ].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </datalist>
          </label>
          <label>
            Categoria
            <input
              name="category"
              defaultValue={item?.category || "Eletrodomésticos"}
              list="house-categories"
              maxLength={80}
              required
            />
            <datalist id="house-categories">
              {[
                ...new Set([
                  "Eletrodomésticos",
                  "Móveis",
                  "Utensílios",
                  "Enxoval",
                  "Decoração",
                  "Outros",
                  ...plan.household.map((i) => i.category),
                ]),
              ].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </datalist>
          </label>
        </div>
        <div className="form-grid">
          <label>
            Quantidade que queremos
            <input
              name="quantity"
              type="number"
              min="1"
              max="10000"
              step="1"
              required
              defaultValue={item?.quantity ?? 1}
            />
          </label>
          <label>
            Quantidade que já temos
            <input
              name="ownedQuantity"
              type="number"
              min="0"
              max="10000"
              step="1"
              required
              defaultValue={item?.ownedQuantity ?? 0}
            />
          </label>
        </div>
        <div className="form-grid">
          <label>
            Valor unitário estimado (R$)
            <input
              name="estimatedUnitAmount"
              type="number"
              min="0"
              max="1000000000"
              step="0.01"
              required
              defaultValue={item?.estimatedUnitAmount ?? 0}
            />
          </label>
          <label>
            Prioridade
            <select
              name="priority"
              defaultValue={item?.priority || "Importante"}
            >
              {["Essencial", "Importante", "Depois"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-grid">
          <label>
            Etapa da compra
            <select name="status" defaultValue={item?.status || "A comprar"}>
              {HOUSEHOLD_STATUSES.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Responsável
            <input
              name="owner"
              defaultValue={item?.owner || "Nós"}
              maxLength={80}
            />
          </label>
        </div>
        <div className="form-grid">
          <label>
            Compra em
            <input
              name="purchaseDate"
              type="date"
              defaultValue={item?.purchaseDate || ""}
              min="1900-01-01"
              max="2100-12-31"
            />
          </label>
          <label>
            Entrega prevista
            <input
              name="deliveryDate"
              type="date"
              defaultValue={item?.deliveryDate || ""}
              min="1900-01-01"
              max="2100-12-31"
            />
          </label>
        </div>
        <label>
          Loja
          <input
            name="store"
            defaultValue={item?.store || ""}
            maxLength={160}
          />
        </label>
        <label>
          Link do produto
          <input
            name="url"
            type="url"
            defaultValue={item?.url || ""}
            maxLength={2000}
            placeholder="https://..."
          />
        </label>
        <label>
          Observações
          <textarea
            name="notes"
            defaultValue={item?.notes || ""}
            maxLength={1000}
            rows={3}
          />
        </label>
        <p className="field-note">
          A estimativa desta lista não altera o orçamento nem os pagamentos do
          casamento. Itens comprados ou aguardando entrega só entram em “já
          temos” quando você informa a quantidade recebida.
        </p>
      </SubmitForm>
    </Modal>
  );
}
