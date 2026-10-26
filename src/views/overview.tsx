import { useEffect, useState } from "react";
import { usePlanning } from "../app/context.tsx";
import {
  CATEGORIES,
  type Collection,
  type RecordItem,
  type Plan,
} from "../domain/schema.ts";
import {
  countdown,
  totals,
  money,
  shortMoney,
  formatDate,
  budgetTimeline,
  reminderItems,
  today,
} from "../domain/planning.ts";
import {
  Icon,
  PageHeading,
  CardHeading,
  Badge,
  EmptyState,
} from "../components/ui.tsx";
import { TaskRow } from "./collections.tsx";

export interface ViewActions {
  edit: (
    collection: Collection,
    record?: RecordItem,
    vendorId?: string,
  ) => void;
  remove: (collection: Collection, record: RecordItem) => void;
  finance: (id: string) => void;
  invite: (id: string) => void;
  response: () => void;
}
function CountdownBanner() {
  const { plan } = usePlanning();
  const [clock, setClock] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  const count = countdown(plan.settings, clock);
  const day = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(`${plan.settings.weddingDate}T12:00:00-03:00`));
  return (
    <section
      className="countdown-banner"
      aria-label="Contagem regressiva para o casamento"
    >
      <div className="hero-copy">
        <span className="hero-overline">
          <Icon name="sparkles" /> O MELHOR DIA ESTÁ CHEGANDO
        </span>
        <h2>
          Para sempre começa
          <br />
          em <em>{day}.</em>
        </h2>
        <div className="hero-date">
          <span className="hero-date-main">
            <Icon name="calendar" />{" "}
            {formatDate(plan.settings.weddingDate, true)} ·{" "}
            {plan.settings.weddingTime} · Brasília
          </span>
          <span className="hero-date-divider">•</span>
          <span className="hero-date-detail">
            {plan.settings.location || "Uma data, infinitas memórias"}
          </span>
        </div>
      </div>
      <svg
        className="hero-botanical"
        viewBox="0 0 190 220"
        fill="none"
        aria-hidden="true"
      >
        <g stroke="currentColor" strokeWidth="1.1">
          <path d="M70 220C130 150 98 72 163 15M107 155C62 146 54 114 42 84m67 42c26 8 47-8 58-19m-49-16c-8-30 7-50 12-59M90 182c-35-5-50-18-61-42" />
          <path d="M42 84c-24-4-33-23-29-39 24 9 30 25 29 39Zm9 22c-1-23 10-34 27-39 3 20-7 35-27 39Zm58 20c15-25 39-32 58-19-18 20-35 24-58 19Zm14-57c-20-18-22-37-9-51 16 16 21 33 9 51Zm15-18c-1-25 10-39 32-43-2 20-12 35-32 43ZM90 182c-7-23-26-33-48-27 8 22 25 29 48 27Z" />
          <ellipse
            cx="105"
            cy="180"
            rx="18"
            ry="25"
            transform="rotate(-30 105 180)"
          />
          <ellipse
            cx="126"
            cy="179"
            rx="18"
            ry="25"
            transform="rotate(30 126 179)"
          />
        </g>
      </svg>
      <div className="countdown-wrap">
        <div className="countdown-label">
          {count.arrived
            ? "O nosso grande dia chegou! ♡"
            : "Contando os instantes para o nosso sim"}
        </div>
        <div className="countdown" aria-live="off">
          {(["days", "hours", "minutes", "seconds"] as const).map(
            (key, index) => (
              <div className="countdown-unit" key={key}>
                <strong>{String(count[key]).padStart(2, "0")}</strong>
                <span>{["dias", "horas", "minutos", "segundos"][index]}</span>
              </div>
            ),
          )}
        </div>
        <span className="countdown-note">
          <Icon name="heart" /> E uma vida inteira pela frente.
        </span>
      </div>
    </section>
  );
}
function BudgetChart({ plan }: { plan: Plan }) {
  const values = budgetTimeline(plan);
  const max =
    Math.max(plan.settings.budget, ...values.map((item) => item.planned), 1) *
    1.1;
  const xs = values.map((_, index) => 52 + (index * 580) / (values.length - 1));
  function path(field: "planned" | "paid") {
    const ys = values.map((item) => 184 - (item[field] / max) * 160);
    let line = `M${xs[0]},${ys[0]}`;
    for (let i = 1; i < xs.length; i++) {
      const mid = (xs[i - 1] + xs[i]) / 2;
      line += ` C${mid},${ys[i - 1]} ${mid},${ys[i]} ${xs[i]},${ys[i]}`;
    }
    return line;
  }
  return (
    <>
      <div className="chart-scroll">
        <svg
          className="budget-chart"
          viewBox="0 0 665 227"
          role="img"
          aria-label="Previsão acumulada e pagamentos registrados, por mês. Os saldos importados sem data aparecem no mês atual."
        >
          <defs>
            <linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#8faed2" stopOpacity=".3" />
              <stop offset="100%" stopColor="#8faed2" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <line
                x1="52"
                y1={184 - i * 40}
                x2="635"
                y2={184 - i * 40}
                stroke="#edf0ee"
              />
              <text
                x="42"
                y={188 - i * 40}
                textAnchor="end"
                className="chart-axis"
              >
                {new Intl.NumberFormat("pt-BR", {
                  notation: "compact",
                  maximumFractionDigits: 1,
                }).format((max * i) / 4)}
              </text>
            </g>
          ))}
          <path
            d={`${path("planned")} L632,184 L52,184Z`}
            fill="url(#chart-fill)"
          />
          <path
            d={path("planned")}
            fill="none"
            stroke="#7197c5"
            strokeWidth="2.6"
          />
          <path
            d={path("paid")}
            fill="none"
            stroke="#4c7757"
            strokeWidth="2.4"
          />
          {values.map((item, i) => (
            <g key={i}>
              <circle
                cx={xs[i]}
                cy={184 - (item.planned / max) * 160}
                r="3.3"
                fill="#fff"
                stroke="#7197c5"
                strokeWidth="1.8"
              >
                <title>
                  {item.label}: previsto {money(item.planned)}; pago{" "}
                  {money(item.paid)}
                </title>
              </circle>
              <text
                x={xs[i]}
                y="213"
                textAnchor="middle"
                className="chart-axis"
                fontSize={values.length > 9 ? 8 : 10}
              >
                {item.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="chart-caption">
        <Icon name="info" /> Período automático · pagamentos sem data entram no
        mês atual.
      </div>
    </>
  );
}

export function Overview({ actions }: { actions: ViewActions }) {
  const { plan } = usePlanning();
  const t = totals(plan);
  const tasks = plan.tasks
    .filter((item) => !item.done)
    .sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"))
    .slice(0, 3);
  const upcoming = reminderItems(plan)
    .filter((item) => item.date >= today())
    .slice(0, 3);
  const palette = [
    "#244e40",
    "#f28b50",
    "#83a5d1",
    "#b0c9a4",
    "#e7bb7d",
    "#b4cce7",
    "#d5ddd5",
  ];
  const categories = CATEGORIES.map((name, index) => ({
    name,
    index,
    amount: plan.expenses
      .filter((item) => item.category === name)
      .reduce((sum, item) => sum + item.amount, 0),
  }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  let ringStart = 0;
  const ring = categories
    .map((item) => {
      const angle = (item.amount / t.contracted) * 360;
      const part = `${palette[item.index]} ${ringStart}deg ${ringStart + angle}deg`;
      ringStart += angle;
      return part;
    })
    .join(",");
  const cards = [
    {
      label: "Orçamento total",
      value: shortMoney(plan.settings.budget),
      icon: "wallet",
      color: "green",
      foot:
        t.available >= 0
          ? `${shortMoney(t.available)} disponíveis`
          : `${shortMoney(-t.available)} acima do orçamento`,
      view: "budget",
      detail: `${t.budgetPercent}% utilizado`,
    },
    {
      label: "Já investimos",
      value: shortMoney(t.paid),
      icon: "coins",
      color: "orange",
      foot: `de ${shortMoney(t.contracted)} contratados`,
      view: "budget",
      detail: `${plan.expenses.reduce((sum, item) => sum + item.payments.length, 0)} pagamentos no histórico`,
    },
    {
      label: "Pessoas confirmadas",
      value: `${t.confirmed} / ${plan.settings.guestTarget}`,
      icon: "users",
      color: "blue",
      foot: `${t.invited} pessoas convidadas, com acompanhantes`,
      view: "guests",
      detail: `${t.pending} aguardando resposta`,
    },
    {
      label: "Tudo no caminho",
      value: `${t.progress}%`,
      icon: "checklist",
      color: "sage",
      foot: `${t.completed} de ${plan.tasks.length} tarefas concluídas`,
      view: "tasks",
      detail: `${plan.timeline.length} momentos no cronograma`,
    },
  ];
  return (
    <>
      <PageHeading
        title={
          plan.settings.couple
            ? `O nosso sim, ${plan.settings.couple}.`
            : "Nosso grande dia começa aqui."
        }
        subtitle="Um lugar para sonhar, organizar e cuidar de cada detalhe."
      >
        <a href="#reminders" className="heading-date">
          <Icon name="bell" /> Nossos lembretes
        </a>
      </PageHeading>
      <CountdownBanner />
      <section className="stats-grid" aria-label="Resumo do planejamento">
        {cards.map((card) => (
          <a key={card.label} className="stat-card" href={`#${card.view}`}>
            <div className="stat-top">
              <span>{card.label}</span>
              <span className={`stat-icon ${card.color}`}>
                <Icon name={card.icon} />
              </span>
            </div>
            <strong className="stat-value">{card.value}</strong>
            <span className="stat-foot">{card.foot}</span>
            <div className="stat-detail">
              <span className="mini-badge">{card.detail}</span>
            </div>
          </a>
        ))}
      </section>
      <div className="dashboard-grid">
        <section className="card financial-card">
          <CardHeading
            title="Nosso orçamento"
            subtitle="Um sonho que cabe nos nossos planos."
          >
            <a className="text-link" href="#budget">
              Ver detalhes <Icon name="arrow" />
            </a>
          </CardHeading>
          <div className="chart-summary">
            <div>
              <span>Total contratado</span>
              <strong>{shortMoney(t.contracted)}</strong>
            </div>
            <div className="chart-legends">
              <span className="chart-legend">
                <i /> Previsto
              </span>
              <span className="chart-legend paid-legend">
                <i /> Pago
              </span>
            </div>
          </div>
          <BudgetChart plan={plan} />
        </section>
        <section className="card distribution-card">
          <CardHeading
            title="Cada detalhe conta"
            subtitle="Como estamos dividindo o orçamento."
          >
            <Icon name="flower" />
          </CardHeading>
          <div
            className="donut"
            role="img"
            aria-label="Distribuição do orçamento por categoria"
            style={{ background: ring ? `conic-gradient(${ring})` : "#edf1ed" }}
          >
            <div>
              <span>Nosso investimento</span>
              <strong>{shortMoney(t.contracted)}</strong>
              <small>{categories.length} categorias</small>
            </div>
          </div>
          <div className="distribution-legend">
            {categories.map((item) => (
              <div key={item.name}>
                <span>
                  <i style={{ background: palette[item.index] }} />
                  {item.name}
                </span>
                <strong>
                  {Math.round((item.amount / t.contracted) * 100)}%
                </strong>
              </div>
            ))}
          </div>
        </section>
        <section className="card tasks-card">
          <CardHeading
            title="Os próximos passos"
            subtitle="Uma tarefa de cada vez. Juntos."
          >
            <a className="text-link" href="#tasks">
              Ver checklist <Icon name="arrow" />
            </a>
          </CardHeading>
          <div className="upcoming-list">
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} actions={actions} compact />
            ))}
            {!tasks.length && (
              <EmptyState
                title="Tudo em dia por aqui!"
                description="Adicione o próximo passo do planejamento."
                symbol="checklist"
              />
            )}
          </div>
          <button className="subtle-add" onClick={() => actions.edit("tasks")}>
            <Icon name="plus" /> Adicionar uma tarefa
          </button>
        </section>
        <section className="card vendors-preview">
          <CardHeading
            title="Em breve no nosso calendário"
            subtitle="Um olhar para o que vem pela frente."
          >
            <a className="text-link" href="#reminders">
              Ver todos <Icon name="arrow" />
            </a>
          </CardHeading>
          <div className="vendor-preview-list">
            {upcoming.map((item) => (
              <a
                className="vendor-preview-row"
                href={
                  item.kind === "Pagamento"
                    ? "#budget"
                    : item.kind === "Tarefa"
                      ? "#tasks"
                      : "#timeline"
                }
                key={item.id}
              >
                <span
                  className={`category-symbol ${item.kind === "Pagamento" ? "orange" : "blue"}`}
                >
                  <Icon
                    name={item.kind === "Pagamento" ? "coins" : "calendar"}
                  />
                </span>
                <span>
                  <strong>{item.name}</strong>
                  <small>
                    {formatDate(item.date)} · {item.time}
                  </small>
                </span>
                <Badge color={item.kind === "Pagamento" ? "orange" : "blue"}>
                  {item.kind}
                </Badge>
              </a>
            ))}
            {!upcoming.length && (
              <EmptyState
                title="Espaço para novos planos"
                description="Seus próximos compromissos aparecem aqui."
              />
            )}
          </div>
        </section>
      </div>
      <section className="love-note">
        <Icon name="heart" />
        <p>
          Mais do que organizar um dia, estamos construindo{" "}
          <strong>o começo da nossa história.</strong>
        </p>
        <span>com amor, nós.</span>
      </section>
    </>
  );
}
