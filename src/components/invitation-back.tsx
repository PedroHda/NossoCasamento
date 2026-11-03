import { useEffect } from "react";
import { App } from "@capacitor/app";
import { isNative } from "../services/files.ts";

export function InvitationBack() {
  useEffect(() => {
    if (!isNative()) return;
    const listener = App.addListener("backButton", () => {
      location.hash = "guests";
    });
    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, []);
  return isNative() ? (
    <a className="button secondary" href="#guests">
      Voltar aos convidados
    </a>
  ) : null;
}
