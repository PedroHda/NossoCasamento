import { useState } from "react";
import { usePlanning } from "../app/context.tsx";
import { errorMessage } from "../domain/schema.ts";
import {
  listDeviceCalendars,
  connectDeviceCalendar,
  disconnectCalendar,
  type DeviceCalendar,
} from "../services/calendar.ts";
import { isNative } from "../services/files.ts";
import { Icon, Confirm } from "./ui.tsx";
export function CalendarConnection() {
  const { plan, update, notify } = usePlanning();
  const [calendars, setCalendars] = useState<DeviceCalendar[] | null>(null),
    [selected, setSelected] = useState(""),
    [busy, setBusy] = useState(false),
    [disconnect, setDisconnect] = useState(false);
  return (
    <section className="card calendar-connection">
      <span className="stat-icon blue">
        <Icon name="calendar" />
      </span>
      <div>
        <h2>
          {plan.settings.calendarSyncEnabled
            ? "Conexão com a agenda ativada"
            : "Conecte a sua agenda"}
        </h2>
        <p>
          {isNative()
            ? "Escolha um calendário do aparelho. Depois de autorizar, eventos, tarefas, pagamentos pendentes e entregas da casa são incluídos e atualizados automaticamente, com lembretes."
            : "No navegador, baixe a agenda .ics ou prepare um evento no Google Agenda. Para conexão automática com o calendário do aparelho, use o APK Android."}
        </p>
        {plan.settings.calendarSyncEnabled && (
          <small>
            Até 250 próximos eventos e recentes. Alterações nas cópias devem ser
            feitas pelo app; os outros eventos do seu calendário são
            preservados.
          </small>
        )}
      </div>
      {isNative() && plan.settings.calendarSyncEnabled && (
        <button
          className="button secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const list = await listDeviceCalendars();
              if (!list.length)
                throw new Error("Nenhuma agenda editável encontrada.");
              setCalendars(list);
              setSelected(
                list.some((c) => c.id === plan.settings.calendarId)
                  ? plan.settings.calendarId
                  : list[0].id,
              );
            } catch (e) {
              notify(errorMessage(e), true);
            } finally {
              setBusy(false);
            }
          }}
        >
          Escolher / reautorizar agenda
        </button>
      )}
      {isNative() &&
        (plan.settings.calendarSyncEnabled ? (
          <button
            className="button secondary"
            onClick={() => setDisconnect(true)}
          >
            Desconectar agenda
          </button>
        ) : (
          <button
            className="button primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const list = await listDeviceCalendars();
                if (!list.length)
                  throw new Error(
                    "Nenhum calendário editável encontrado. Configure uma agenda no celular e tente novamente.",
                  );
                setCalendars(list);
                setSelected(list[0].id);
              } catch (e) {
                notify(errorMessage(e), true);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Buscando agendas…" : "Conectar agenda"}
          </button>
        ))}
      {calendars && (
        <form
          className="calendar-choice"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await connectDeviceCalendar(plan.id, selected);
              await update(
                (current) => ({
                  ...current,
                  settings: {
                    ...current.settings,
                    calendarSyncEnabled: true,
                    calendarId: selected,
                  },
                }),
                "Agenda conectada. Os próximos eventos serão preparados no calendário.",
                false,
              );
              setCalendars(null);
            } catch (e) {
              notify(errorMessage(e), true);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Calendário que receberá os eventos
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              {calendars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.account ? ` · ${c.account}` : ""}
                </option>
              ))}
            </select>
          </label>
          <p>
            Os títulos e prazos do planejamento serão copiados para o calendário
            escolhido. Se ele for compartilhado, outras pessoas com acesso
            poderão vê-los.
          </p>
          <div className="compact-actions">
            <button
              className="button secondary"
              type="button"
              onClick={() => setCalendars(null)}
            >
              Cancelar
            </button>
            <button className="button primary" disabled={busy || !selected}>
              Autorizar conexão automática
            </button>
          </div>
        </form>
      )}
      {disconnect && (
        <Confirm
          title="Desconectar a agenda?"
          description="As cópias criadas pelo Nosso Casamento neste planejamento serão removidas do calendário. Os registros do app e os outros eventos pessoais serão preservados."
          label="Desconectar e remover cópias"
          onClose={() => setDisconnect(false)}
          onConfirm={async () => {
            await disconnectCalendar(plan.id);
            await update(
              (current) => ({
                ...current,
                settings: {
                  ...current.settings,
                  calendarSyncEnabled: false,
                  calendarId: "",
                },
              }),
              "Agenda desconectada.",
              false,
            );
          }}
        />
      )}
    </section>
  );
}
