import { useState } from "react";
import { Share } from "@capacitor/share";
import { usePlanning } from "../app/context.tsx";
import { errorMessage, type Family } from "../domain/schema.ts";
import { formatDate } from "../domain/planning.ts";
import {
  familyInvitationUrl,
  parseFamilyInvitation,
  parseAnyResponse,
  applyAnyResponse,
  familyResponseSchema,
} from "../services/family-invitations.ts";
import { encodeCode } from "../services/invitations.ts";
import { isNative, copyText, saveText } from "../services/files.ts";
import { Modal, Icon, SubmitForm } from "./ui.tsx";
import { InvitationBack } from "./invitation-back.tsx";
export function FamilyInvitation({
  family,
  onClose,
}: {
  family: Family;
  onClose: () => void;
}) {
  const { plan, notify } = usePlanning();
  const members = plan.guests.filter((g) => g.familyId === family.id);
  let link = "",
    problem = "";
  try {
    link = familyInvitationUrl(plan, family, location.href.split("#")[0]);
  } catch (e) {
    problem = members.length
      ? errorMessage(e)
      : "Adicione pelo menos um membro antes de criar o convite da família.";
  }
  const local =
    !link ||
    ["localhost", "127.0.0.1", "[::1]"].includes(new URL(link).hostname);
  return (
    <Modal
      title={`Convite · ${family.name}`}
      subtitle="Um único link, respostas individuais para cada pessoa."
      onClose={onClose}
    >
      <div className="invitation-preview">
        <Icon name="users" />
        <span>UMA FAMÍLIA NA NOSSA HISTÓRIA</span>
        <h3>{plan.settings.couple || "Nosso casamento"}</h3>
        <p>
          {formatDate(plan.settings.weddingDate, true)} ·{" "}
          {plan.settings.weddingTime}
        </p>
        <strong>{family.name}</strong>
        <small>{members.map((g) => g.name).join(" · ")}</small>
      </div>
      {problem ? (
        <p className="form-error" role="alert">
          {problem}
        </p>
      ) : (
        <>
          <p className="settings-description">
            Cada membro pode confirmar, recusar ou informar “Talvez”. A família
            envia um código com as respostas; vocês conferem e importam na
            lista. Sem servidor de confirmação, a atualização é feita por esse
            código.
          </p>
          {local && (
            <p className="storage-warning">
              Este endereço funciona apenas neste aparelho. Configure a URL
              pública do site para que o link abra no celular dos convidados.
            </p>
          )}
          <label>
            Link da família
            <textarea
              readOnly
              rows={3}
              value={link}
              onFocus={(e) => e.currentTarget.select()}
            />
          </label>
          <div className="backup-actions">
            <button
              className="button secondary"
              onClick={() => {
                if (isNative()) location.hash = new URL(link).hash;
                else window.open(link, "_blank", "noopener,noreferrer");
              }}
            >
              Visualizar convite
            </button>
            <button
              className="button primary"
              disabled={local}
              onClick={() =>
                void (
                  isNative()
                    ? Share.share({
                        text: `${family.name}, queremos vocês no nosso casamento! ${link}`,
                        dialogTitle: "Compartilhar convite da família",
                      })
                    : copyText(link)
                )
                  .then(() =>
                    notify(
                      isNative()
                        ? "Convite preparado para compartilhar."
                        : "Link da família copiado.",
                    ),
                  )
                  .catch((e) => notify(errorMessage(e), true))
              }
            >
              <Icon name="external" />{" "}
              {isNative() ? "Compartilhar link" : "Copiar link"}
            </button>
          </div>
          {!local && family.phone && (
            <a
              className="button secondary whatsapp-compose"
              href={`https://wa.me/${family.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá, ${family.contact || family.name}! Queremos vocês no nosso casamento. Confirmem pelo convite da família: ${link}`)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Preparar mensagem no WhatsApp
            </a>
          )}
          <p className="field-note">
            O convite expõe somente os nomes deste núcleo e os dados do evento.
            Não inclui telefones nem a lista das outras famílias. Compartilhe
            com as pessoas certas.
          </p>
        </>
      )}
    </Modal>
  );
}
export function ConfirmationImport({ onClose }: { onClose: () => void }) {
  const { plan, update } = usePlanning();
  const [parsed, setParsed] = useState<ReturnType<
      typeof parseAnyResponse
    > | null>(null),
    [error, setError] = useState("");
  const family =
    parsed?.version === 2
      ? plan.families.find((f) => f.inviteToken === parsed.token)
      : null;
  const guest =
    parsed?.version === 1
      ? plan.guests.find((g) => g.inviteToken === parsed.token)
      : null;
  return (
    <Modal
      title="Receber uma confirmação"
      subtitle="Aceita o código de uma pessoa ou as respostas da família inteira."
      onClose={onClose}
    >
      <SubmitForm
        onClose={onClose}
        label="Aplicar confirmação"
        disabled={!parsed}
        onSubmit={async () => {
          if (!parsed) throw new Error("Confira o código antes de aplicar.");
          await update(
            (current) => applyAnyResponse(current, parsed),
            "Confirmação registrada. A lista da família foi atualizada.",
          );
        }}
      >
        <label>
          Código da confirmação
          <textarea
            name="code"
            rows={4}
            maxLength={24000}
            required
            onChange={() => {
              setParsed(null);
              setError("");
            }}
          />
        </label>
        <button
          type="button"
          className="button secondary"
          onClick={(e) => {
            try {
              const code = String(
                new FormData(e.currentTarget.closest("form")!).get("code") ||
                  "",
              );
              const response = parseAnyResponse(code);
              applyAnyResponse(plan, response);
              setParsed(response);
              setError("");
            } catch (e) {
              setError(errorMessage(e));
            }
          }}
        >
          Conferir respostas
        </button>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {parsed && (
          <div className="confirmation-preview">
            <h3>{family?.name || guest?.name}</h3>
            {parsed.version === 2 ? (
              parsed.members.map((m) => (
                <p key={m.token}>
                  <b>
                    {plan.guests.find((g) => g.inviteToken === m.token)?.name}
                  </b>{" "}
                  · {m.status}
                  {m.status === "Confirmado"
                    ? ` · ${m.companions} acompanhante(s)`
                    : ""}
                </p>
              ))
            ) : (
              <p>
                {parsed.status} · {parsed.companions} acompanhante(s)
              </p>
            )}
          </div>
        )}
      </SubmitForm>
    </Modal>
  );
}
export function PublicFamilyRsvp({ code }: { code: string }) {
  const [reply, setReply] = useState(""),
    [error, setError] = useState("");
  let invitation;
  try {
    invitation = parseFamilyInvitation(code);
  } catch {
    return (
      <main className="rsvp-page">
        <InvitationBack />
        <h1>Não conseguimos abrir esse convite.</h1>
        <p>Peça ao casal um link completo da família.</p>
      </main>
    );
  }
  return (
    <main className="rsvp-page">
      <InvitationBack />
      <div className="rsvp-brand">
        <Icon name="heart" /> NOSSO CASAMENTO
      </div>
      <section className="card rsvp-card">
        <span className="eyebrow">QUEREMOS VOCÊS NA NOSSA HISTÓRIA</span>
        <h1>{invitation.couple || "Vamos celebrar o nosso sim!"}</h1>
        <p className="rsvp-date">
          {formatDate(invitation.date, true)} · {invitation.time} · Brasília
        </p>
        {invitation.location && <p>{invitation.location}</p>}
        <h2>{invitation.family}, contamos com vocês?</h2>
        <p>Uma resposta para cada pessoa, respeitando os limites do convite.</p>
        {!reply ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              try {
                const data = new FormData(e.currentTarget);
                const response = familyResponseSchema.parse({
                  version: 2,
                  kind: "family",
                  token: invitation.token,
                  updatedAt: new Date().toISOString(),
                  members: invitation.members.map((member, index) => {
                    const status = String(data.get(`status-${index}`));
                    const companions = Number(
                      data.get(`companions-${index}`) || 0,
                    );
                    if (companions > member.maxCompanions)
                      throw new Error(
                        `Confira o limite de acompanhantes de ${member.name}.`,
                      );
                    return {
                      token: member.token,
                      status,
                      companions: status === "Confirmado" ? companions : 0,
                      dietary: String(data.get(`dietary-${index}`) || ""),
                    };
                  }),
                });
                setReply(encodeCode(response));
                setError("");
              } catch (e) {
                setError(errorMessage(e));
              }
            }}
          >
            {invitation.members.map((member, index) => (
              <fieldset className="rsvp-member" key={member.token}>
                <legend>
                  {member.name}
                  {member.child ? " · criança" : ""}
                </legend>
                <label>
                  Presença de {member.name}
                  <select name={`status-${index}`} required defaultValue="">
                    <option value="" disabled>
                      Escolha uma resposta
                    </option>
                    <option>Confirmado</option>
                    <option>Talvez</option>
                    <option>Não vai</option>
                  </select>
                </label>
                {member.maxCompanions > 0 && (
                  <label>
                    Acompanhantes de {member.name}
                    <input
                      type="number"
                      min="0"
                      max={member.maxCompanions}
                      defaultValue={0}
                      name={`companions-${index}`}
                    />
                    <small>
                      Limite: {member.maxCompanions}. Não repita membros já
                      listados neste convite.
                    </small>
                  </label>
                )}
                <label>
                  Restrição alimentar / alergia
                  <textarea
                    name={`dietary-${index}`}
                    maxLength={300}
                    rows={2}
                  />
                </label>
              </fieldset>
            ))}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary">
              Preparar respostas da família <Icon name="heart" />
            </button>
          </form>
        ) : (
          <div className="rsvp-reply">
            <h2>Respostas preparadas. ♡</h2>
            <p>
              Envie este código ao casal para que ele confirme a importação. As
              respostas não são enviadas automaticamente.
            </p>
            <textarea
              aria-label="Código de confirmação da família"
              value={reply}
              readOnly
              rows={5}
              onFocus={(e) => e.currentTarget.select()}
            />
            <div className="backup-actions">
              <button
                className="button primary"
                onClick={() =>
                  void (
                    isNative()
                      ? Share.share({
                          text: `Confirmação da família ${invitation.family}:\n${reply}`,
                        })
                      : copyText(reply)
                  )
                    .then(() => setError("Código pronto. Envie ao casal."))
                    .catch((e) => setError(errorMessage(e)))
                }
              >
                {" "}
                {isNative() ? "Compartilhar respostas" : "Copiar respostas"}
              </button>
              <button
                className="button secondary"
                onClick={() =>
                  void saveText(
                    "confirmacao-familia.txt",
                    reply,
                    "text/plain",
                  ).catch((e) => setError(errorMessage(e)))
                }
              >
                Baixar resposta
              </button>
              <button className="text-link" onClick={() => setReply("")}>
                Corrigir respostas
              </button>
            </div>
            {error && <p role="status">{error}</p>}
          </div>
        )}
        <p className="privacy-note">
          Este formulário não envia dados a um servidor. O casal recebe as
          respostas quando você compartilha o código.
        </p>
      </section>
    </main>
  );
}
