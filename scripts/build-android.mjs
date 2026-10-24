import { spawnSync } from "node:child_process";
import {
  existsSync,
  readdirSync,
  mkdirSync,
  copyFileSync,
  readFileSync,
  writeFileSync,
  statSync,
} from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const root = fileURLToPath(new URL("../", import.meta.url));
const windows = process.platform === "win32";
const executable = (name) => `${name}${windows ? ".exe" : ""}`;
const cache = join(homedir(), ".codex", "android-build");
const firstDirectory = (parent, pattern) =>
  existsSync(parent)
    ? readdirSync(parent)
        .filter((name) => pattern.test(name))
        .map((name) => join(parent, name))
        .find((path) => existsSync(join(path, "bin", executable("java"))))
    : undefined;
const javaHome = [
  process.env.JAVA_HOME,
  firstDirectory("C:/Program Files/Android/openjdk", /^jdk-21/),
  firstDirectory("C:/Program Files/Eclipse Adoptium", /^jdk-21/),
  "/usr/lib/jvm/java-21-openjdk-amd64",
].find((path) => path && existsSync(join(path, "bin", executable("java"))));
const sdk = [
  process.env.ANDROID_HOME,
  process.env.ANDROID_SDK_ROOT,
  windows
    ? join(homedir(), "AppData", "Local", "Android", "Sdk")
    : join(homedir(), "Android", "Sdk"),
  join(homedir(), "Library", "Android", "sdk"),
  join(cache, "sdk"),
].find((path) => path && existsSync(join(path, "platforms", "android-36")));

function fail(message) {
  console.error(`\n${message}`);
  process.exit(1);
}
if (!javaHome)
  fail("JDK 21 não encontrado. Defina JAVA_HOME para a instalação do JDK 21.");
if (!sdk)
  fail(
    "SDK Android 36 não encontrado. Instale a plataforma 36 e defina ANDROID_HOME.",
  );
const java = join(javaHome, "bin", executable("java"));
const javaVersion = spawnSync(java, ["-version"], { encoding: "utf8" });
if (!/version "21\./.test(javaVersion.stderr + javaVersion.stdout))
  fail("A compilação Android requer JDK 21. Ajuste JAVA_HOME.");
const env = { ...process.env, JAVA_HOME: javaHome, ANDROID_HOME: sdk };
function run(binary, args, cwd = root) {
  const result = spawnSync(binary, args, {
    cwd,
    env,
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.error) fail(result.error.message);
  if (result.status !== 0)
    fail("A compilação falhou. Veja o primeiro erro no log acima.");
}

const npmCli = process.env.npm_execpath;
if (!npmCli) fail("Execute este script usando npm run android:apk.");
run(process.execPath, [npmCli, "run", "android:sync"]);
run(
  java,
  [
    "-classpath",
    join(root, "android", "gradle", "wrapper", "gradle-wrapper.jar"),
    "org.gradle.wrapper.GradleWrapperMain",
    "--no-daemon",
    "--max-workers=2",
    "--console=plain",
    ":app:assembleDebug",
  ],
  join(root, "android"),
);

const apk = join(
  root,
  "android",
  "app",
  "build",
  "outputs",
  "apk",
  "debug",
  "app-debug.apk",
);
const version = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
).version;
const name = `NossoCasamento-v${version}-demo.apk`;
const releaseDir = resolve(root, "releases");
mkdirSync(releaseDir, { recursive: true });
const destination = join(releaseDir, name);
copyFileSync(apk, destination);
const checksum = createHash("sha256")
  .update(readFileSync(destination))
  .digest("hex");
writeFileSync(`${destination}.sha256`, `${checksum}  ${name}\n`);
console.log(
  `\nAPK pronto: ${destination}\nTamanho: ${(statSync(destination).size / 1024 / 1024).toFixed(2)} MB\nSHA-256: ${checksum}\nAssinatura: debug (instalação direta para demonstração).`,
);
