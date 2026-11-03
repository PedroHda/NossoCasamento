import { useState } from "react";
import { usePlanning } from "../app/context.tsx";
import {
  GUEST_STATUSES,
  errorMessage,
  type Guest,
  type Family,
} from "../domain/schema.ts";
import {
  familyGroups,
  guestCounts,
  setFamilyAttendance,
} from "../domain/guests.ts";
import { updateRecord } from "../domain/planning.ts";
import { exportCsv } from "../services/exports.ts";
import { type ViewActions } from "./overview.tsx";
import {
  PageHeading,
  Icon,
  Badge,
  Filters,
  EmptyState,
  RowActions,
  ActionButton,
  Confirm,
  matchesQuery,
} from "../components/ui.tsx";
export function Guests({ actions }: { actions: ViewActions }) {
  const { plan, update, notify } = usePlanning();
  const [filter, setFilter] = useState("Todos"),
    [query, setQuery] = useState(""),
    [view, setView] = useState("families"),
    [bulk, setBulk] = useState<Family | null>(null);
  const summary = guestCounts(plan.guests);
  const groups = familyGroups(plan).filter(
    (group) =>
      (filter === "Todos" || group.status === filter) &&
      matchesQuery(
        `${group.name} ${group.family?.contact || ""} ${group.family?.phone || ""} ${group.family?.table || ""} ${group.members.map((g) => `${g.name} ${g.phone} ${g.dietary} ${g.table}`).join(" ")}`,
        query,
      ),
  );
  const rows = plan.guests.filter(
    (g) =>
      matchesQuery(
        `${g.name} ${g.group} ${g.phone} ${g.dietary} ${g.table} ${plan.families.find((f) => f.id === g.familyId)?.name || ""}`,
        query,
      ) &&
      (filter === "Todos" ||
        (
          {
            Confirmados: "Confirmado",
            Pendentes: "Pendente",
            Recusaram: "Não vai",
            Talvez: "Talvez",
          } as Record<string, string>
        )[filter] === g.status),
  );
  async function attendance(guest: Guest, status: Guest["status"]) {
    await update(
      (current) =>
        updateRecord(
          current,
          "guests",
          {
            ...guest,
            status,
            confirmedCompanions:
              status === "Não vai"
                ? 0
                : status === "Confirmado"
                  ? (guest.confirmedCompanions ?? guest.companions)
                  : null,
          },
          guest.updatedAt,
        ),
      "Presença atualizada.",
    );
  }
  const tableNames = [
    ...new Set(
      plan.guests.map(
        (g) =>
          g.table ||
          plan.families.find((f) => f.id === g.familyId)?.table ||
          "Sem mesa",
      ),
    ),
  ].sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
  return (
    <>
      <PageHeading
        title="Seus convidados."
        subtitle="Famílias, pessoas e confirmações em um só lugar."
      >
        <div className="compact-actions">
          <button
            className="button secondary"
            onClick={() => actions.edit("guests")}
          >
            <Icon name="plus" /> Pessoa
          </button>
          <button
            className="button primary"
            onClick={() => actions.edit("families")}
          >
            <Icon name="users" /> Nova família
          </button>
        </div>
      </PageHeading>
      <section className="guest-summary-card">
        <div className="guest-total">
          <strong>{summary.invited}</strong>
          <span>convidados</span>
          <small>
            {plan.families.length} famílias · capacidade planejada:{" "}
            {plan.settings.guestTarget}
          </small>
        </div>
        <div className="guest-summary-grid">
          {[
            {
              label: "Confirmados",
              value: summary.confirmed,
              filter: "Confirmados",
            },
            { label: "Pendentes", value: summary.pending, filter: "Pendentes" },
            {
              label: "Recusaram",
              value: summary.declined,
              filter: "Recusaram",
            },
            { label: "Talvez", value: summary.maybe, filter: "Talvez" },
          ].map((s) => (
            <button
              key={s.label}
              onClick={() => {
                setFilter(s.filter);
                setView("families");
              }}
              aria-label={`Filtrar ${s.label.toLowerCase()}`}
            >
              <b>{s.value}</b> {s.label}
            </button>
          ))}
        </div>
        <p>
          {summary.children} criança(s) confirmada(s) · {summary.confirmed}{" "}
          presença(s) de {summary.invited} convites, incluindo acompanhantes.
        </p>
        {plan.settings.guestTarget > 0 &&
          summary.confirmed > plan.settings.guestTarget && (
            <p className="guest-capacity-alert">
              As confirmações ultrapassaram a capacidade planejada em{" "}
              {summary.confirmed - plan.settings.guestTarget} pessoa(s).
            </p>
          )}
      </section>
      <div className="guest-organize">
        <button
          onClick={() => {
            setView("tables");
            setFilter("Todos");
          }}
          className={view === "tables" ? "selected" : ""}
        >
          <span>
            <Icon name="table" />
          </span>
          <strong>Mesas</strong>
          <small>Organize os lugares</small>
        </button>
        <button onClick={actions.response}>
          <span>
            <Icon name="check" />
          </span>
          <strong>Receber confirmação</strong>
          <small>Importe o código da família</small>
        </button>
        <ActionButton action={() => exportCsv(plan, "guests")}>
          <span>
            <Icon name="download" />
          </span>
          <strong>Exportar convidados</strong>
          <small>Famílias e respostas em CSV</small>
        </ActionButton>
      </div>
      <section className="card guest-management">
        <div className="guest-section-heading">
          <h2>{view === "tables" ? "Mesas e lugares" : "Famílias e grupos"}</h2>
          <div className="filter-tabs guest-view-tabs">
            {[
              ["families", "Famílias"],
              ["people", "Pessoas"],
              ["tables", "Mesas"],
            ].map(([key, label]) => (
              <button
                key={key}
                className={`filter-tab ${view === key ? "selected" : ""}`}
                onClick={() => {
                  setView(key);
                  setFilter("Todos");
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <Filters
          options={
            view === "tables"
              ? ["Todos"]
              : view === "people"
                ? ["Todos", "Pendentes", "Confirmados", "Recusaram", "Talvez"]
                : [
                    "Todos",
                    "Pendentes",
                    "Parcial",
                    "Confirmados",
                    "Recusaram",
                    "Talvez",
                  ]
          }
          selected={filter}
          onFilter={setFilter}
          query={query}
          onQuery={setQuery}
          placeholder="Buscar família, pessoa, mesa ou restrição..."
        />
        {view === "families" ? (
          <div className="family-grid">
            {groups.map((group) => (
              <details
                key={group.id}
                className="family-card"
                open={group.members.length < 5 || !!query}
              >
                <summary>
                  <span className="family-avatar">
                    <Icon name="users" />
                  </span>
                  <div>
                    <h3>{group.name}</h3>
                    <small>
                      {group.members.length} pessoa(s) pelo nome ·{" "}
                      {group.counts.invited} lugares
                      {group.family?.table ? ` · ${group.family.table}` : ""}
                    </small>
                  </div>
                  <Badge
                    color={
                      group.status === "Confirmados"
                        ? "green"
                        : group.status === "Recusaram"
                          ? "muted"
                          : "orange"
                    }
                  >
                    {group.status}
                  </Badge>
                  <Icon name="chevron" />
                </summary>
                <div className="family-body">
                  {group.family?.contact && (
                    <p className="family-contact">
                      Contato: {group.family.contact}
                      {group.family.phone ? ` · ${group.family.phone}` : ""}
                    </p>
                  )}
                  {group.family?.notes && (
                    <p className="family-notes">{group.family.notes}</p>
                  )}
                  {group.members.map((guest) => (
                    <Member
                      key={guest.id}
                      guest={guest}
                      table={group.family?.table || ""}
                      onStatus={(status) =>
                        void attendance(guest, status).catch((e) =>
                          notify(errorMessage(e), true),
                        )
                      }
                      actions={actions}
                    />
                  ))}
                  {!group.members.length && (
                    <p className="field-note">
                      Este núcleo ainda não tem membros. Adicione cada pessoa
                      para acompanhar as respostas.
                    </p>
                  )}
                  <div className="family-counts">
                    <span>{group.counts.confirmed} confirmados</span>
                    <span>{group.counts.pending} pendentes</span>
                    <span>{group.counts.maybe} talvez</span>
                  </div>
                  {group.family ? (
                    <div className="family-actions">
                      <button
                        className="button secondary"
                        onClick={() =>
                          actions.edit("guests", undefined, group.family!.id)
                        }
                      >
                        <Icon name="plus" /> Membro
                      </button>
                      <button
                        className="button secondary"
                        disabled={!group.members.length}
                        onClick={() => actions.familyInvite(group.family!.id)}
                      >
                        <Icon name="external" /> Link da família
                      </button>
                      <button
                        className="text-link"
                        disabled={!group.members.length}
                        onClick={() => setBulk(group.family)}
                      >
                        Confirmar família
                      </button>
                      <RowActions
                        name={group.name}
                        onEdit={() => actions.edit("families", group.family!)}
                        onDelete={() =>
                          actions.remove("families", group.family!)
                        }
                      />
                    </div>
                  ) : (
                    <div className="family-actions">
                      <span className="field-note">
                        Convite individual. Edite a pessoa para vinculá-la a uma
                        família.
                      </span>
                      <button
                        className="text-link"
                        onClick={() => actions.invite(group.members[0].id)}
                      >
                        Ver convite individual <Icon name="arrow" />
                      </button>
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        ) : view === "people" ? (
          <div className="individual-guest-list">
            {rows.map((guest) => (
              <div className="individual-guest" key={guest.id}>
                <small className="family-parent-label">
                  {plan.families.find((f) => f.id === guest.familyId)?.name ||
                    "Convite individual"}
                </small>
                <Member
                  guest={guest}
                  table={
                    plan.families.find((f) => f.id === guest.familyId)?.table ||
                    ""
                  }
                  onStatus={(status) =>
                    void attendance(guest, status).catch((e) =>
                      notify(errorMessage(e), true),
                    )
                  }
                  actions={actions}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="table-groups">
            {tableNames
              .filter((table) =>
                matchesQuery(
                  table +
                    " " +
                    plan.guests
                      .filter(
                        (g) =>
                          (g.table ||
                            plan.families.find((f) => f.id === g.familyId)
                              ?.table ||
                            "Sem mesa") === table,
                      )
                      .map((g) => g.name)
                      .join(" "),
                  query,
                ),
              )
              .map((table) => {
                const members = plan.guests.filter(
                  (g) =>
                    (g.table ||
                      plan.families.find((f) => f.id === g.familyId)?.table ||
                      "Sem mesa") === table,
                );
                const counts = guestCounts(members);
                return (
                  <article className="seating-card" key={table}>
                    <div>
                      <Icon name="table" />
                      <h3>{table}</h3>
                      <Badge>{counts.confirmed} confirmados</Badge>
                    </div>
                    <p>
                      {counts.invited} lugares previstos. Atribua a mesa na
                      família ou individualmente na pessoa.
                    </p>
                    {members.map((g) => (
                      <button
                        key={g.id}
                        className="seating-member"
                        onClick={() => actions.edit("guests", g)}
                      >
                        {g.name}
                        {g.child ? " · criança" : ""}
                        <Badge
                          color={g.status === "Confirmado" ? "green" : "orange"}
                        >
                          {g.status}
                        </Badge>
                      </button>
                    ))}
                  </article>
                );
              })}
          </div>
        )}
        {((view === "families" && !groups.length) ||
          (view === "people" && !rows.length) ||
          (view === "tables" && !tableNames.length)) && (
          <EmptyState
            symbol="users"
            title="Nenhum convidado nesse filtro"
            description={
              plan.guests.length || plan.families.length
                ? "Ajuste a busca ou escolha outro filtro."
                : "Comece pelos núcleos familiares e adicione as pessoas."
            }
          >
            <button
              className="button primary"
              onClick={() => actions.edit("families")}
            >
              <Icon name="plus" /> Adicionar primeira família
            </button>
          </EmptyState>
        )}
        <div className="table-footer">
          Uma pessoa por cadastro. Os acompanhantes são lugares extras ainda não
          cadastrados pelo nome.
          <span>
            As respostas podem ser registradas aqui ou recebidas por código do
            convite.
          </span>
        </div>
      </section>
      {bulk && (
        <Confirm
          title={`Confirmar ${bulk.name}?`}
          description="Todos os membros e seus acompanhantes serão marcados como confirmados. As respostas individuais atuais serão substituídas; depois você pode desfazer essa ação."
          label="Confirmar toda a família"
          onClose={() => setBulk(null)}
          onConfirm={async () => {
            await update(
              (current) => setFamilyAttendance(current, bulk.id, "Confirmado"),
              "Família confirmada.",
            );
          }}
        />
      )}
    </>
  );
}
function Member({
  guest,
  table,
  onStatus,
  actions,
}: {
  guest: Guest;
  table: string;
  onStatus: (status: Guest["status"]) => void;
  actions: ViewActions;
}) {
  return (
    <div className="family-member">
      <span className={`person-avatar ${guest.child ? "color-1" : "color-0"}`}>
        {guest.name
          .split(" ")
          .map((p) => p[0])
          .slice(0, 2)
          .join("")}
      </span>
      <div className="family-member-info">
        <strong>
          {guest.name}
          {guest.child && <small> Criança</small>}
        </strong>
        <span>
          {guest.group}
          {guest.companions > 0
            ? ` · até ${guest.companions} acompanhante(s)`
            : ""}
          {guest.status === "Confirmado" && guest.companions
            ? ` · ${guest.confirmedCompanions ?? guest.companions} confirmados`
            : ""}
          {guest.table || table ? ` · ${guest.table || table}` : ""}
        </span>
        {guest.dietary && (
          <small className="dietary-note">
            Atenção alimentar: {guest.dietary}
          </small>
        )}
      </div>
      <select
        className="attendance-select"
        aria-label={`Presença de ${guest.name}`}
        value={guest.status}
        onChange={(e) => onStatus(e.target.value as Guest["status"])}
      >
        {GUEST_STATUSES.map((status) => (
          <option key={status}>{status}</option>
        ))}
      </select>
      <RowActions
        name={guest.name}
        onEdit={() => actions.edit("guests", guest)}
        onDelete={() => actions.remove("guests", guest)}
      />
    </div>
  );
}
