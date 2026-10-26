import { useRef, useState, type FormEvent } from "react";
import { usePlanning } from "../app/context.tsx";
import { settingsSchema, errorMessage, type Plan } from "../domain/schema.ts";
import { createPlan, parsePlan } from "../domain/migration.ts";
import {
  restoreFromTrash,
  emptyTrash,
  reminderItems,
  money,
  formatDate,
  today,
} from "../domain/planning.ts";
import { enableReminders } from "../services/reminders.ts";
import { isNative, saveText } from "../services/files.ts";
import { exportPdf, exportCsv, exportCalendar } from "../services/exports.ts";
import {
  PageHeading,
  CardHeading,
  Icon,
  Badge,
  EmptyState,
  ActionButton,
  Confirm,
  stringField,
  numberField,
} from "../components/ui.tsx";

export function Reminders() {
  const { plan, update, notificationCount } = usePlanning();
  const [filter, setFilter] = useState("Todos");
  const rows = reminderItems(plan).filter(
    (item) => filter === "Todos" || item.kind === filter,
  );
  return (
    <>
      <PageHeading
        title="Um cuidado para lembrar de tudo."
        subtitle="Parcelas, tarefas e momentos do nosso dia, reunidos em uma agenda."
      >
        <ActionButton action={() => exportCalendar(plan)}>
          <Icon name="calendar" /> Exportar agenda
        </ActionButton>
      </PageHeading>
      <section className="reminder-preferences card">
        <span className="stat-icon orange">
          <Icon name="bell" />
        </span>
        <div>
          <h2>
            {isNative()
              ? "Lembretes neste aparelho"
              : "Nossos lembretes no navegador"}
          </h2>
          <p>
            {isNative()
              ? `Antecedência: ${plan.settings.reminderDays} dia(s). ${notificationCount} aviso(s) futuro(s) agendado(s). O horário pode variar conforme as configurações do Android.`
              : "Acompanhe os prazos aqui ou leve a agenda para o calendário do celular. As notificações locais podem ser ativadas no APK."}
          </p>
        </div>
        {isNative() && (
          <ActionButton
            className="button primary"
            action={async () => {
              if (!plan.settings.remindersEnabled) await enableReminders();
              await update(
                (current) => ({
                  ...current,
                  settings: {
                    ...current.settings,
                    remindersEnabled: !current.settings.remindersEnabled,
                  },
                }),
                plan.settings.remindersEnabled
                  ? "Lembretes desativados."
                  : "Preferência salva. Preparando os avisos do aparelho.",
              );
            }}
          >
            {plan.settings.remindersEnabled ? "Desativar" : "Ativar lembretes"}
          </ActionButton>
        )}
      </section>
      <section className="card">
        <CardHeading
          title="O que vem pela frente"
          subtitle="Prazos vencidos permanecem visíveis até o pagamento ou a conclusão da tarefa."
        />
        <div className="list-toolbar">
          <div className="filter-tabs">
            {["Todos", "Tarefa", "Pagamento", "Cronograma"].map((item) => (
              <button
                className={`filter-tab ${filter === item ? "selected" : ""}`}
                aria-pressed={filter === item}
                key={item}
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="reminder-list">
          {rows.map((item) => (
            <a
              className="reminder-row"
              key={item.id}
              href={
                item.kind === "Pagamento"
                  ? "#budget"
                  : item.kind === "Tarefa"
                    ? "#tasks"
                    : "#timeline"
              }
            >
              <span
                className={`category-symbol ${item.kind === "Pagamento" ? "orange" : "blue"}`}
              >
                <Icon name={item.kind === "Pagamento" ? "coins" : "calendar"} />
              </span>
              <div>
                <strong>{item.name}</strong>
                <small>
                  {formatDate(item.date, true)} · {item.time} · {item.kind}
                </small>
              </div>
              {item.amount !== undefined && (
                <strong>{money(item.amount)}</strong>
              )}
              <Badge
                color={
                  item.date < today()
                    ? "orange"
                    : item.date === today()
                      ? "green"
                      : "blue"
                }
              >
                {item.date < today()
                  ? "Prazo passado"
                  : item.date === today()
                    ? "Hoje"
                    : "Em breve"}
              </Badge>
              <Icon name="arrow" />
            </a>
          ))}
          {!rows.length && (
            <EmptyState
              title="Tudo tranquilo por aqui"
              description="Seus próximos prazos aparecem quando você cadastra tarefas, parcelas ou momentos."
              symbol="bell"
            />
          )}
        </div>
      </section>
    </>
  );
}

export function Settings() {
  const { plan, update, replace, notify } = usePlanning();
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<
    null | "reset" | "demo" | "trash" | Plan
  >(null);
  const input = useRef<HTMLInputElement>(null);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError("");
    try {
      const settings = settingsSchema.parse({
        ...plan.settings,
        couple: stringField(data, "couple"),
        budget: numberField(data, "budget"),
        guestTarget: numberField(data, "guestTarget"),
        location: stringField(data, "location"),
        weddingDate: stringField(data, "weddingDate"),
        weddingTime: stringField(data, "weddingTime"),
        reminderDays: numberField(data, "reminderDays"),
        publicUrl: stringField(data, "publicUrl"),
      });
      await update(
        (current) => ({ ...current, settings }),
        "Preferências salvas. Agora está com a nossa cara!",
      );
    } catch (error) {
      setError(errorMessage(error));
    }
  }
  return (
    <>
      <PageHeading
        title="Do nosso jeitinho."
        subtitle="A data, os cuidados e os planos que tornam esse dia só nosso."
      />
      <div className="settings-grid">
        <section className="card settings-card">
          <CardHeading
            title="O nosso casamento"
            subtitle="Um plano que começa com vocês."
          >
            <span className="stat-icon orange">
              <Icon name="heart" />
            </span>
          </CardHeading>
          <form key={JSON.stringify(plan.settings)} onSubmit={save}>
            <label>
              Nome do casal
              <input
                name="couple"
                maxLength={80}
                placeholder="Ex.: Maria & João"
                defaultValue={plan.settings.couple}
              />
            </label>
            <div className="form-grid">
              <label>
                Data do casamento
                <input
                  name="weddingDate"
                  type="date"
                  min="1900-01-01"
                  max="2100-12-31"
                  defaultValue={plan.settings.weddingDate}
                  required
                />
              </label>
              <label>
                Horário de Brasília
                <input
                  name="weddingTime"
                  type="time"
                  defaultValue={plan.settings.weddingTime}
                  required
                />
              </label>
            </div>
            <p className="field-note">
              A contagem usa essa data e esse horário (UTC−3). Os momentos do
              cronograma mantêm seus próprios horários.
            </p>
            <div className="form-grid">
              <label>
                Orçamento total (R$)
                <input
                  name="budget"
                  type="number"
                  min="0"
                  max="1000000000"
                  step="0.01"
                  defaultValue={plan.settings.budget}
                  required
                />
              </label>
              <label>
                Meta de convidados
                <input
                  name="guestTarget"
                  type="number"
                  min="0"
                  max="100000"
                  step="1"
                  defaultValue={plan.settings.guestTarget}
                  required
                />
              </label>
            </div>
            <label>
              Local do casamento
              <input
                name="location"
                maxLength={200}
                defaultValue={plan.settings.location}
                placeholder="Ainda estamos escolhendo…"
              />
            </label>
            <label>
              Lembrar com quantos dias de antecedência?
              <input
                name="reminderDays"
                type="number"
                min="0"
                max="30"
                step="1"
                defaultValue={plan.settings.reminderDays}
                required
              />
              <small>
                Os avisos são ativados na página Lembretes do APK. O valor zero
                avisa no dia do compromisso.
              </small>
            </label>
            <label>
              Endereço público do site para convites
              <input
                name="publicUrl"
                type="url"
                maxLength={500}
                defaultValue={plan.settings.publicUrl}
                placeholder="https://seu-site.com"
              />
              <small>
                Opcional. Necessário para enviar links que abram em outros
                celulares; um endereço localhost não é público.
              </small>
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary" type="submit">
              <Icon name="check" /> Salvar preferências
            </button>
          </form>
        </section>
        <div className="settings-right">
          <section className="card settings-card">
            <CardHeading
              title="Nossos planos, bem guardados."
              subtitle="Uma cópia para preservar o que já construímos."
            />
            <p className="settings-description">
              Os dados ficam neste aparelho, incluindo comprovantes e lixeira.
              Exporte um backup antes de trocar de aparelho ou substituir o
              planejamento. A importação substitui todos os dados atuais.
            </p>
            <div className="backup-actions">
              <ActionButton
                action={() =>
                  saveText(
                    `nosso-casamento-backup-${today()}.json`,
                    JSON.stringify(plan, null, 2),
                  )
                }
              >
                <Icon name="download" /> Exportar backup
              </ActionButton>
              <button
                className="button secondary"
                onClick={() => input.current?.click()}
              >
                <Icon name="upload" /> Importar backup
              </button>
            </div>
            <input
              type="file"
              accept="application/json,.json"
              hidden
              ref={input}
              onChange={async (event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (!file) return;
                try {
                  if (file.size > 6 * 1024 * 1024)
                    throw new Error("Use um backup de até 6 MB.");
                  setConfirmation(parsePlan(JSON.parse(await file.text())));
                } catch (error) {
                  notify(errorMessage(error), true);
                }
              }}
            />
          </section>
          <section className="card settings-card">
            <CardHeading
              title="Levar nossos planos com a gente"
              subtitle="Relatórios e listas para compartilhar quando precisar."
            />
            <div className="export-grid">
              <ActionButton action={() => exportPdf(plan)}>
                <Icon name="download" /> Relatório PDF
              </ActionButton>
              <ActionButton action={() => exportCsv(plan, "budget")}>
                <Icon name="wallet" /> Orçamento CSV
              </ActionButton>
              <ActionButton action={() => exportCsv(plan, "guests")}>
                <Icon name="users" /> Convidados CSV
              </ActionButton>
              <ActionButton action={() => exportCalendar(plan)}>
                <Icon name="calendar" /> Agenda do celular
              </ActionButton>
            </div>
            <p className="field-note">
              Os arquivos CSV abrem no Excel. O relatório não inclui os
              comprovantes; eles ficam no backup JSON.
            </p>
          </section>
          <section className="card settings-card demo-card">
            <CardHeading
              title={
                plan.demo ? "Vamos escrever nossa história?" : "Um novo começo"
              }
              subtitle={
                plan.demo
                  ? "Você está explorando dados de exemplo."
                  : "Recomece quando precisar."
              }
            />
            <p className="settings-description">
              Começar do zero remove os cadastros e a lixeira, mantendo as
              preferências. Exporte um backup antes de continuar.
            </p>
            <button
              className="button secondary"
              onClick={() => setConfirmation("reset")}
            >
              <Icon name="reset" /> Começar do zero
            </button>
            {!plan.demo && (
              <button
                className="text-link restore-demo"
                onClick={() => setConfirmation("demo")}
              >
                Carregar dados de exemplo
              </button>
            )}
          </section>
          <div className="privacy-note">
            <Icon name="info" />
            <p>
              Modo local: seus dados permanecem neste aparelho. Login
              compartilhado e sincronização entre celulares ainda não estão
              ativos.
            </p>
          </div>
        </div>
      </div>
      <section className="card trash-card">
        <CardHeading
          title="Um lugar para recuperar detalhes"
          subtitle="Exclusões vão para a lixeira e continuam no backup até você esvaziá-la."
        >
          {plan.trash.length > 0 && (
            <button
              className="button secondary"
              onClick={() => setConfirmation("trash")}
            >
              <Icon name="trash" /> Esvaziar lixeira
            </button>
          )}
        </CardHeading>
        <div className="trash-list">
          {[...plan.trash].reverse().map((item) => (
            <div className="trash-row" key={item.id}>
              <span className="category-symbol green">
                <Icon name="reset" />
              </span>
              <div>
                <strong>{item.record.name}</strong>
                <small>
                  {
                    {
                      expenses: "Despesa",
                      guests: "Convidado",
                      tasks: "Tarefa",
                      vendors: "Fornecedor",
                      timeline: "Cronograma",
                    }[item.collection]
                  }{" "}
                  · removido em{" "}
                  {new Intl.DateTimeFormat("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    timeZone: "America/Sao_Paulo",
                  }).format(new Date(item.deletedAt))}
                </small>
              </div>
              <ActionButton
                action={() =>
                  update(
                    (current) => restoreFromTrash(current, item.id),
                    "Detalhe restaurado.",
                  )
                }
              >
                <Icon name="reset" /> Restaurar
              </ActionButton>
            </div>
          ))}
          {!plan.trash.length && (
            <EmptyState
              title="Nenhum detalhe perdido"
              description="Os registros excluídos aparecerão aqui para você recuperar."
              symbol="reset"
            />
          )}
        </div>
      </section>
      {confirmation && (
        <Confirm
          title={
            typeof confirmation === "object"
              ? "Importar este planejamento?"
              : confirmation === "trash"
                ? "Esvaziar a lixeira?"
                : confirmation === "demo"
                  ? "Carregar os exemplos?"
                  : "Começar do zero?"
          }
          description={
            typeof confirmation === "object"
              ? `O backup contém ${confirmation.expenses.length} despesas, ${confirmation.guests.length} convites, ${confirmation.tasks.length} tarefas e ${confirmation.timeline.length} momentos. Ele substituirá os dados atuais. Exporte uma cópia antes de continuar.`
              : confirmation === "trash"
                ? "Os registros da lixeira e seus comprovantes serão removidos definitivamente. Fornecedores apagados serão desvinculados das despesas ativas."
                : "Os cadastros atuais serão substituídos. Exporte um backup antes de continuar."
          }
          label={
            typeof confirmation === "object"
              ? "Importar backup"
              : confirmation === "trash"
                ? "Esvaziar definitivamente"
                : "Confirmar substituição"
          }
          onClose={() => setConfirmation(null)}
          onConfirm={async () => {
            if (typeof confirmation === "object")
              await replace(
                confirmation,
                "Backup importado. Tudo no seu lugar!",
              );
            else if (confirmation === "trash")
              await update(
                (current) => emptyTrash(current),
                "Lixeira esvaziada.",
                false,
              );
            else if (confirmation === "reset")
              await update(
                (current) => ({
                  ...createPlan(true),
                  id: current.id,
                  revision: current.revision,
                  settings: current.settings,
                }),
                "Tudo pronto para escrever nossa história.",
                false,
              );
            else
              await update(
                (current) => ({
                  ...createPlan(),
                  id: current.id,
                  revision: current.revision,
                }),
                "Dados de exemplo carregados.",
                false,
              );
          }}
        />
      )}
    </>
  );
}
