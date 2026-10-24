import "./style.css";
import { icon, logo } from "./icons.js";
import {
  STORAGE_KEY,
  WEDDING_DATE,
  CATEGORIES,
  GUEST_GROUPS,
  GUEST_STATUSES,
  VENDOR_STATUSES,
  initialState,
  countdown,
  totals,
  expenseStatus,
  money,
  shortMoney,
  escape as e,
  formatDate,
  today,
  uid,
  validateState,
} from "./model.js";

const app = document.querySelector("#app");
const dialog = document.querySelector("#editor");
let loadWarning = "";
let state = initialState();
try {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) state = validateState(JSON.parse(stored));
} catch {
  loadWarning =
    "Não foi possível ler os dados salvos. Exibindo exemplos; importe seu último backup em Configurações.";
}
const views = {
  overview: "Visão geral",
  budget: "Orçamento",
  guests: "Convidados",
  tasks: "Checklist",
  vendors: "Fornecedores",
  settings: "Configurações",
};
let route = Object.hasOwn(views, location.hash.slice(1))
  ? location.hash.slice(1)
  : "overview";
let filter = "Todos";
let query = "";
let toastTimer;

function toast(message, error = false) {
  const el = document.querySelector("#toast");
  el.textContent = message;
  el.classList.toggle("is-error", error);
  el.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("visible"), 5000);
}

function commit(next, message = "Tudo salvo por aqui.") {
  try {
    next = validateState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    state = next;
    loadWarning = "";
    render();
    if (message) toast(message);
    return true;
  } catch (error) {
    toast(
      error.name === "QuotaExceededError" || error.name === "SecurityError"
        ? "O navegador não permitiu salvar. Exporte um backup antes de sair."
        : error.message,
      true,
    );
    return false;
  }
}

const badge = (text, color = "green") =>
  `<span class="badge ${color}"><span class="status-dot"></span>${e(text)}</span>`;
const sectionLink = (text, view) =>
  `<a class="text-link" href="#${view}">${text}${icon("arrow")}</a>`;
const categoryIcon = (category) =>
  ({
    "Espaço e buffet": "store",
    Decoração: "flower",
    "Foto e vídeo": "sparkles",
    Música: "heart",
    "Trajes e beleza": "heart",
    Papelaria: "checklist",
    Outros: "coins",
  })[category] || "heart";
const actionButtons = (collection, item) =>
  `<div class="row-actions"><button class="icon-button" type="button" data-edit="${collection}" data-id="${e(item.id)}" aria-label="Editar ${e(item.name)}">${icon("edit")}</button><button class="icon-button danger-hover" type="button" data-delete="${collection}" data-id="${e(item.id)}" aria-label="Excluir ${e(item.name)}">${icon("trash")}</button></div>`;

function sidebar() {
  const links = [
    ["overview", "grid"],
    ["budget", "wallet"],
    ["guests", "users"],
    ["tasks", "checklist"],
    ["vendors", "store"],
  ];
  return `<aside class="sidebar" id="sidebar" aria-label="Menu principal">
    <a class="brand" href="#overview"><span class="brand-mark">${logo}</span><span>nosso<span class="brand-second">casamento<span class="brand-dot">.</span></span></span></a>
    <span class="sidebar-caption">O NOSSO PLANEJAMENTO</span>
    <nav>${links.map(([key, symbol]) => `<a href="#${key}" class="nav-item ${route === key ? "active" : ""}" ${route === key ? 'aria-current="page"' : ""}>${icon(symbol)}<span>${views[key]}</span>${key === "tasks" ? `<span class="nav-count">${state.tasks.filter((t) => !t.done).length}</span>` : ""}</a>`).join("")}</nav>
    <div class="sidebar-love"><span class="love-doodle">${icon("heart")}</span><p>Um dia especial.<br><strong>Uma vida inteira juntos.</strong></p><span>Cada detalhe conta uma história.</span></div>
    <div class="sidebar-bottom"><a href="#settings" class="nav-item ${route === "settings" ? "active" : ""}" ${route === "settings" ? 'aria-current="page"' : ""}>${icon("settings")}<span>Configurações</span></a><div class="sidebar-date">${icon("calendar")}<span>24 de julho de 2027</span><span class="tiny-star">✦</span></div></div>
  </aside><button class="mobile-overlay" data-action="close-menu" aria-label="Fechar menu"></button>`;
}

function topbar() {
  return `<header class="topbar"><div class="breadcrumb"><button class="icon-button mobile-menu" data-action="menu" aria-label="Abrir menu" aria-expanded="false" aria-controls="sidebar">${icon("menu")}</button><span class="breadcrumb-home">Nosso casamento</span><span class="breadcrumb-slash">/</span><strong>${views[route]}</strong></div><div class="topbar-actions"><button class="search-trigger" data-action="search" aria-label="Buscar no planejamento">${icon("search")}<span>Buscar no planejamento</span><kbd>/</kbd></button><span class="header-divider"></span><button class="icon-button notification" data-action="upcoming" aria-label="Ver próximas tarefas">${icon("bell")}${state.tasks.some((t) => !t.done) ? "<span></span>" : ""}</button><a href="#settings" class="avatar" aria-label="Configurações do casal">${icon("heart")}</a></div></header>`;
}

function pageHeading(title, subtitle, action = "") {
  return `<div class="page-heading"><div><div class="eyebrow">PLANEJANDO O NOSSO SIM</div><h1>${title}</h1><p>${subtitle}</p></div>${action}</div>`;
}
function addButton(collection, label) {
  return `<button class="button primary" data-new="${collection}">${icon("plus")}<span>${label}</span></button>`;
}

function overview() {
  const t = totals(state);
  const pendingTasks = [...state.tasks]
    .filter((task) => !task.done)
    .sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"))
    .slice(0, 3);
  const categories = CATEGORIES.map((name, index) => ({
    name,
    index,
    total: state.expenses
      .filter((expense) => expense.category === name)
      .reduce((sum, expense) => sum + expense.amount, 0),
  }))
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total);
  let ringStart = 0;
  const palette = [
    "#244e40",
    "#f28b50",
    "#83a5d1",
    "#b0c9a4",
    "#e7bb7d",
    "#b4cce7",
    "#d5ddd5",
  ];
  const ring = categories
    .map((item) => {
      const angle = (item.total / t.contracted) * 360;
      const part = `${palette[item.index]} ${ringStart}deg ${ringStart + angle}deg`;
      ringStart += angle;
      return part;
    })
    .join(", ");
  return `${pageHeading(state.settings.couple ? `O nosso sim, ${e(state.settings.couple)}.` : "Nosso grande dia começa aqui.", "Um lugar para sonhar, organizar e cuidar de cada detalhe.", `<div class="heading-date">${icon("calendar")}<span>${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date())}</span></div>`)}
    <section class="countdown-banner" aria-label="Contagem regressiva para o casamento">
      <div class="hero-copy"><span class="hero-overline">${icon("sparkles")} O MELHOR DIA ESTÁ CHEGANDO</span><h2>Para sempre começa<br>em <em>24 de julho.</em></h2><div class="hero-date"><span class="hero-date-main">${icon("calendar")} Sábado, 24 de julho de 2027</span><span class="hero-date-divider">•</span><span class="hero-date-detail">${state.settings.location ? e(state.settings.location) : "Uma data, infinitas memórias"}</span></div></div>
      <svg class="hero-botanical" viewBox="0 0 190 220" fill="none" aria-hidden="true"><g stroke="currentColor" stroke-width="1.1"><path d="M70 220C130 150 98 72 163 15M107 155C62 146 54 114 42 84m67 42c26 8 47-8 58-19m-49-16c-8-30 7-50 12-59M90 182c-35-5-50-18-61-42"/><path d="M42 84c-24-4-33-23-29-39 24 9 30 25 29 39Zm9 22c-1-23 10-34 27-39 3 20-7 35-27 39Zm58 20c15-25 39-32 58-19-18 20-35 24-58 19Zm14-57c-20-18-22-37-9-51 16 16 21 33 9 51Zm15-18c-1-25 10-39 32-43-2 20-12 35-32 43ZM90 182c-7-23-26-33-48-27 8 22 25 29 48 27Z"/><ellipse cx="105" cy="180" rx="18" ry="25" transform="rotate(-30 105 180)"/><ellipse cx="126" cy="179" rx="18" ry="25" transform="rotate(30 126 179)"/></g></svg>
      <div class="countdown-wrap"><div class="countdown-label" id="countdown-label">Contando os instantes para o nosso sim</div><div class="countdown">${[
        ["days", "dias"],
        ["hours", "horas"],
        ["minutes", "minutos"],
        ["seconds", "segundos"],
      ]
        .map(
          ([key, label]) =>
            `<div class="countdown-unit"><strong data-countdown="${key}">00</strong><span>${label}</span></div>`,
        )
        .join(
          "",
        )}</div><span class="countdown-note">${icon("heart")} E uma vida inteira pela frente.</span></div>
    </section>
    <section class="stats-grid" aria-label="Resumo do planejamento">
      ${statCard("Orçamento total", shortMoney(state.settings.budget), "wallet", "green", `<span class="stat-foot">${t.available >= 0 ? `${shortMoney(t.available)} disponíveis` : `${shortMoney(-t.available)} acima do orçamento`}</span>`, "budget", `<span class="mini-badge ${t.available < 0 ? "orange" : ""}">${t.budgetPercent}% utilizado</span>`)}
      ${statCard("Já investimos", shortMoney(t.paid), "coins", "orange", `<span class="stat-foot">de ${shortMoney(t.contracted)} contratados</span>`, "budget", `<span class="stat-tiny">${icon("check")} Nosso sonho tomando forma</span>`)}
      ${statCard("Convidados confirmados", `${t.confirmed}<span class="stat-denominator"> / ${state.settings.guestTarget}</span>`, "users", "blue", `<span class="stat-foot">${t.invited} pessoas na lista, com acompanhantes</span>`, "guests", `<div class="mini-avatars"><span>♡</span><span>♡</span><span>♡</span><span>+${t.confirmed}</span></div>`)}
      ${statCard("Tudo no caminho", `${t.progress}<span class="stat-denominator">%</span>`, "checklist", "sage", `<span class="stat-foot">${t.completed} de ${state.tasks.length} tarefas concluídas</span>`, "tasks", `<div class="progress-track"><span style="width:${t.progress}%"></span></div>`)}
    </section>
    <div class="dashboard-grid"><section class="card financial-card"><div class="card-heading"><div><h2>Nosso orçamento</h2><p>Um sonho que cabe nos nossos planos.</p></div>${sectionLink("Ver detalhes", "budget")}</div><div class="chart-summary"><div><span>Total contratado</span><strong>${shortMoney(t.contracted)}</strong></div><span class="chart-legend"><i></i> Compromissos acumulados</span></div>${budgetChart(state)}</section>
      <section class="card distribution-card"><div class="card-heading"><div><h2>Cada detalhe conta</h2><p>Como estamos dividindo o orçamento.</p></div><span class="small-icon">${icon("flower")}</span></div><div class="donut" role="img" aria-label="Distribuição do orçamento por categoria" style="background:${ring ? `conic-gradient(${ring})` : "#edf1ed"}"><div><span>Nosso investimento</span><strong>${shortMoney(t.contracted)}</strong><small>${categories.length} categorias</small></div></div><div class="distribution-legend">${
        categories
          .slice(0, 4)
          .map(
            (item) =>
              `<div><span><i style="background:${palette[item.index]}"></i>${e(item.name)}</span><strong>${Math.round((item.total / t.contracted) * 100)}%</strong></div>`,
          )
          .join("") || '<p class="muted">Suas despesas aparecerão aqui.</p>'
      }</div></section>
      <section class="card tasks-card"><div class="card-heading"><div><h2>Os próximos passos</h2><p>Uma tarefa de cada vez. Juntos.</p></div>${sectionLink("Ver checklist", "tasks")}</div><div class="upcoming-list">${pendingTasks.map((task) => taskRow(task, true)).join("") || emptyState("checklist", "Tudo em dia por aqui!", "Adicione o próximo passo do seu planejamento.", "tasks")}</div><button class="subtle-add" data-new="tasks">${icon("plus")} Adicionar uma tarefa</button></section>
      <section class="card vendors-preview"><div class="card-heading"><div><h2>Quem faz acontecer</h2><p>Parceiros para um dia inesquecível.</p></div>${sectionLink("Ver todos", "vendors")}</div><div class="vendor-preview-list">${
        state.vendors
          .slice(0, 3)
          .map(
            (vendor) =>
              `<button class="vendor-preview-row" data-edit="vendors" data-id="${e(vendor.id)}"><span class="category-symbol ${vendor.category === "Decoração" ? "orange" : vendor.category === "Foto e vídeo" ? "blue" : "green"}">${icon(categoryIcon(vendor.category))}</span><span><strong>${e(vendor.name)}</strong><small>${e(vendor.category)}</small></span>${badge(vendor.status, vendor.status === "Contratado" ? "green" : vendor.status === "Em negociação" ? "orange" : "blue")}</button>`,
          )
          .join("") ||
        emptyState(
          "store",
          "Boas parcerias começam aqui",
          "Adicione seu primeiro fornecedor.",
          "vendors",
        )
      }</div></section></div>
    <section class="love-note">${icon("heart")}<p>Mais do que organizar um dia, estamos construindo <strong>o começo da nossa história.</strong></p><span>com amor, nós.</span></section>`;
}

function statCard(label, value, symbol, color, footer, view, detail) {
  return `<a class="stat-card" href="#${view}"><div class="stat-top"><span>${label}</span><span class="stat-icon ${color}">${icon(symbol)}</span></div><strong class="stat-value">${value}</strong>${footer}<div class="stat-detail">${detail}</div><span class="stat-arrow">${icon("arrowUp")}</span></a>`;
}

function budgetChart(data) {
  const months = [
    "Out",
    "Nov",
    "Dez",
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
  ];
  const values = months.map((_, index) => {
    const yearMonth =
      index < 3
        ? `2026-${String(index + 10).padStart(2, "0")}`
        : `2027-${String(index - 2).padStart(2, "0")}`;
    return data.expenses
      .filter((item) => (item.dueDate || WEDDING_DATE).slice(0, 7) <= yearMonth)
      .reduce((sum, item) => sum + item.amount, 0);
  });
  const max = Math.max(data.settings.budget, ...values, 1) * 1.13;
  const xs = values.map((_, i) => 55 + i * 63.5);
  const ys = values.map((value) => 184 - (value / max) * 160);
  let line = `M${xs[0]},${ys[0]}`;
  for (let i = 1; i < values.length; i++) {
    const mid = (xs[i - 1] + xs[i]) / 2;
    line += ` C${mid},${ys[i - 1]} ${mid},${ys[i]} ${xs[i]},${ys[i]}`;
  }
  return `<div class="chart-scroll"><svg class="budget-chart" viewBox="0 0 665 227" role="img" aria-label="Previsão acumulada dos compromissos por vencimento, de outubro de 2026 a julho de 2027. Total: ${e(money(totals(data).contracted))}."><defs><linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#8faed2" stop-opacity=".30"/><stop offset="100%" stop-color="#8faed2" stop-opacity="0"/></linearGradient></defs>${[
    0, 1, 2, 3, 4,
  ]
    .map((i) => {
      const y = 184 - i * 40;
      return `<line x1="55" y1="${y}" x2="635" y2="${y}" stroke="#edf0ee"/><text x="42" y="${y + 4}" text-anchor="end" class="chart-axis">${Math.round((max * i) / 4 / 1000)} mil</text>`;
    })
    .join(
      "",
    )}<path d="${line} L${xs.at(-1)},184 L55,184Z" fill="url(#chart-fill)"/><path d="${line}" fill="none" stroke="#7197c5" stroke-width="2.8" stroke-linecap="round"/>${values.map((value, i) => `<circle cx="${xs[i]}" cy="${ys[i]}" r="4" fill="#fff" stroke="#7197c5" stroke-width="2"><title>${months[i]}: ${money(value)}</title></circle>`).join("")}${months.map((month, i) => `<text x="${xs[i]}" y="213" text-anchor="middle" class="chart-axis">${month}</text>`).join("")}</svg></div><div class="chart-caption">${icon("info")} Valores agrupados pela data de vencimento · out/2026 a jul/2027</div>`;
}

function filters(options, placeholder) {
  return `<div class="list-toolbar"><div class="filter-tabs" aria-label="Filtrar registros">${options.map((option) => `<button class="filter-tab ${filter === option ? "selected" : ""}" data-filter="${e(option)}" aria-pressed="${filter === option}">${e(option)}</button>`).join("")}</div><label class="table-search">${icon("search")}<input id="list-search" type="search" placeholder="${placeholder}" value="${e(query)}" aria-label="${placeholder}" /></label></div>`;
}
function emptyState(symbol, title, description, collection) {
  return `<div class="empty-state"><span class="empty-icon">${icon(symbol)}</span><h3>${title}</h3><p>${description}</p>${collection ? `<button class="button secondary" data-new="${collection}">${icon("plus")} Adicionar</button>` : ""}</div>`;
}
const matching = (name) =>
  name.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"));

function budget() {
  const t = totals(state);
  const list = state.expenses.filter(
    (item) =>
      matching(`${item.name} ${item.category}`) &&
      (filter === "Todos" || expenseStatus(item) === filter),
  );
  return `${pageHeading("Um sonho que cabe nos planos.", "Acompanhe cada investimento, do primeiro sinal ao último detalhe.", addButton("expenses", "Nova despesa"))}<section class="budget-overview"><div class="budget-main"><span class="stat-icon green">${icon("wallet")}</span><div><span>Nosso orçamento</span><strong>${money(state.settings.budget)}</strong></div><button class="icon-button" data-action="edit-budget" aria-label="Editar orçamento total">${icon("edit")}</button></div><div><span>Total contratado</span><strong>${money(t.contracted)}</strong></div><div><span>Já pago</span><strong class="text-green">${money(t.paid)}</strong></div><div><span>Falta pagar</span><strong class="text-orange">${money(t.remaining)}</strong></div></section><section class="card"><div class="card-heading"><div><h2>Todos os investimentos</h2><p>${t.available >= 0 ? `${money(t.available)} disponíveis para os próximos detalhes.` : `Atenção: ${money(-t.available)} acima do orçamento definido.`}</p></div><span class="badge ${t.available >= 0 ? "green" : "orange"}">${t.budgetPercent}% do orçamento</span></div>${filters(["Todos", "Pago", "Parcial", "Pendente"], "Buscar despesa...")}<div class="table-scroll"><table><thead><tr><th>Descrição</th><th>Categoria</th><th>Valor total</th><th>Pago</th><th>Vencimento</th><th>Status</th><th><span class="sr-only">Ações</span></th></tr></thead><tbody>${list.map((item) => `<tr><td><strong>${e(item.name)}</strong></td><td>${e(item.category)}</td><td class="numeric">${money(item.amount)}</td><td class="numeric">${money(item.paid)}</td><td>${formatDate(item.dueDate, { day: "2-digit", month: "2-digit", year: "numeric" })}</td><td>${badge(expenseStatus(item), expenseStatus(item) === "Pago" ? "green" : expenseStatus(item) === "Parcial" ? "blue" : "orange")}</td><td>${actionButtons("expenses", item)}</td></tr>`).join("")}</tbody></table></div>${!list.length ? emptyState("wallet", "Nenhuma despesa por aqui", query || filter !== "Todos" ? "Tente outra busca ou outro filtro." : "Comece adicionando o primeiro investimento do grande dia.", state.expenses.length ? null : "expenses") : ""}<div class="table-footer">${list.length} ${list.length === 1 ? "despesa" : "despesas"} <span>Valores em reais (BRL)</span></div></section>`;
}

function guests() {
  const t = totals(state);
  const list = state.guests.filter(
    (item) =>
      matching(`${item.name} ${item.group}`) &&
      (filter === "Todos" || item.status === filter),
  );
  const declined = state.guests
    .filter((g) => g.status === "Não vai")
    .reduce((sum, g) => sum + 1 + g.companions, 0);
  return `${pageHeading("Gente que faz parte da história.", "Todas as pessoas que queremos por perto no nosso grande dia.", addButton("guests", "Novo convidado"))}<div class="summary-strip"><div>${icon("users")}<span><strong>${t.invited}</strong> pessoas na lista</span></div><div><i class="status-dot green-dot"></i><span><strong>${t.confirmed}</strong> confirmadas</span></div><div><i class="status-dot orange-dot"></i><span><strong>${t.invited - t.confirmed - declined}</strong> aguardando resposta</span></div><div><span>Meta de convidados: <strong>${state.settings.guestTarget}</strong></span></div></div><section class="card"><div class="card-heading"><div><h2>Nossa lista de convidados</h2><p>Os totais incluem os acompanhantes de cada convite.</p></div></div>${filters(["Todos", ...GUEST_STATUSES], "Buscar convidado...")}<div class="table-scroll"><table><thead><tr><th>Convidado</th><th>Grupo</th><th>Acompanhantes</th><th>Confirmação</th><th><span class="sr-only">Ações</span></th></tr></thead><tbody>${list
    .map(
      (guest, index) =>
        `<tr><td><span class="person-cell"><span class="person-avatar color-${index % 3}">${e(
          guest.name
            .split(" ")
            .map((word) => word[0])
            .slice(0, 2)
            .join(""),
        )}</span><strong>${e(guest.name)}</strong></span></td><td>${e(guest.group)}</td><td>${guest.companions === 0 ? "Sem acompanhantes" : `+${guest.companions} ${guest.companions === 1 ? "pessoa" : "pessoas"}`}</td><td>${badge(guest.status, guest.status === "Confirmado" ? "green" : guest.status === "Pendente" ? "orange" : "neutral")}</td><td>${actionButtons("guests", guest)}</td></tr>`,
    )
    .join(
      "",
    )}</tbody></table></div>${!list.length ? emptyState("users", "Nenhum convidado encontrado", query || filter !== "Todos" ? "Tente outro nome ou filtro." : "Adicione as pessoas que farão parte desse dia.", state.guests.length ? null : "guests") : ""}<div class="table-footer">${list.length} ${list.length === 1 ? "convite" : "convites"} <span>Confirmação registrada manualmente</span></div></section>`;
}

function taskRow(task, compact = false) {
  const overdue = !task.done && task.dueDate && task.dueDate < today();
  return `<div class="task-row ${task.done ? "completed" : ""}"><button class="task-check" data-toggle="${e(task.id)}" aria-label="${task.done ? "Reabrir" : "Concluir"} tarefa: ${e(task.name)}" aria-pressed="${task.done}">${task.done ? icon("check") : ""}</button><div class="task-info"><strong>${e(task.name)}</strong><span>${e(task.category)}${task.dueDate ? `<i>·</i><span class="${overdue ? "text-orange" : ""}">${overdue ? "Atrasada · " : ""}${formatDate(task.dueDate)}</span>` : ""}</span></div>${compact ? `<button class="icon-button" data-edit="tasks" data-id="${e(task.id)}" aria-label="Editar ${e(task.name)}">${icon("arrowUp")}</button>` : actionButtons("tasks", task)}</div>`;
}

function tasks() {
  const t = totals(state);
  const list = state.tasks
    .filter(
      (task) =>
        matching(`${task.name} ${task.category}`) &&
        (filter === "Todos" ||
          (filter === "Concluídas" ? task.done : !task.done)),
    )
    .sort(
      (a, b) =>
        Number(a.done) - Number(b.done) ||
        (a.dueDate || "9999").localeCompare(b.dueDate || "9999"),
    );
  return `${pageHeading("Um passo mais perto do sim.", "Tire os planos do papel e celebre cada pequena conquista.", addButton("tasks", "Nova tarefa"))}<section class="task-progress-card"><span class="stat-icon green">${icon("checklist")}</span><div><h2>Estamos fazendo acontecer!</h2><p>${t.completed} de ${state.tasks.length} tarefas concluídas. Cada passo merece ser celebrado.</p><div class="progress-track"><span style="width:${t.progress}%"></span></div></div><strong>${t.progress}<small>%</small></strong></section><section class="card"><div class="card-heading"><div><h2>Nosso checklist</h2><p>Da primeira ideia ao último detalhe.</p></div></div>${filters(["Todos", "Pendentes", "Concluídas"], "Buscar tarefa...")}<div class="full-task-list">${list.map((task) => taskRow(task)).join("") || emptyState("checklist", "Tudo tranquilo por aqui", query || filter !== "Todos" ? "Nenhuma tarefa corresponde a esse filtro." : "Adicione a primeira tarefa do planejamento.", state.tasks.length ? null : "tasks")}</div><div class="table-footer">${list.length} ${list.length === 1 ? "tarefa" : "tarefas"}<span>Clique no círculo para concluir</span></div></section>`;
}

function vendors() {
  const list = state.vendors.filter(
    (vendor) =>
      matching(`${vendor.name} ${vendor.category}`) &&
      (filter === "Todos" || vendor.status === filter),
  );
  return `${pageHeading("Boas mãos para o nosso sonho.", "Encontre, organize e acompanhe quem vai fazer parte desse dia.", addButton("vendors", "Novo fornecedor"))}<section class="card vendor-container">${filters(["Todos", ...VENDOR_STATUSES], "Buscar fornecedor...")}<div class="vendor-grid">${list.map((vendor) => `<article class="vendor-card"><div class="vendor-card-top"><span class="category-symbol ${vendor.category === "Decoração" ? "orange" : vendor.category === "Foto e vídeo" ? "blue" : "green"}">${icon(categoryIcon(vendor.category))}</span>${badge(vendor.status, vendor.status === "Contratado" ? "green" : vendor.status === "Em negociação" ? "orange" : "blue")}</div><h2>${e(vendor.name)}</h2><span class="vendor-category">${e(vendor.category)}</span><p>${e(vendor.notes) || "Espaço para ideias, referências e combinados."}</p><div class="vendor-card-bottom"><span>${vendor.contact ? e(vendor.contact) : "Contato ainda não informado"}</span>${actionButtons("vendors", vendor)}</div></article>`).join("")}</div>${!list.length ? emptyState("store", "Vamos encontrar boas parcerias?", query || filter !== "Todos" ? "Nenhum fornecedor corresponde a essa busca." : "Adicione espaços, fotógrafos, floristas e mais.", state.vendors.length ? null : "vendors") : ""}</section>`;
}

function settings() {
  return `${pageHeading("Do nosso jeitinho.", "Os detalhes que tornam esse planejamento só nosso.")}<div class="settings-grid"><section class="card settings-card"><div class="card-heading"><div><h2>O nosso casamento</h2><p>Um plano que começa com vocês.</p></div><span class="stat-icon orange">${icon("heart")}</span></div><form id="settings-form"><label>Nome do casal<input name="couple" maxlength="80" placeholder="Ex.: Maria & João" value="${e(state.settings.couple)}" /><small>Opcional. Aparece na saudação da visão geral.</small></label><label>Data do casamento<input value="24/07/2027 · sábado" disabled /><small>A contagem começa à meia-noite, no horário de Brasília.</small></label><div class="form-grid"><label>Orçamento total (R$)<input name="budget" type="number" min="0" max="1000000000" step="0.01" value="${state.settings.budget}" required /></label><label>Meta de convidados<input name="guestTarget" type="number" min="0" max="100000" step="1" value="${state.settings.guestTarget}" required /></label></div><label>Local do casamento<input name="location" maxlength="200" value="${e(state.settings.location)}" placeholder="Ainda estamos escolhendo..." /></label><button class="button primary" type="submit">${icon("check")} Salvar preferências</button></form></section><div class="settings-right"><section class="card settings-card"><div class="card-heading"><div><h2>Nossos planos, bem guardados.</h2><p>Exporte um backup para levar seus dados com você.</p></div></div><p class="settings-description">Os dados ficam salvos neste navegador. Para usar em outro dispositivo, exporte o arquivo JSON e importe por lá. A importação substitui o planejamento atual.</p><div class="backup-actions"><button class="button secondary" data-action="export">${icon("download")} Exportar backup</button><button class="button secondary" data-action="import">${icon("upload")} Importar backup</button></div><input type="file" accept="application/json,.json" id="backup-file" hidden /></section><section class="card settings-card demo-card"><div class="card-heading"><div><h2>${state.demo ? "Vamos escrever nossa história?" : "Um novo começo"}</h2><p>${state.demo ? "Você está explorando dados de exemplo." : "Recomece o planejamento quando precisar."}</p></div>${icon("sparkles")}</div><p class="settings-description">Começar do zero remove despesas, convidados, tarefas e fornecedores, e mantém suas preferências. Exporte um backup antes de continuar.</p><button class="button secondary" data-action="reset">${icon("reset")} Começar do zero</button>${!state.demo ? '<button class="text-link restore-demo" data-action="demo">Carregar dados de exemplo</button>' : ""}</section><div class="privacy-note">${icon("info")}<p>Sem cadastro e sem envio dos seus dados a um servidor. O planejamento é local e não sincroniza automaticamente entre dispositivos.</p></div></div></div>`;
}

function render() {
  document.title = `${views[route]} · Nosso Casamento`;
  app.innerHTML = `<a class="skip-link" href="#main-content">Pular para o conteúdo</a>${sidebar()}<div class="workspace">${topbar()}<main id="main-content" tabindex="-1">${loadWarning ? `<div class="storage-warning" role="alert">${icon("info")}${e(loadWarning)}</div>` : ""}${{ overview, budget, guests, tasks, vendors, settings }[route]()}<footer class="page-footer"><span>${logo} Nosso casamento<span class="footer-dot">·</span>feito para o nosso sim.</span>${state.demo ? '<a href="#settings" class="demo-indicator"><i></i> Explorando dados de exemplo</a>' : '<span class="saved-indicator">Dados salvos neste navegador</span>'}</footer></main></div>`;
  document.body.classList.remove("menu-open");
  syncMenu();
  updateCountdown();
}

function syncMenu() {
  const mobile = window.matchMedia("(max-width: 780px)").matches;
  const open = document.body.classList.contains("menu-open");
  document.querySelector("#sidebar").inert = mobile && !open;
  document
    .querySelector(".mobile-menu")
    .setAttribute("aria-expanded", String(open));
}
window.matchMedia("(max-width: 780px)").addEventListener("change", syncMenu);

function updateCountdown() {
  const count = countdown();
  document.querySelectorAll("[data-countdown]").forEach((element) => {
    element.textContent = String(count[element.dataset.countdown]).padStart(
      2,
      "0",
    );
  });
  const label = document.querySelector("#countdown-label");
  if (label)
    label.textContent = count.arrived
      ? "O nosso grande dia chegou! ♡"
      : "Contando os instantes para o nosso sim";
}

function navigate(nextRoute) {
  route = Object.hasOwn(views, nextRoute) ? nextRoute : "overview";
  filter = "Todos";
  query = "";
  render();
  window.scrollTo({ top: 0, behavior: "instant" });
}
window.addEventListener("hashchange", () => {
  if (location.hash === "#main-content") return;
  navigate(location.hash.slice(1));
});

const input = (name, label, value = "", options = "") =>
  `<label>${label}<input name="${name}" value="${e(value)}" ${options} /></label>`;
const select = (name, label, choices, selected) =>
  `<label>${label}<select name="${name}">${choices.map((choice) => `<option ${choice === selected ? "selected" : ""}>${e(choice)}</option>`).join("")}</select></label>`;

function openDialog(content) {
  dialog.innerHTML = content;
  if (!dialog.open) dialog.showModal();
}
function dialogHeading(title, subtitle) {
  return `<div class="dialog-heading"><div><span class="eyebrow">CADA DETALHE IMPORTA</span><h2 id="dialog-title">${title}</h2><p>${subtitle}</p></div><button type="button" class="icon-button" data-action="close-dialog" aria-label="Fechar janela">${icon("close")}</button></div>`;
}

function edit(collection, id) {
  const item = state[collection].find((entry) => entry.id === id);
  const record = item || {
    name: "",
    category: CATEGORIES[0],
    amount: "",
    paid: 0,
    dueDate: "",
    group: "Família",
    companions: 0,
    status: collection === "guests" ? "Pendente" : "Em pesquisa",
    contact: "",
    notes: "",
    done: false,
  };
  const names = {
    expenses: "despesa",
    guests: "convidado",
    tasks: "tarefa",
    vendors: "fornecedor",
  };
  const title = `${item ? "Editar" : collection === "expenses" || collection === "tasks" ? "Nova" : "Novo"} ${names[collection]}`;
  let fields = input(
    "name",
    collection === "guests" ? "Nome do convidado" : "Nome / descrição",
    record.name,
    'required maxlength="160" autofocus',
  );
  if (collection === "expenses")
    fields += `${select("category", "Categoria", CATEGORIES, record.category)}<div class="form-grid">${input("amount", "Valor total (R$)", record.amount, 'type="number" min="0" max="1000000000" step="0.01" required')}${input("paid", "Valor já pago (R$)", record.paid, 'type="number" min="0" max="1000000000" step="0.01" required')}</div>${input("dueDate", "Data de vencimento", record.dueDate, 'type="date" min="1900-01-01" max="2100-12-31"')}`;
  if (collection === "guests")
    fields += `<div class="form-grid">${select("group", "Grupo", GUEST_GROUPS, record.group)}${input("companions", "Acompanhantes", record.companions, 'type="number" min="0" max="20" step="1" required')}</div>${select("status", "Confirmação", GUEST_STATUSES, record.status)}<p class="field-note">O status do convite também se aplica aos acompanhantes.</p>`;
  if (collection === "tasks")
    fields += `${select("category", "Categoria", CATEGORIES, record.category)}${input("dueDate", "Fazer até", record.dueDate, 'type="date" min="1900-01-01" max="2100-12-31"')}<label class="checkbox-label"><input type="checkbox" name="done" ${record.done ? "checked" : ""} /> Tarefa concluída</label>`;
  if (collection === "vendors")
    fields += `${select("category", "Categoria", CATEGORIES, record.category)}${input("contact", "Contato", record.contact, 'maxlength="200" placeholder="Telefone, e-mail ou @instagram"')}${select("status", "Etapa da contratação", VENDOR_STATUSES, record.status)}<label>Observações<textarea name="notes" rows="3" maxlength="1000" placeholder="Ideias, referências e combinados...">${e(record.notes)}</textarea></label>`;
  openDialog(
    `${dialogHeading(title, "Mais um detalhe do nosso grande dia.")}<form id="record-form" data-collection="${collection}" data-id="${item ? e(item.id) : ""}">${fields}<p class="form-error" role="alert"></p><div class="dialog-actions"><button class="button secondary" type="button" data-action="close-dialog">Cancelar</button><button class="button primary" type="submit">${icon("check")} Salvar ${names[collection]}</button></div></form>`,
  );
}

function confirmAction(title, description, label, onConfirm) {
  openDialog(
    `${dialogHeading(title, description)}<div class="dialog-actions"><button class="button secondary" data-action="close-dialog">Cancelar</button><button class="button danger" id="confirm-action">${label}</button></div>`,
  );
  dialog.querySelector("#confirm-action").addEventListener(
    "click",
    () => {
      if (onConfirm() !== false) dialog.close();
    },
    { once: true },
  );
}

function exportBackup() {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement("a"), {
    href: url,
    download: `nosso-casamento-backup-${today()}.json`,
  });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("Backup exportado. Guarde esse arquivo com carinho.");
}

function globalSearch() {
  openDialog(
    `${dialogHeading("O que estamos procurando?", "Busque despesas, convidados, tarefas e fornecedores.")}<label class="global-search-field">${icon("search")}<input id="global-search" type="search" placeholder="Digite um nome ou detalhe..." aria-label="Buscar em todo o planejamento" autofocus /></label><div id="search-results" class="search-results"><p class="muted">Os resultados vão aparecer aqui.</p></div>`,
  );
}
function searchResults(search) {
  const names = {
    expenses: "Despesa",
    guests: "Convidado",
    tasks: "Tarefa",
    vendors: "Fornecedor",
  };
  const results = search.trim()
    ? Object.entries(names)
        .flatMap(([collection, label]) =>
          state[collection]
            .filter((item) =>
              `${item.name} ${item.category || item.group}`
                .toLocaleLowerCase("pt-BR")
                .includes(search.trim().toLocaleLowerCase("pt-BR")),
            )
            .map((item) => ({ collection, label, item })),
        )
        .slice(0, 20)
    : [];
  dialog.querySelector("#search-results").innerHTML = results.length
    ? results
        .map(
          ({ collection, label, item }) =>
            `<button class="search-result" data-edit="${collection}" data-id="${e(item.id)}"><span><small>${label}</small><strong>${e(item.name)}</strong></span>${icon("arrow")}</button>`,
        )
        .join("")
    : `<p class="muted">${search.trim() ? "Nenhum resultado encontrado. Tente outro termo." : "Os resultados vão aparecer aqui."}</p>`;
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("button, a[data-action]");
  if (!button) return;
  if (button.dataset.new) return edit(button.dataset.new);
  if (button.dataset.edit) return edit(button.dataset.edit, button.dataset.id);
  if (button.dataset.delete) {
    const collection = button.dataset.delete;
    const item = state[collection].find(
      (entry) => entry.id === button.dataset.id,
    );
    return confirmAction(
      "Excluir este detalhe?",
      `“${item.name}” será removido do planejamento.`,
      "Sim, excluir",
      () => {
        const next = structuredClone(state);
        next[collection] = next[collection].filter(
          (entry) => entry.id !== item.id,
        );
        return commit(next, "Registro excluído.");
      },
    );
  }
  if (button.dataset.toggle) {
    const id = button.dataset.toggle;
    const next = structuredClone(state);
    const task = next.tasks.find((task) => task.id === id);
    task.done = !task.done;
    commit(
      next,
      task.done ? "Mais um passo dado. Vamos celebrar! ♡" : "Tarefa reaberta.",
    );
    document
      .querySelector(`[data-toggle="${CSS.escape(id)}"]`)
      ?.focus({ preventScroll: true });
    return;
  }
  if (button.dataset.filter) {
    filter = button.dataset.filter;
    render();
    return;
  }
  const action = button.dataset.action;
  if (action === "close-dialog") dialog.close();
  if (action === "menu") {
    document.body.classList.toggle("menu-open");
    syncMenu();
  }
  if (action === "close-menu") {
    document.body.classList.remove("menu-open");
    syncMenu();
  }
  if (action === "search") globalSearch();
  if (action === "upcoming") {
    if (location.hash === "#tasks") {
      filter = "Pendentes";
      render();
    } else {
      location.hash = "tasks";
    }
  }
  if (action === "export") exportBackup();
  if (action === "import") document.querySelector("#backup-file").click();
  if (action === "edit-budget") {
    openDialog(
      `${dialogHeading("Nosso orçamento", "Quanto vamos investir nesse sonho?")}<form id="budget-form">${input("budget", "Orçamento total (R$)", state.settings.budget, 'type="number" min="0" max="1000000000" step="0.01" required autofocus')}<div class="dialog-actions"><button type="button" class="button secondary" data-action="close-dialog">Cancelar</button><button class="button primary" type="submit">Salvar orçamento</button></div></form>`,
    );
  }
  if (action === "reset")
    confirmAction(
      "Começar nossa história do zero?",
      "Os registros atuais serão removidos. Suas preferências serão mantidas. Exporte um backup antes de continuar.",
      "Começar do zero",
      () =>
        commit(
          { ...initialState(true), settings: { ...state.settings } },
          "Tudo pronto para começar o nosso planejamento.",
        ),
    );
  if (action === "demo")
    confirmAction(
      "Carregar os exemplos?",
      "Os registros atuais serão substituídos pelos dados de exemplo. Exporte um backup antes de continuar.",
      "Carregar exemplos",
      () => commit(initialState(), "Dados de exemplo carregados."),
    );
});

document.addEventListener("input", (event) => {
  if (event.target.id === "global-search") searchResults(event.target.value);
  if (event.target.id === "list-search") {
    query = event.target.value;
    const cursor = event.target.selectionStart;
    render();
    const search = document.querySelector("#list-search");
    search.focus();
    if (cursor !== null) search.setSelectionRange(cursor, cursor);
  }
});

document.addEventListener("submit", (event) => {
  if (
    !["record-form", "settings-form", "budget-form"].includes(event.target.id)
  )
    return;
  event.preventDefault();
  const form = event.target;
  const data = Object.fromEntries(new FormData(form));
  const next = structuredClone(state);
  if (form.id === "record-form") {
    const collection = form.dataset.collection;
    const record = { id: form.dataset.id || uid(), name: data.name.trim() };
    if (collection === "expenses")
      Object.assign(record, {
        category: data.category,
        amount: Number(data.amount),
        paid: Number(data.paid),
        dueDate: data.dueDate,
      });
    if (collection === "guests")
      Object.assign(record, {
        group: data.group,
        status: data.status,
        companions: Number(data.companions),
      });
    if (collection === "tasks")
      Object.assign(record, {
        category: data.category,
        dueDate: data.dueDate,
        done: data.done === "on",
      });
    if (collection === "vendors")
      Object.assign(record, {
        category: data.category,
        contact: data.contact.trim(),
        status: data.status,
        notes: data.notes.trim(),
      });
    const index = next[collection].findIndex((item) => item.id === record.id);
    if (index >= 0) next[collection][index] = record;
    else next[collection].push(record);
    try {
      validateState(next);
    } catch (error) {
      form.querySelector(".form-error").textContent = error.message;
      return;
    }
    if (commit(next, "Detalhe salvo com carinho.")) dialog.close();
  }
  if (form.id === "settings-form") {
    Object.assign(next.settings, {
      couple: data.couple.trim(),
      budget: Number(data.budget),
      guestTarget: Number(data.guestTarget),
      location: data.location.trim(),
    });
    commit(next, "Preferências salvas. Agora está com a nossa cara!");
  }
  if (form.id === "budget-form") {
    next.settings.budget = Number(data.budget);
    if (commit(next, "Orçamento atualizado.")) dialog.close();
  }
});

document.addEventListener("change", async (event) => {
  if (event.target.id !== "backup-file") return;
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  try {
    if (file.size > 5 * 1024 * 1024)
      throw new Error("O backup deve ter no máximo 5 MB.");
    const imported = validateState(JSON.parse(await file.text()));
    confirmAction(
      "Importar este planejamento?",
      `O arquivo contém ${imported.expenses.length} despesas, ${imported.guests.length} convites, ${imported.tasks.length} tarefas e ${imported.vendors.length} fornecedores. Ele substituirá os dados atuais.`,
      "Importar backup",
      () => commit(imported, "Backup importado. Tudo no seu lugar!"),
    );
  } catch (error) {
    toast(
      error instanceof SyntaxError
        ? "Esse arquivo não é um JSON válido."
        : error.message,
      true,
    );
  }
});

dialog.addEventListener("click", (event) => {
  if (event.target === dialog) {
    const rect = dialog.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      dialog.close();
  }
});
document.addEventListener("keydown", (event) => {
  if (
    event.key === "/" &&
    !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName) &&
    !dialog.open
  ) {
    event.preventDefault();
    globalSearch();
  }
  if (event.key === "Escape") {
    document.body.classList.remove("menu-open");
    syncMenu();
  }
});
window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY || !event.newValue) return;
  try {
    state = validateState(JSON.parse(event.newValue));
    render();
    toast("Planejamento atualizado por outra aba.");
  } catch {
    toast(
      "Outra aba salvou dados incompatíveis. Recarregue ou importe um backup.",
      true,
    );
  }
});

render();
setInterval(updateCountdown, 1000);
