# Nosso Casamento para Android

O APK inclui o painel completo, com contagem para **24/07/2027 às 00:00 de Brasília**, orçamento, convidados, checklist e fornecedores. Os arquivos da interface e as fontes estão dentro do aplicativo, que pode ser aberto sem internet.

## Instalar no celular

**[Baixar APK v1.0.0 de demonstração](https://github.com/PedroHda/NossoCasamento/raw/refs/heads/master/apk/NossoCasamento-v1.0.0-demo.apk)** — 4,16 MB. Uma cópia está na pasta `apk/` do repositório.

1. Transfira `NossoCasamento-v1.0.0-demo.apk` para seu celular Android.
2. Abra o arquivo pelo gerenciador de arquivos ou pelo download.
3. Se o Android pedir, permita que esse aplicativo de origem instale o arquivo e confirme a instalação.
4. Abra **Nosso Casamento**, identificado pelo ícone de alianças.

O APK é uma **versão de demonstração assinada com chave de debug**, própria para instalar diretamente e mostrar o projeto. Para distribuição definitiva, gere uma assinatura release com uma chave própria, guardada fora do Git.

Requisitos: **Android 7.0 ou superior** e **Android System WebView/Chrome 110 ou superior**.

## Dados e backups

- O primeiro acesso apresenta os dados de exemplo da versão web.
- O planejamento fica no armazenamento local do aplicativo, separado do navegador e de outros celulares.
- Fechar o aplicativo mantém os cadastros. Desinstalar ou limpar os dados pode apagá-los.
- **Configurações → Exportar backup** abre o compartilhamento do Android. Escolha onde guardar ou enviar o JSON.
- **Importar backup** abre o seletor de arquivos e valida o JSON antes da substituição.
- O botão Voltar fecha a janela/menu, retorna à visão geral ou minimiza o aplicativo quando já está na tela inicial.
- O aplicativo não envia o planejamento para um servidor e não sincroniza automaticamente entre celulares.

## Gerar novamente

Instale Node.js 22.12+, **JDK 21** e o **SDK Android 36** com Build Tools 36.0.0. O SDK deve estar instalado com as licenças correspondentes já aceitas.

No PowerShell, se o ambiente ainda não estiver configurado:

```powershell
$env:JAVA_HOME = 'C:\caminho\para\jdk-21'
$env:ANDROID_HOME = 'C:\caminho\para\Android\Sdk'
npm ci
npm test
npm run android:apk
```

O script detecta as instalações usuais e ferramentas Android locais do ambiente Codex. Não altera configurações globais do computador. O Gradle wrapper baixa a versão exigida, sem precisar de instalação global do Gradle. A primeira compilação precisa de internet para baixar as dependências.

Saídas:

```text
releases/NossoCasamento-v1.0.0-demo.apk
releases/NossoCasamento-v1.0.0-demo.apk.sha256
android/app/build/outputs/apk/debug/app-debug.apk
```

Confira a integridade:

```powershell
Get-FileHash .\releases\NossoCasamento-v1.0.0-demo.apk -Algorithm SHA256
```

A pasta `releases/` é ignorada pelo Git. Chaves `.keystore` e `.jks`, `local.properties`, caches e builds Android também são ignorados.

## Verificações desta versão

- Compilação Android concluída com sucesso.
- Assinatura APK v2 e alinhamento verificados pelas ferramentas do SDK Android.
- Manifesto conferido: aplicativo `Nosso Casamento`, versão `1.0.0`, mínimo API 24 e alvo API 36.
- Arquivos da interface e fontes locais confirmados dentro do APK.
- Os 12 testes automatizados das regras de negócio passaram.
- Não foi realizado teste de instalação em aparelho físico; nenhum dispositivo estava conectado durante a geração.

## Personalização

- Identidade: `capacitor.config.json` e `android/app/src/main/res/values/strings.xml`.
- Ícone: recursos `wedding_launcher` e `wedding_mark` em `android/app/src/main/res/`.
- Cores de abertura: `android/app/src/main/res/values/styles.xml` e `wedding_colors.xml`.
- Versão: `versionCode` e `versionName` em `android/app/build.gradle`.
- Data e contagem: `src/model.js` e textos relacionados em `src/main.js`.

Após alterar a interface, execute `npm run android:apk` para incluir o build atualizado no aplicativo.

Referências: [Android no Capacitor](https://capacitorjs.com/docs/android), [Filesystem](https://capacitorjs.com/docs/apis/filesystem) e [Share](https://capacitorjs.com/docs/apis/share).
