import { useState } from "react";
import { Share } from "@capacitor/share";
import { usePlanning } from "../app/context.tsx";
import { errorMessage, type Guest } from "../domain/schema.ts";
import { formatDate } from "../domain/planning.ts";
import {
  invitationUrl,
  parseInvitation,
  parseResponse,
  encodeCode,
  applyResponse,
} from "../services/invitations.ts";
import { copyText, isNative, saveText } from "../services/files.ts";
import { Modal, SubmitForm, Icon, stringField, numberField } from "./ui.tsx";

export function GuestInvitation({
  guest,
  onClose,
}: {
  guest: Guest;
  onClose: () => void;
}) {
  const { plan, notify } = usePlanning();
  const link = invitationUrl(plan, guest, location.href.split("#")[0]);
  const url = new URL(link);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  return (
    <Modal
      title={`Um convite para ${guest.name}`}
      subtitle="Um jeito de receber a confirmação, com a cara do nosso dia."
      onClose={onClose}
    >
      <div className="invitation-preview">
        <Icon name="heart" />
        <span>VOCÊ FAZ PARTE DA NOSSA HISTÓRIA</span>
        <h3>{plan.settings.couple || "Nosso casamento"}</h3>
        <p>
          {formatDate(plan.settings.weddingDate, true)} ·{" "}
          {plan.settings.weddingTime}
        </p>
        {plan.settings.location && <p>{plan.settings.location}</p>}
        <strong>{guest.name}</strong>
        <small>
          Convite para você
          {guest.companions ? ` e até ${guest.companions} acompanhante(s)` : ""}
          .
        </small>
      </div>
      <p className="settings-description">
        A pessoa preenche o convite e envia um código de resposta para vocês.
        Depois, use “Importar confirmação” na lista de convidados. A atualização
        é manual nesta versão.
      </p>
      {local && (
        <p className="storage-warning">
          Este endereço é local. Para enviar o link a outros celulares, informe
          o endereço público do site em Configurações. Você já pode testar o
          convite aqui.
        </p>
      )}
      <label>
        Link do convite
        <textarea
          readOnly
          value={link}
          rows={3}
          onFocus={(event) => event.currentTarget.select()}
        />
      </label>
      <div className="backup-actions">
        <button
          className="button secondary"
          onClick={() => {
            window.open(link, "_blank", "noopener,noreferrer");
          }}
        >
          Testar convite
        </button>
        <button
          className="button primary"
          disabled={local}
          onClick={() => {
            void copyText(link)
              .then(() => notify("Link copiado. Envie para o convidado."))
              .catch((error) => notify(errorMessage(error), true));
          }}
        >
          <Icon name="external" /> Copiar link para enviar
        </button>
      </div>
      <p className="field-note">
        O link contém apenas este convite. Compartilhe com a pessoa convidada; a
        resposta não comprova identidade.
      </p>
    </Modal>
  );
}
export function ImportResponse({ onClose }: { onClose: () => void }) {
  const { plan, update } = usePlanning();
  const [response, setResponse] = useState<ReturnType<
    typeof parseResponse
  > | null>(null);
  const [error, setError] = useState("");
  const guest = response
    ? plan.guests.find((item) => item.inviteToken === response.token)
    : null;
  return (
    <Modal
      title="Receber uma confirmação"
      subtitle="Cole o código que o convidado enviou para vocês."
      onClose={onClose}
    >
      <SubmitForm
        onClose={onClose}
        label="Aplicar confirmação"
        disabled={!response}
        onSubmit={async () => {
          if (response) {
            await update(
              (current) => applyResponse(current, response),
              "Confirmação registrada na lista.",
            );
            return;
          }
          throw new Error("Primeiro confira o código pelo botão abaixo.");
        }}
      >
        <label>
          Código de resposta
          <textarea
            name="code"
            rows={4}
            required
            maxLength={6000}
            onChange={() => {
              setResponse(null);
              setError("");
            }}
          />
        </label>
        <button
          type="button"
          className="button secondary"
          onClick={(event) => {
            const form = event.currentTarget.closest("form")!;
            const code = String(new FormData(form).get("code") || "");
            try {
              const parsed = parseResponse(code);
              const invited = plan.guests.find(
                (item) => item.inviteToken === parsed.token,
              );
              if (!invited)
                throw new Error(
                  "Este código não pertence à sua lista de convidados.",
                );
              if (parsed.companions > invited.companions)
                throw new Error(
                  "A resposta excede a quantidade de acompanhantes deste convite.",
                );
              setResponse(parsed);
              setError("");
            } catch (error) {
              setResponse(null);
              setError(errorMessage(error));
            }
          }}
        >
          Conferir código
        </button>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {response && (
          <div className="response-summary">
            <h3>{guest?.name}</h3>
            <p>
              {response.status} · {response.companions} acompanhante(s)
            </p>
            <p>
              {response.dietary || "Sem restrições alimentares informadas."}
            </p>
            <small>
              Confira os dados antes de aplicar. Você pode desfazer a alteração.
            </small>
          </div>
        )}
      </SubmitForm>
    </Modal>
  );
}

export function PublicRsvp({ code }: { code: string }) {
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  let invitation;
  try {
    invitation = parseInvitation(code);
  } catch {
    return (
      <main className="rsvp-page">
        <h1>Não conseguimos abrir esse convite.</h1>
        <p>Peça ao casal um link completo e tente novamente.</p>
      </main>
    );
  }
  return (
    <main className="rsvp-page">
      <div className="rsvp-brand">
        <Icon name="heart" /> NOSSO CASAMENTO
      </div>
      <section className="card rsvp-card">
        <span className="eyebrow">VOCÊ FAZ PARTE DA NOSSA HISTÓRIA</span>
        <h1>{invitation.couple || "Vamos celebrar o nosso sim!"}</h1>
        <div className="rsvp-date">
          {formatDate(invitation.date, true)} · {invitation.time} · Brasília
        </div>
        {invitation.location && <p>{invitation.location}</p>}
        <div className="rsvp-greeting">
          <h2>Que alegria ter você por perto, {invitation.guest}.</h2>
          <p>Conte para a gente se poderá estar nesse dia especial.</p>
        </div>
        {!reply ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const companions = numberField(data, "companions");
              if (companions > invitation.maxCompanions) {
                setError("Confira a quantidade de acompanhantes do convite.");
                return;
              }
              setReply(
                encodeCode({
                  version: 1,
                  token: invitation.token,
                  status: stringField(data, "status"),
                  companions:
                    stringField(data, "status") === "Confirmado"
                      ? companions
                      : 0,
                  dietary: stringField(data, "dietary"),
                  updatedAt: new Date().toISOString(),
                }),
              );
            }}
          >
            <label>
              Podemos contar com você?
              <select name="status">
                <option>Confirmado</option>
                <option>Não vai</option>
              </select>
            </label>
            <label>
              Quantos acompanhantes irão com você?
              <input
                type="number"
                name="companions"
                min="0"
                max={invitation.maxCompanions}
                defaultValue={0}
                required
              />
              <small>
                Este convite permite até {invitation.maxCompanions}{" "}
                acompanhante(s).
              </small>
            </label>
            <label>
              Restrição alimentar ou alergia
              <textarea
                name="dietary"
                maxLength={300}
                rows={2}
                placeholder="Se houver, conte para a gente."
              />
            </label>
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <button className="button primary" type="submit">
              Preparar minha confirmação <Icon name="heart" />
            </button>
          </form>
        ) : (
          <div className="rsvp-reply">
            <h2>Sua resposta está preparada. ♡</h2>
            <p>
              Envie o código abaixo ao casal para que ele atualize a lista. O
              envio não acontece automaticamente.
            </p>
            <textarea
              aria-label="Código de confirmação"
              value={reply}
              readOnly
              rows={5}
              onFocus={(event) => event.currentTarget.select()}
            />
            <div className="backup-actions">
              <button
                className="button primary"
                onClick={async () => {
                  try {
                    if (isNative())
                      await Share.share({
                        text: `Minha confirmação para o casamento:\n${reply}`,
                        dialogTitle: "Enviar confirmação ao casal",
                      });
                    else await copyText(reply);
                    setError(
                      "Código copiado ou preparado para compartilhar. Envie ao casal.",
                    );
                  } catch (error) {
                    setError(errorMessage(error));
                  }
                }}
              >
                {isNative() ? "Compartilhar confirmação" : "Copiar confirmação"}
              </button>
              <button
                className="button secondary"
                onClick={() => {
                  void saveText(
                    "confirmacao-casamento.txt",
                    reply,
                    "text/plain",
                  ).catch((error) => setError(errorMessage(error)));
                }}
              >
                Baixar resposta
              </button>
              <button className="text-link" onClick={() => setReply("")}>
                Corrigir resposta
              </button>
            </div>
            {error && <p role="status">{error}</p>}
          </div>
        )}
        <p className="privacy-note">
          A resposta só chega ao casal quando você envia o código. Este
          formulário não envia dados a um servidor.
        </p>
      </section>
    </main>
  );
}
