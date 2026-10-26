import { useState } from "react";
import { usePlanning } from "../app/context.tsx";
import {
  CATEGORIES,
  VENDOR_STATUSES,
  nowIso,
  errorMessage,
  type Task,
} from "../domain/schema.ts";
import {
  totals,
  paidAmount,
  remainingAmount,
  expenseStatus,
  money,
  formatDate,
  today,
  vendorName,
  updateRecord,
} from "../domain/planning.ts";
import { exportCsv, exportPdf, exportCalendar } from "../services/exports.ts";
import {
  Icon,
  PageHeading,
  CardHeading,
  Badge,
  EmptyState,
  Filters,
  matchesQuery,
  RowActions,
  ActionButton,
} from "../components/ui.tsx";
import type { ViewActions } from "./overview.tsx";

export function Budget({ actions }: { actions: ViewActions }) {
  const { plan } = usePlanning();
  const t = totals(plan);
  const [filter, setFilter] = useState("Todos");
  const [query, setQuery] = useState("");
  const rows = plan.expenses.filter(
    (item) =>
      matchesQuery(
        `${item.name} ${item.category} ${vendorName(plan, item.vendorId)}`,
        query,
      ) &&
      (filter === "Todos" || expenseStatus(item) === filter),
  );
  return (
    <>
      <PageHeading
        title="Um sonho que cabe nos planos."
        subtitle="Das primeiras estimativas ao último pagamento, tudo no mesmo lugar."
      >
        <button
          className="button primary"
          onClick={() => actions.edit("expenses")}
        >
          <Icon name="plus" /> Nova despesa
        </button>
      </PageHeading>
      <section className="budget-overview">
        <div className="budget-main">
          <span className="stat-icon green">
            <Icon name="wallet" />
          </span>
          <div>
            <span>Nosso orçamento</span>
            <strong>{money(plan.settings.budget)}</strong>
          </div>
          <a
            className="icon-button"
            href="#settings"
            aria-label="Editar orçamento total"
          >
            <Icon name="edit" />
          </a>
        </div>
        <div>
          <span>Total contratado</span>
          <strong>{money(t.contracted)}</strong>
        </div>
        <div>
          <span>Já pago</span>
          <strong className="text-green">{money(t.paid)}</strong>
        </div>
        <div>
          <span>Falta pagar</span>
          <strong className="text-orange">{money(t.remaining)}</strong>
        </div>
      </section>
      <section className="card">
        <CardHeading
          title="Todos os investimentos"
          subtitle={`${t.available >= 0 ? `${money(t.available)} disponíveis.` : `${money(-t.available)} acima do orçamento.`} Estimativa inicial: ${money(t.estimated)}.`}
        >
          <div className="compact-actions">
            <ActionButton action={() => exportCsv(plan, "budget")}>
              <Icon name="download" /> Planilha CSV
            </ActionButton>
            <ActionButton action={() => exportPdf(plan)}>
              <Icon name="download" /> PDF
            </ActionButton>
          </div>
        </CardHeading>
        <Filters
          options={["Todos", "Pago", "Parcial", "Pendente"]}
          selected={filter}
          onFilter={setFilter}
          query={query}
          onQuery={setQuery}
          placeholder="Buscar despesa ou fornecedor..."
        />
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Despesa / fornecedor</th>
                <th>Estimado</th>
                <th>Contratado</th>
                <th>Pago</th>
                <th>Saldo</th>
                <th>Status</th>
                <th>Pagamentos</th>
                <th>
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.name}</strong>
                    <small className="cell-caption">
                      {vendorName(plan, item.vendorId) || item.category}
                    </small>
                  </td>
                  <td className="numeric">{money(item.estimatedAmount)}</td>
                  <td className="numeric">{money(item.amount)}</td>
                  <td className="numeric">{money(paidAmount(item))}</td>
                  <td className="numeric">{money(remainingAmount(item))}</td>
                  <td>
                    <Badge
                      color={
                        expenseStatus(item) === "Pago"
                          ? "green"
                          : expenseStatus(item) === "Parcial"
                            ? "blue"
                            : "orange"
                      }
                    >
                      {expenseStatus(item)}
                    </Badge>
                  </td>
                  <td>
                    <button
                      className="table-link"
                      onClick={() => actions.finance(item.id)}
                    >
                      Pagamentos e parcelas <Icon name="arrow" />
                    </button>
                  </td>
                  <td>
                    <RowActions
                      name={item.name}
                      onEdit={() => actions.edit("expenses", item)}
                      onDelete={() => actions.remove("expenses", item)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <EmptyState
            symbol="wallet"
            title="Nenhuma despesa por aqui"
            description="Adicione um investimento ou tente outro filtro."
          />
        )}
        <div className="table-footer">
          {rows.length} despesas
          <span>Valores em reais · comprovantes no detalhe da despesa</span>
        </div>
      </section>
    </>
  );
}
export function Guests({ actions }: { actions: ViewActions }) {
  const { plan } = usePlanning();
  const t = totals(plan);
  const [filter, setFilter] = useState("Todos");
  const [query, setQuery] = useState("");
  const rows = plan.guests.filter(
    (item) =>
      matchesQuery(`${item.name} ${item.group} ${item.dietary}`, query) &&
      (filter === "Todos" || item.status === filter),
  );
  return (
    <>
      <PageHeading
        title="Gente que faz parte da história."
        subtitle="Cada convite, cada confirmação e cada cuidado com quem estará perto."
      >
        <button
          className="button primary"
          onClick={() => actions.edit("guests")}
        >
          <Icon name="plus" /> Novo convidado
        </button>
      </PageHeading>
      <div className="summary-strip">
        <div>
          <Icon name="users" />
          <span>
            <strong>{t.invited}</strong> pessoas convidadas
          </span>
        </div>
        <div>
          <i className="status-dot green-dot" />
          <span>
            <strong>{t.confirmed}</strong> confirmadas
          </span>
        </div>
        <div>
          <i className="status-dot orange-dot" />
          <span>
            <strong>{t.pending}</strong> aguardando resposta
          </span>
        </div>
        <div>
          Meta: <strong>{plan.settings.guestTarget}</strong>
        </div>
      </div>
      <section className="card">
        <CardHeading
          title="Nossa lista de convidados"
          subtitle="As confirmações podem ser registradas aqui ou importadas pelo código do convite."
        >
          <div className="compact-actions">
            <button className="button secondary" onClick={actions.response}>
              <Icon name="upload" /> Importar confirmação
            </button>
            <ActionButton action={() => exportCsv(plan, "guests")}>
              <Icon name="download" /> Planilha CSV
            </ActionButton>
          </div>
        </CardHeading>
        <Filters
          options={["Todos", "Confirmado", "Pendente", "Não vai"]}
          selected={filter}
          onFilter={setFilter}
          query={query}
          onQuery={setQuery}
          placeholder="Buscar nome, grupo ou restrição..."
        />
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Convidado</th>
                <th>Grupo</th>
                <th>Acompanhantes</th>
                <th>Confirmação</th>
                <th>Restrições alimentares</th>
                <th>Convite</th>
                <th>
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((guest, index) => (
                <tr key={guest.id}>
                  <td>
                    <span className="person-cell">
                      <span className={`person-avatar color-${index % 3}`}>
                        {guest.name
                          .split(" ")
                          .map((item) => item[0])
                          .slice(0, 2)
                          .join("")}
                      </span>
                      <span>
                        <strong>{guest.name}</strong>
                        {guest.phone && (
                          <small className="cell-caption">{guest.phone}</small>
                        )}
                      </span>
                    </span>
                  </td>
                  <td>{guest.group}</td>
                  <td>
                    {guest.status === "Confirmado"
                      ? `${guest.confirmedCompanions ?? guest.companions} confirmados`
                      : `Até ${guest.companions}`}
                  </td>
                  <td>
                    <Badge
                      color={
                        guest.status === "Confirmado"
                          ? "green"
                          : guest.status === "Pendente"
                            ? "orange"
                            : "neutral"
                      }
                    >
                      {guest.status}
                    </Badge>
                  </td>
                  <td className="wrapping-cell">{guest.dietary || "—"}</td>
                  <td>
                    <button
                      className="table-link"
                      onClick={() => actions.invite(guest.id)}
                    >
                      Preparar convite <Icon name="arrow" />
                    </button>
                  </td>
                  <td>
                    <RowActions
                      name={guest.name}
                      onEdit={() => actions.edit("guests", guest)}
                      onDelete={() => actions.remove("guests", guest)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <EmptyState
            symbol="users"
            title="Nenhum convidado encontrado"
            description="Tente outro filtro ou adicione um novo convite."
          />
        )}
        <div className="table-footer">
          {rows.length} convites
          <span>Cada pessoa confirma dentro do limite do seu convite.</span>
        </div>
      </section>
    </>
  );
}
export function TaskRow({
  task,
  actions,
  compact = false,
}: {
  task: Task;
  actions: ViewActions;
  compact?: boolean;
}) {
  const { update, notify } = usePlanning();
  return (
    <div className={`task-row ${task.done ? "completed" : ""}`}>
      <button
        className="task-check"
        aria-pressed={task.done}
        aria-label={`${task.done ? "Reabrir" : "Concluir"} tarefa: ${task.name}`}
        onClick={() => {
          void update(
            (plan) => {
              const current = plan.tasks.find((item) => item.id === task.id);
              if (!current) throw new Error("A tarefa foi removida.");
              return updateRecord(plan, "tasks", {
                ...current,
                done: !current.done,
                updatedAt: nowIso(),
              });
            },
            task.done
              ? "Tarefa reaberta."
              : "Mais um passo dado. Vamos celebrar! ♡",
          ).catch((error) => notify(errorMessage(error), true));
        }}
      >
        {task.done && <Icon name="check" />}
      </button>
      <div className="task-info">
        <strong>{task.name}</strong>
        <span>
          {task.owner || "Nós"}
          <i>·</i>
          {task.category}
          {task.dueDate && (
            <>
              <i>·</i>
              <span
                className={
                  !task.done && task.dueDate < today() ? "text-orange" : ""
                }
              >
                {!task.done && task.dueDate < today() ? "Atrasada · " : ""}
                {formatDate(task.dueDate)}
              </span>
            </>
          )}
          {task.priority === "Alta" && (
            <Badge color="orange">Prioridade alta</Badge>
          )}
        </span>
      </div>
      {compact ? (
        <button
          className="icon-button"
          aria-label={`Editar ${task.name}`}
          onClick={() => actions.edit("tasks", task)}
        >
          <Icon name="arrowUp" />
        </button>
      ) : (
        <RowActions
          name={task.name}
          onEdit={() => actions.edit("tasks", task)}
          onDelete={() => actions.remove("tasks", task)}
        />
      )}
    </div>
  );
}
export function Tasks({ actions }: { actions: ViewActions }) {
  const { plan } = usePlanning();
  const t = totals(plan);
  const [filter, setFilter] = useState("Todos");
  const [query, setQuery] = useState("");
  const rows = plan.tasks
    .filter(
      (item) =>
        matchesQuery(`${item.name} ${item.owner} ${item.category}`, query) &&
        (filter === "Todos" ||
          (filter === "Concluídas" ? item.done : !item.done)),
    )
    .sort(
      (a, b) =>
        Number(a.done) - Number(b.done) ||
        (a.dueDate || "9999").localeCompare(b.dueDate || "9999"),
    );
  return (
    <>
      <PageHeading
        title="Um passo mais perto do sim."
        subtitle="Dividam os cuidados e celebrem cada pequena conquista."
      >
        <button
          className="button primary"
          onClick={() => actions.edit("tasks")}
        >
          <Icon name="plus" /> Nova tarefa
        </button>
      </PageHeading>
      <section className="task-progress-card">
        <span className="stat-icon green">
          <Icon name="checklist" />
        </span>
        <div>
          <h2>Estamos fazendo acontecer!</h2>
          <p>
            {t.completed} de {plan.tasks.length} tarefas concluídas. Cada passo
            merece ser celebrado.
          </p>
          <div className="progress-track">
            <span style={{ width: `${t.progress}%` }} />
          </div>
        </div>
        <strong>
          {t.progress}
          <small>%</small>
        </strong>
      </section>
      <section className="card">
        <CardHeading
          title="Nosso checklist"
          subtitle="Da primeira ideia ao último detalhe."
        >
          <ActionButton action={() => exportCalendar(plan)}>
            <Icon name="calendar" /> Exportar agenda
          </ActionButton>
        </CardHeading>
        <Filters
          options={["Todos", "Pendentes", "Concluídas"]}
          selected={filter}
          onFilter={setFilter}
          query={query}
          onQuery={setQuery}
          placeholder="Buscar tarefa ou responsável..."
        />
        <div className="full-task-list">
          {rows.map((task) => (
            <TaskRow key={task.id} task={task} actions={actions} />
          ))}
          {!rows.length && (
            <EmptyState
              title="Tudo tranquilo por aqui"
              description="Nenhuma tarefa corresponde ao filtro selecionado."
              symbol="checklist"
            />
          )}
        </div>
        <div className="table-footer">
          {rows.length} tarefas<span>Clique no círculo para concluir.</span>
        </div>
      </section>
    </>
  );
}
export function Vendors({ actions }: { actions: ViewActions }) {
  const { plan } = usePlanning();
  const [filter, setFilter] = useState("Todos");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todas");
  const rows = plan.vendors.filter(
    (item) =>
      matchesQuery(`${item.name} ${item.category}`, query) &&
      (filter === "Todos" || item.status === filter) &&
      (category === "Todas" || item.category === category),
  );
  const quoted = [...rows]
    .filter((item) => item.quoteAmount !== null)
    .sort((a, b) => a.quoteAmount! - b.quoteAmount!);
  return (
    <>
      <PageHeading
        title="Boas mãos para o nosso sonho."
        subtitle="Compare propostas e conecte cada parceiro aos investimentos do grande dia."
      >
        <button
          className="button primary"
          onClick={() => actions.edit("vendors")}
        >
          <Icon name="plus" /> Novo fornecedor
        </button>
      </PageHeading>
      <section className="card vendor-container">
        <Filters
          options={["Todos", ...VENDOR_STATUSES]}
          selected={filter}
          onFilter={setFilter}
          query={query}
          onQuery={setQuery}
          placeholder="Buscar fornecedor..."
        />
        <div className="comparison-filter">
          <label>
            Comparar categoria
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option>Todas</option>
              {CATEGORIES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <p>
            {category === "Todas"
              ? "Escolha uma categoria para comparar propostas do mesmo serviço."
              : quoted.length
                ? `Menor proposta informada: ${money(quoted[0].quoteAmount!)} · ${quoted[0].name}. Compare também o que cada proposta inclui.`
                : "Nenhuma proposta informada nesta categoria."}
          </p>
        </div>
        <div className="vendor-grid">
          {rows.map((vendor) => {
            const linked = plan.expenses.filter(
              (item) => item.vendorId === vendor.id,
            );
            return (
              <article className="vendor-card" key={vendor.id}>
                <div className="vendor-card-top">
                  <span className="category-symbol green">
                    <Icon
                      name={
                        vendor.category === "Decoração" ? "flower" : "store"
                      }
                    />
                  </span>
                  <Badge
                    color={
                      vendor.status === "Contratado"
                        ? "green"
                        : vendor.status === "Em negociação"
                          ? "orange"
                          : "blue"
                    }
                  >
                    {vendor.status}
                  </Badge>
                </div>
                <h2>{vendor.name}</h2>
                <span className="vendor-category">{vendor.category}</span>
                <div className="vendor-quote">
                  <span>Proposta informada</span>
                  <strong>
                    {vendor.quoteAmount === null
                      ? "A combinar"
                      : money(vendor.quoteAmount)}
                  </strong>
                </div>
                <p>
                  {vendor.notes ||
                    "Guarde as condições e o que está incluído na proposta."}
                </p>
                <div className="vendor-links">
                  {linked.map((item) => (
                    <button
                      className="text-link"
                      key={item.id}
                      onClick={() => actions.finance(item.id)}
                    >
                      {item.name} <Icon name="arrow" />
                    </button>
                  ))}
                  <button
                    className="text-link"
                    onClick={() =>
                      actions.edit("expenses", undefined, vendor.id)
                    }
                  >
                    <Icon name="plus" /> Criar despesa vinculada
                  </button>
                </div>
                <div className="vendor-card-bottom">
                  <span>{vendor.contact || "Contato ainda não informado"}</span>
                  <RowActions
                    name={vendor.name}
                    onEdit={() => actions.edit("vendors", vendor)}
                    onDelete={() => actions.remove("vendors", vendor)}
                  />
                </div>
              </article>
            );
          })}
        </div>
        {!rows.length && (
          <EmptyState
            title="Vamos encontrar boas parcerias?"
            description="Adicione fornecedores ou tente outra busca."
            symbol="store"
          />
        )}
      </section>
    </>
  );
}
export function Timeline({ actions }: { actions: ViewActions }) {
  const { plan } = usePlanning();
  const rows = [...plan.timeline].sort((a, b) =>
    `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
  );
  return (
    <>
      <PageHeading
        title="O nosso dia, momento a momento."
        subtitle="Uma agenda para deixar espaço para o que mais importa: viver cada instante."
      >
        <button
          className="button primary"
          onClick={() => actions.edit("timeline")}
        >
          <Icon name="plus" /> Novo momento
        </button>
      </PageHeading>
      <section className="card">
        <CardHeading
          title="Cronograma do casamento"
          subtitle="Horários de Brasília. Inclua cerimônia, fotos, festa e encontros importantes."
        >
          <ActionButton action={() => exportCalendar(plan)}>
            <Icon name="download" /> Baixar agenda
          </ActionButton>
        </CardHeading>
        <div className="timeline-list">
          {rows.map((item) => (
            <article key={item.id} className="timeline-item">
              <div className="timeline-time">
                <strong>{item.time}</strong>
                <small>{formatDate(item.date)}</small>
              </div>
              <span className="timeline-dot" />
              <div className="timeline-content">
                <h3>{item.name}</h3>
                {item.location && (
                  <p>
                    <Icon name="pin" /> {item.location}
                  </p>
                )}
                {item.notes && <p>{item.notes}</p>}
              </div>
              <RowActions
                name={item.name}
                onEdit={() => actions.edit("timeline", item)}
                onDelete={() => actions.remove("timeline", item)}
              />
            </article>
          ))}
          {!rows.length && (
            <EmptyState
              symbol="calendar"
              title="Um dia cheio de possibilidades"
              description="Adicione o primeiro momento do cronograma."
            />
          )}
        </div>
      </section>
    </>
  );
}
