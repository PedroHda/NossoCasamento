import type { Plan } from "../domain/schema.ts";
import {
  totals,
  paidAmount,
  remainingAmount,
  expenseStatus,
  money,
  formatDate,
  vendorName,
  reminderItems,
  today,
} from "../domain/planning.ts";
import { saveText, saveBinary } from "./files.ts";

export function csvCell(value: string | number) {
  if (typeof value === "number") return String(value).replace(".", ",");
  const safe = /^\s*[=+@\-\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function createCsv(plan: Plan, kind: "guests" | "budget") {
  const rows: (string | number)[][] =
    kind === "guests"
      ? [
          [
            "Convidado",
            "Grupo",
            "Limite de acompanhantes",
            "Acompanhantes confirmados",
            "Confirmação",
            "Contato",
            "Restrições alimentares",
            "Observações",
          ],
          ...plan.guests.map((guest) => [
            guest.name,
            guest.group,
            guest.companions,
            guest.status === "Confirmado"
              ? (guest.confirmedCompanions ?? guest.companions)
              : "",
            guest.status,
            guest.phone,
            guest.dietary,
            guest.notes,
          ]),
        ]
      : [
          [
            "Despesa",
            "Categoria",
            "Fornecedor",
            "Estimado (R$)",
            "Contratado (R$)",
            "Pago (R$)",
            "Saldo (R$)",
            "Vencimento",
            "Status",
          ],
          ...plan.expenses.map((item) => [
            item.name,
            item.category,
            vendorName(plan, item.vendorId),
            item.estimatedAmount,
            item.amount,
            paidAmount(item),
            remainingAmount(item),
            item.dueDate,
            expenseStatus(item),
          ]),
        ];
  return "\ufeff" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n");
}
export async function exportCsv(plan: Plan, kind: "guests" | "budget") {
  await saveText(
    `nosso-casamento-${kind === "guests" ? "convidados" : "orcamento"}-${today()}.csv`,
    createCsv(plan, kind),
    "text/csv;charset=utf-8",
  );
}
const icsEscape = (text: string) =>
  text
    .replaceAll("\\", "\\\\")
    .replaceAll("\r", "")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
const icsDate = (date: string, time: string) =>
  new Date(`${date}T${time}:00-03:00`)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(".000", "");
export function createCalendar(plan: Plan) {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(".000", "");
  const events = [
    {
      id: plan.id,
      name: `Casamento${plan.settings.couple ? ` de ${plan.settings.couple}` : ""}`,
      date: plan.settings.weddingDate,
      time: plan.settings.weddingTime,
      kind: "O grande dia",
      amount: undefined,
    },
    ...reminderItems(plan),
  ];
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Nosso Casamento//Planejamento//PT-BR",
    "CALSCALE:GREGORIAN",
  ];
  for (const item of events)
    lines.push(
      "BEGIN:VEVENT",
      `UID:${item.id}@nosso-casamento.local`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsDate(item.date, item.time)}`,
      `SUMMARY:${icsEscape(item.name)}`,
      `DESCRIPTION:${icsEscape(`${item.kind}${item.amount !== undefined ? ` · ${money(item.amount)}` : ""}`)}`,
      "END:VEVENT",
    );
  lines.push("END:VCALENDAR");
  // RFC 5545 line folding uses UTF-8 octets; stay below 75 with code point boundaries.
  return (
    lines
      .map((line) => {
        let current = "";
        let bytes = 0;
        const folded: string[] = [];
        for (const char of line) {
          const size = new TextEncoder().encode(char).length;
          if (bytes + size > 72) {
            folded.push(current);
            current = " ";
            bytes = 1;
          }
          current += char;
          bytes += size;
        }
        folded.push(current);
        return folded.join("\r\n");
      })
      .join("\r\n") + "\r\n"
  );
}
export async function exportCalendar(plan: Plan) {
  await saveText(
    "nosso-casamento-agenda.ics",
    createCalendar(plan),
    "text/calendar;charset=utf-8",
  );
}
export async function exportPdf(plan: Plan) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const pdf = new jsPDF();
  const t = totals(plan);
  pdf.setFillColor("#193e33");
  pdf.rect(0, 0, 210, 39, "F");
  pdf.setTextColor("#ffffff");
  pdf.setFontSize(23);
  pdf.text("Nosso Casamento", 15, 19);
  pdf.setFontSize(10);
  pdf.text(
    `${formatDate(plan.settings.weddingDate, true)} · ${plan.settings.weddingTime} · horário de Brasília`,
    15,
    29,
  );
  let y = 51;
  const table = (
    title: string,
    head: string[],
    rows: (string | number)[][],
  ) => {
    if (y > 235) {
      pdf.addPage();
      y = 20;
    }
    pdf.setFontSize(14);
    pdf.setTextColor("#244e40");
    pdf.text(title, 15, y);
    autoTable(pdf, {
      startY: y + 6,
      head: [head],
      body: rows,
      styles: { fontSize: 8, cellPadding: 3, overflow: "linebreak" },
      headStyles: { fillColor: "#244e40" },
      alternateRowStyles: { fillColor: "#f2f5ef" },
      margin: { left: 15, right: 15 },
    });
    y =
      (pdf as typeof pdf & { lastAutoTable: { finalY: number } }).lastAutoTable
        .finalY + 16;
  };
  table(
    plan.settings.couple || "Resumo do planejamento",
    ["Orçamento", "Contratado", "Pago", "Falta pagar"],
    [
      [
        money(plan.settings.budget),
        money(t.contracted),
        money(t.paid),
        money(t.remaining),
      ],
    ],
  );
  table(
    "Orçamento e fornecedores",
    ["Despesa", "Fornecedor", "Contratado", "Pago", "Saldo"],
    plan.expenses.map((item) => [
      item.name,
      vendorName(plan, item.vendorId) || "—",
      money(item.amount),
      money(paidAmount(item)),
      money(remainingAmount(item)),
    ]),
  );
  table(
    "Histórico de pagamentos",
    ["Despesa", "Data", "Valor", "Observação"],
    plan.expenses.flatMap((item) =>
      item.payments.map((payment) => [
        item.name,
        payment.date ? formatDate(payment.date, true) : "Não informada",
        money(payment.amount),
        payment.note,
      ]),
    ),
  );
  table(
    "Convidados",
    ["Nome", "Grupo", "Limite / confirmados", "Confirmação", "Restrições"],
    plan.guests.map((guest) => [
      guest.name,
      guest.group,
      `${guest.companions} / ${guest.status === "Confirmado" ? (guest.confirmedCompanions ?? guest.companions) : "-"}`,
      guest.status,
      guest.dietary,
    ]),
  );
  table(
    "Checklist",
    ["Tarefa", "Responsável", "Prazo", "Estado"],
    plan.tasks.map((task) => [
      task.name,
      task.owner,
      formatDate(task.dueDate, true),
      task.done ? "Concluída" : "Pendente",
    ]),
  );
  table(
    "Cronograma",
    ["Momento", "Data", "Horário", "Local"],
    [...plan.timeline]
      .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
      .map((item) => [
        item.name,
        formatDate(item.date, true),
        item.time,
        item.location,
      ]),
  );
  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    pdf.setPage(page);
    pdf.setFontSize(8);
    pdf.setTextColor("#7a8673");
    pdf.text(`Nosso Casamento · ${page} / ${pages}`, 15, 288);
  }
  await saveBinary(
    `nosso-casamento-relatorio-${today()}.pdf`,
    pdf.output("arraybuffer"),
    "application/pdf",
  );
}
