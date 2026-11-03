import { useState } from "react";
import { usePlanning } from "../app/context.tsx";
import { type ViewActions } from "./overview.tsx";
import {
  householdTotals,
  householdStatus,
  missingQuantity,
} from "../domain/household.ts";
import { updateRecord, money, formatDate } from "../domain/planning.ts";
import { errorMessage, type HouseholdItem } from "../domain/schema.ts";
import {
  PageHeading,
  Icon,
  Filters,
  Badge,
  EmptyState,
  RowActions,
  ActionButton,
} from "../components/ui.tsx";
import { saveText } from "../services/files.ts";
import { csvCell } from "../services/exports.ts";
export function BudgetNavigation({ house = false }: { house?: boolean }) {
  return (
    <nav className="planning-tabs" aria-label="Casamento e nossa casa">
      <a href="#budget" className={!house ? "selected" : ""}>
        <Icon name="wallet" /> Casamento
      </a>
      <a href="#household" className={house ? "selected" : ""}>
        <Icon name="home" /> Nossa casa
      </a>
    </nav>
  );
}
export function Household({ actions }: { actions: ViewActions }) {
  const { plan, update, notify } = usePlanning();
  const [filter, setFilter] = useState("Todos"),
    [query, setQuery] = useState(""),
    [room, setRoom] = useState("Todos");
  const summary = householdTotals(plan.household);
  const rows = plan.household
    .filter(
      (i) =>
        (room === "Todos" || i.room === room) &&
        matches(i, query) &&
        (filter === "Todos" ||
          (filter === "O que falta" && missingQuantity(i) > 0) ||
          filter === householdStatus(i)),
    )
    .sort(
      (a, b) =>
        ["Essencial", "Importante", "Depois"].indexOf(a.priority) -
          ["Essencial", "Importante", "Depois"].indexOf(b.priority) ||
        a.name.localeCompare(b.name, "pt-BR"),
    );
  async function received(item: HouseholdItem) {
    await update(
      (current) =>
        updateRecord(
          current,
          "household",
          { ...item, ownedQuantity: item.quantity, status: "Em casa" },
          item.updatedAt,
        ),
      "Mais uma conquista para o nosso lar. ♡",
    );
  }
  return (
    <>
      <PageHeading
        title="Um lar começa nos nossos planos."
        subtitle="O que já temos, o que ainda falta e cada escolha para a nossa casa."
      >
        <button
          className="button primary"
          onClick={() => actions.edit("household")}
        >
          <Icon name="plus" /> Novo item
        </button>
      </PageHeading>
      <BudgetNavigation house />
      <section className="house-summary">
        <div>
          <span>Nosso lar, tomando forma</span>
          <strong>
            {summary.owned} <small>de {summary.total} itens</small>
          </strong>
          <div className="progress-track">
            <span
              style={{
                width: `${summary.total ? (summary.owned / summary.total) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
        <div>
          <span>Ainda faltam</span>
          <strong>{summary.missing}</strong>
        </div>
        <div>
          <span>Estimativa do que falta</span>
          <strong>{money(summary.estimatedMissing)}</strong>
        </div>
        <div>
          <span>Aguardando entrega</span>
          <strong>
            {summary.waiting} <small>registros</small>
          </strong>
        </div>
      </section>
      <p className="field-note house-note">
        Esta é a lista da casa. Os valores são estimativas do que falta e não
        entram como dívida no orçamento do casamento.
      </p>
      {summary.rooms.length > 0 && (
        <div className="room-summaries">
          {summary.rooms.map((r) => (
            <button
              key={r.room}
              className={`room-summary ${room === r.room ? "selected" : ""}`}
              onClick={() => setRoom(room === r.room ? "Todos" : r.room)}
            >
              <strong>{r.room}</strong>
              <span>
                {r.owned}/{r.total} já temos
              </span>
              <small>Falta estimado: {money(r.estimate)}</small>
            </button>
          ))}
        </div>
      )}
      <section className="card">
        <div className="card-heading">
          <div>
            <h2>A lista da nossa casa</h2>
            <p>Priorize o essencial e acompanhe as entregas.</p>
          </div>
          <ActionButton
            action={() =>
              saveText(
                "nosso-casamento-lista-casa.csv",
                "\ufeff" +
                  [
                    [
                      "Item",
                      "Cômodo",
                      "Categoria",
                      "Queremos",
                      "Já temos",
                      "Faltam",
                      "Etapa",
                      "Estimativa do que falta",
                      "Prioridade",
                      "Entrega",
                    ],
                    ...rows.map((i) => [
                      i.name,
                      i.room,
                      i.category,
                      i.quantity,
                      i.ownedQuantity,
                      missingQuantity(i),
                      householdStatus(i),
                      money(i.estimatedUnitAmount * missingQuantity(i)),
                      i.priority,
                      i.deliveryDate,
                    ]),
                  ]
                    .map((row) => row.map(csvCell).join(";"))
                    .join("\r\n"),
                "text/csv;charset=utf-8",
              )
            }
          >
            <Icon name="download" /> Exportar lista
          </ActionButton>
        </div>
        <Filters
          options={[
            "Todos",
            "O que falta",
            "Já temos",
            "Aguardando entrega",
            "Pesquisando",
            "Comprado",
          ]}
          selected={filter}
          onFilter={setFilter}
          query={query}
          onQuery={setQuery}
          placeholder="Buscar item, cômodo ou categoria..."
        />
        <label className="room-filter">
          Cômodo
          <select value={room} onChange={(e) => setRoom(e.target.value)}>
            <option>Todos</option>
            {summary.rooms.map((r) => (
              <option key={r.room}>{r.room}</option>
            ))}
          </select>
        </label>
        <div className="house-grid">
          {rows.map((item) => (
            <article
              key={item.id}
              className={`house-item ${missingQuantity(item) === 0 ? "house-item-owned" : ""}`}
            >
              <div className="house-item-top">
                <span className="category-symbol green">
                  <Icon name="home" />
                </span>
                <Badge
                  color={
                    missingQuantity(item) === 0
                      ? "green"
                      : item.priority === "Essencial"
                        ? "orange"
                        : "blue"
                  }
                >
                  {householdStatus(item)}
                </Badge>
              </div>
              <h3>{item.name}</h3>
              <p>
                {item.room} · {item.category}
              </p>
              <div className="house-quantities">
                <span>
                  <b>{item.ownedQuantity}</b> já temos
                </span>
                <span>
                  <b>{missingQuantity(item)}</b> faltam
                </span>
              </div>
              <div className="progress-track">
                <span
                  style={{
                    width: `${(item.ownedQuantity / item.quantity) * 100}%`,
                  }}
                />
              </div>
              <div className="house-item-info">
                <strong>
                  {money(item.estimatedUnitAmount * missingQuantity(item))}
                </strong>
                <small>estimativa do que falta · {item.priority}</small>
                {item.deliveryDate && (
                  <span>
                    <Icon name="calendar" /> Entrega:{" "}
                    {formatDate(item.deliveryDate, true)}
                  </span>
                )}
                {item.store && <span>{item.store}</span>}
                {item.url && (
                  <a
                    className="text-link"
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ver produto <Icon name="external" />
                  </a>
                )}
              </div>
              <div className="house-item-footer">
                {missingQuantity(item) > 0 ? (
                  <button
                    className="text-link"
                    onClick={() =>
                      void received(item).catch((e) =>
                        notify(errorMessage(e), true),
                      )
                    }
                  >
                    <Icon name="check" />{" "}
                    {item.status === "Aguardando entrega"
                      ? "Confirmar entrega"
                      : "Já temos tudo"}
                  </button>
                ) : (
                  <span className="text-green">
                    Mais um detalhe resolvido ♡
                  </span>
                )}
                <RowActions
                  name={item.name}
                  onEdit={() => actions.edit("household", item)}
                  onDelete={() => actions.remove("household", item)}
                />
              </div>
            </article>
          ))}
        </div>
        {!rows.length && (
          <EmptyState
            symbol="home"
            title={
              plan.household.length
                ? "Nada neste filtro"
                : "A primeira escolha para o nosso lar"
            }
            description={
              plan.household.length
                ? "Experimente outro cômodo ou filtro."
                : "Comece pelos itens que vocês já têm. Depois, adicione o que ainda querem comprar."
            }
          >
            <button
              className="button primary"
              onClick={() => actions.edit("household")}
            >
              <Icon name="plus" /> Adicionar item da casa
            </button>
          </EmptyState>
        )}
      </section>
    </>
  );
}
function matches(item: HouseholdItem, query: string) {
  const normalize = (text: string) =>
    text
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();
  return normalize(
    `${item.name} ${item.room} ${item.category} ${item.store} ${item.owner}`,
  ).includes(normalize(query));
}
