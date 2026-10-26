import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import {
  attachmentSchema,
  newId,
  MAX_ATTACHMENT_BYTES,
  type Attachment,
} from "../domain/schema.ts";

export const isNative = () => Capacitor.isNativePlatform();
export async function saveText(
  filename: string,
  text: string,
  mime = "application/json",
) {
  if (isNative()) {
    const file = await Filesystem.writeFile({
      path: filename,
      data: text,
      encoding: Encoding.UTF8,
      directory: Directory.Cache,
    });
    await Share.share({
      files: [file.uri],
      title: "Nosso Casamento",
      dialogTitle: "Salvar ou compartilhar",
    });
  } else downloadBlob(filename, new Blob([text], { type: mime }));
}
export async function saveBinary(
  filename: string,
  buffer: ArrayBuffer,
  mime: string,
) {
  if (isNative()) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192)
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    const file = await Filesystem.writeFile({
      path: filename,
      data: btoa(binary),
      directory: Directory.Cache,
    });
    await Share.share({
      files: [file.uri],
      title: "Nosso Casamento",
      dialogTitle: "Salvar ou compartilhar",
    });
  } else downloadBlob(filename, new Blob([buffer], { type: mime }));
}
function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
export async function readAttachment(file: File): Promise<Attachment> {
  if (file.size > MAX_ATTACHMENT_BYTES)
    throw new Error("Escolha um PDF, PNG ou JPG de até 500 KB.");
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.readAsDataURL(file);
  });
  return attachmentSchema.parse({
    id: newId(),
    name: file.name,
    mime: file.type,
    size: file.size,
    data: dataUrl.split(",")[1],
  });
}
export async function downloadAttachment(file: Attachment) {
  const binary = atob(file.data);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  await saveBinary(file.name, bytes.buffer, file.mime);
}
export async function copyText(text: string) {
  if (!navigator.clipboard)
    throw new Error(
      "A cópia automática não está disponível. Selecione e copie o texto exibido.",
    );
  await navigator.clipboard.writeText(text);
}
