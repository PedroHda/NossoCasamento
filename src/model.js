export const STORAGE_KEY = "nosso-casamento:v1";
export const WEDDING_DATE = "2027-07-24";
export const WEDDING_TIME = "2027-07-24T00:00:00-03:00";
export const CATEGORIES = [
  "Espaço e buffet",
  "Decoração",
  "Foto e vídeo",
  "Música",
  "Trajes e beleza",
  "Papelaria",
  "Outros",
];
export const GUEST_GROUPS = ["Família", "Amigos", "Trabalho", "Outros"];
export const GUEST_STATUSES = ["Confirmado", "Pendente", "Não vai"];
export const VENDOR_STATUSES = ["Em pesquisa", "Em negociação", "Contratado"];

export function initialState(empty = false) {
  return {
    version: 1,
    demo: !empty,
    settings: {
      couple: "",
      budget: 45000,
      guestTarget: 120,
      location: "",
      weddingDate: WEDDING_DATE,
    },
    expenses: empty
      ? []
      : [
          {
            id: "e1",
            name: "Espaço da cerimônia e festa",
            category: "Espaço e buffet",
            amount: 12000,
            paid: 6000,
            dueDate: "2027-02-15",
          },
          {
            id: "e2",
            name: "Buffet e bebidas",
            category: "Espaço e buffet",
            amount: 9800,
            paid: 2900,
            dueDate: "2027-06-24",
          },
          {
            id: "e3",
            name: "Flores e decoração",
            category: "Decoração",
            amount: 4500,
            paid: 1500,
            dueDate: "2027-05-20",
          },
          {
            id: "e4",
            name: "Fotografia e filme",
            category: "Foto e vídeo",
            amount: 4200,
            paid: 2100,
            dueDate: "2027-04-10",
          },
          {
            id: "e5",
            name: "DJ e sonorização",
            category: "Música",
            amount: 2500,
            paid: 1000,
            dueDate: "2027-07-10",
          },
          {
            id: "e6",
            name: "Vestido, traje e ajustes",
            category: "Trajes e beleza",
            amount: 2800,
            paid: 1400,
            dueDate: "2027-03-15",
          },
          {
            id: "e7",
            name: "Convites e papelaria",
            category: "Papelaria",
            amount: 950,
            paid: 0,
            dueDate: "2027-02-05",
          },
        ],
    guests: empty
      ? []
      : [
          {
            id: "g1",
            name: "Ana Oliveira",
            group: "Família",
            status: "Confirmado",
            companions: 1,
          },
          {
            id: "g2",
            name: "Carlos Oliveira",
            group: "Família",
            status: "Confirmado",
            companions: 0,
          },
          {
            id: "g3",
            name: "Mariana Santos",
            group: "Amigos",
            status: "Confirmado",
            companions: 1,
          },
          {
            id: "g4",
            name: "Lucas Pereira",
            group: "Amigos",
            status: "Pendente",
            companions: 1,
          },
          {
            id: "g5",
            name: "Beatriz Costa",
            group: "Família",
            status: "Confirmado",
            companions: 0,
          },
          {
            id: "g6",
            name: "Rafael Almeida",
            group: "Trabalho",
            status: "Pendente",
            companions: 1,
          },
          {
            id: "g7",
            name: "Julia Ferreira",
            group: "Amigos",
            status: "Pendente",
            companions: 0,
          },
          {
            id: "g8",
            name: "Pedro Souza",
            group: "Família",
            status: "Confirmado",
            companions: 1,
          },
          {
            id: "g9",
            name: "Fernanda Lima",
            group: "Trabalho",
            status: "Pendente",
            companions: 0,
          },
          {
            id: "g10",
            name: "Gabriel Ribeiro",
            group: "Amigos",
            status: "Não vai",
            companions: 0,
          },
          {
            id: "g11",
            name: "Helena Martins",
            group: "Família",
            status: "Confirmado",
            companions: 1,
          },
          {
            id: "g12",
            name: "Bruno Rocha",
            group: "Amigos",
            status: "Pendente",
            companions: 1,
          },
        ],
    tasks: empty
      ? []
      : [
          {
            id: "t1",
            name: "Visitar os espaços favoritos",
            category: "Espaço e buffet",
            dueDate: "2026-11-07",
            done: false,
          },
          {
            id: "t2",
            name: "Montar a primeira lista de convidados",
            category: "Outros",
            dueDate: "2026-11-14",
            done: false,
          },
          {
            id: "t3",
            name: "Escolher a identidade dos convites",
            category: "Papelaria",
            dueDate: "2026-12-01",
            done: false,
          },
          {
            id: "t4",
            name: "Agendar a degustação do buffet",
            category: "Espaço e buffet",
            dueDate: "2026-12-12",
            done: false,
          },
          {
            id: "t5",
            name: "Definir a data do nosso sim",
            category: "Outros",
            dueDate: "2026-10-10",
            done: true,
          },
          {
            id: "t6",
            name: "Definir o orçamento do casamento",
            category: "Outros",
            dueDate: "2026-10-15",
            done: true,
          },
          {
            id: "t7",
            name: "Salvar nossas primeiras inspirações",
            category: "Decoração",
            dueDate: "2026-10-20",
            done: true,
          },
          {
            id: "t8",
            name: "Pesquisar fotógrafos e videomakers",
            category: "Foto e vídeo",
            dueDate: "2027-01-09",
            done: false,
          },
        ],
    vendors: empty
      ? []
      : [
          {
            id: "v1",
            name: "Jardim do Sim",
            category: "Espaço e buffet",
            contact: "",
            status: "Contratado",
            notes: "Exemplo de espaço para cerimônia e recepção.",
          },
          {
            id: "v2",
            name: "Ateliê Botânico",
            category: "Decoração",
            contact: "",
            status: "Em negociação",
            notes: "Referências em laranja, azul e verde.",
          },
          {
            id: "v3",
            name: "Luz & Afeto",
            category: "Foto e vídeo",
            contact: "",
            status: "Contratado",
            notes: "Cobertura da cerimônia e festa.",
          },
          {
            id: "v4",
            name: "Mesa & Memória",
            category: "Espaço e buffet",
            contact: "",
            status: "Em pesquisa",
            notes: "Agendar uma degustação.",
          },
        ],
  };
}

export function countdown(now = Date.now()) {
  const remaining = Math.max(0, new Date(WEDDING_TIME).getTime() - Number(now));
  const seconds = Math.floor(remaining / 1000);
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor(seconds / 3600) % 24,
    minutes: Math.floor(seconds / 60) % 60,
    seconds: seconds % 60,
    arrived: remaining === 0,
  };
}

export function totals(state) {
  const contractedCents = state.expenses.reduce(
    (sum, item) => sum + Math.round(item.amount * 100),
    0,
  );
  const paidCents = state.expenses.reduce(
    (sum, item) => sum + Math.round(item.paid * 100),
    0,
  );
  const contracted = contractedCents / 100;
  const paid = paidCents / 100;
  const invited = state.guests.reduce(
    (sum, guest) => sum + 1 + guest.companions,
    0,
  );
  const confirmed = state.guests
    .filter((guest) => guest.status === "Confirmado")
    .reduce((sum, guest) => sum + 1 + guest.companions, 0);
  const completed = state.tasks.filter((task) => task.done).length;
  return {
    contracted,
    paid,
    remaining: (contractedCents - paidCents) / 100,
    available:
      (Math.round(state.settings.budget * 100) - contractedCents) / 100,
    invited,
    confirmed,
    completed,
    progress: state.tasks.length
      ? Math.round((completed / state.tasks.length) * 100)
      : 0,
    budgetPercent: state.settings.budget
      ? Math.round((contracted / state.settings.budget) * 100)
      : contracted
        ? 100
        : 0,
  };
}

export function expenseStatus(expense) {
  return expense.paid >= expense.amount
    ? "Pago"
    : expense.paid > 0
      ? "Parcial"
      : "Pendente";
}

export const money = (value) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(value);
export const shortMoney = (value) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
export const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
export const formatDate = (
  value,
  options = { day: "2-digit", month: "short" },
) =>
  value
    ? new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        ...options,
      })
        .format(new Date(`${value}T12:00:00-03:00`))
        .replace(".", "")
    : "Sem data";
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const uid = () => globalThis.crypto.randomUUID();

function requireText(value, label, max = 160, optional = false) {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (!optional && !value.trim())
  )
    throw new Error(`${label} inválido.`);
  return value.trim();
}
function requireNumber(value, label, max = 1e9, integer = false) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > max ||
    (integer && !Number.isInteger(value))
  )
    throw new Error(`${label} inválido.`);
  return value;
}
function requireDate(value) {
  if (value === "") return "";
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value < "1900-01-01" ||
    value > "2100-12-31"
  )
    throw new Error("Data inválida.");
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value)
    throw new Error("Data inválida.");
  return value;
}
function requireChoice(value, list) {
  if (!list.includes(value)) throw new Error("Opção inválida.");
  return value;
}

// Rebuild imported data field by field: no untrusted HTML or extra properties reach the app.
export function validateState(input) {
  if (
    !input ||
    input.version !== 1 ||
    !input.settings ||
    typeof input.demo !== "boolean"
  )
    throw new Error(
      "Backup incompatível. Use um arquivo exportado pelo Nosso Casamento.",
    );
  const output = {
    version: 1,
    demo: input.demo,
    settings: {
      couple: requireText(input.settings.couple, "Nome do casal", 80, true),
      budget: requireNumber(input.settings.budget, "Orçamento"),
      guestTarget: requireNumber(
        input.settings.guestTarget,
        "Meta de convidados",
        100000,
        true,
      ),
      location: requireText(input.settings.location, "Local", 200, true),
      weddingDate: WEDDING_DATE,
    },
  };
  const ids = new Set();
  for (const collection of ["expenses", "guests", "tasks", "vendors"]) {
    if (!Array.isArray(input[collection]) || input[collection].length > 10000)
      throw new Error("Lista inválida ou muito grande.");
    output[collection] = input[collection].map((item) => {
      if (!item || typeof item !== "object")
        throw new Error("Registro inválido.");
      const id = requireText(item.id, "Identificador", 100);
      if (ids.has(id))
        throw new Error("O backup contém identificadores repetidos.");
      ids.add(id);
      const base = { id, name: requireText(item.name, "Nome") };
      if (collection === "expenses") {
        const amount = requireNumber(item.amount, "Valor");
        const paid = requireNumber(item.paid, "Valor pago");
        if (paid > amount)
          throw new Error("O valor pago não pode ultrapassar o total.");
        return {
          ...base,
          category: requireChoice(item.category, CATEGORIES),
          amount,
          paid,
          dueDate: requireDate(item.dueDate),
        };
      }
      if (collection === "guests")
        return {
          ...base,
          group: requireChoice(item.group, GUEST_GROUPS),
          status: requireChoice(item.status, GUEST_STATUSES),
          companions: requireNumber(item.companions, "Acompanhantes", 20, true),
        };
      if (collection === "tasks") {
        if (typeof item.done !== "boolean")
          throw new Error("Estado da tarefa inválido.");
        return {
          ...base,
          category: requireChoice(item.category, CATEGORIES),
          dueDate: requireDate(item.dueDate),
          done: item.done,
        };
      }
      return {
        ...base,
        category: requireChoice(item.category, CATEGORIES),
        contact: requireText(item.contact, "Contato", 200, true),
        status: requireChoice(item.status, VENDOR_STATUSES),
        notes: requireText(item.notes, "Observações", 1000, true),
      };
    });
  }
  return output;
}
