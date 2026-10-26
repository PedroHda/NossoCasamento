# Nosso Casamento para Android

**[Baixar APK v2.0.0 de demonstração](https://github.com/PedroHda/NossoCasamento/raw/refs/heads/master/apk/NossoCasamento-v2.0.0-demo.apk)** · [Checksum SHA-256](../apk/NossoCasamento-v2.0.0-demo.apk.sha256)

Inclui contagem inicial para **24/07/2027**, agora com data e horário editáveis, orçamento, pagamentos, parcelas, comprovantes, convidados, checklist, fornecedores, cronograma, relatórios e lembretes. A interface e as fontes estão incorporadas e abrem sem internet.

## Instalar

1. Baixe `NossoCasamento-v2.0.0-demo.apk` no Android.
2. Abra o arquivo pelo download ou gerenciador.
3. Se solicitado, permita a instalação pela origem usada e confirme.
4. Abra **Nosso Casamento**, com o ícone de alianças.

Requisitos: **Android 7.0+** e **WebView/Chrome 110+**. A assinatura é **debug**, para demonstração e instalação direta. A versão 2 mantém o identificador `io.github.pedrohda.nossocasamento`, com `versionCode 2`. A atualização sobre a versão 1 depende da mesma assinatura; caso o Android recuse por diferença de chave, exporte seu backup antes de desinstalar ou trocar o aplicativo.

## Armazenamento e backup

Os dados ficam no `localStorage` da WebView, separados do navegador e de outros celulares. Não há banco, login ou sincronização remota. O primeiro acesso usa exemplos, ou migra os dados v1 existentes no mesmo armazenamento. A migração preserva a chave anterior e transforma os saldos pagos em lançamentos sem inventar datas.

Fechar o aplicativo mantém os dados; limpar dados/desinstalar pode apagá-los. Em **Configurações → Exportar backup**, o compartilhamento do Android permite guardar o JSON. A importação aceita v1/v2 até 6 MB e pede confirmação antes de substituir. Comprovantes e lixeira fazem parte do backup. Os limites de arquivo estão no [README](../README.md).

PDF, CSV, ICS, comprovantes e backup usam o compartilhamento nativo. Os arquivos temporários ficam no cache do aplicativo; escolha uma pasta ou destino para manter uma cópia permanente. Não há acesso amplo obrigatório ao armazenamento do aparelho.

O botão Voltar fecha uma janela/menu, retorna à visão geral ou minimiza o aplicativo quando já está na tela inicial.

## Lembretes

Abra **Lembretes → Ativar lembretes** e autorize as notificações se o Android solicitar. A antecedência é configurada em **Configurações**. Tarefas e pagamentos usam 09:00 de Brasília; o cronograma usa seu próprio horário. São agendados até 50 próximos avisos no futuro, atualizados ao abrir ou alterar os dados. Prazos já passados continuam no painel, sem gerar avisos retroativos.

A entrega depende das permissões, das restrições de bateria e das configurações de alarmes do Android; não é garantida precisão no segundo. Verifique os avisos no aparelho antes de depender deles. A versão web oferece a agenda e exportação ICS, sem notificações nativas.

## Compilar

Pré-requisitos: **Node.js 22.12+, JDK 21, SDK Android 36**, licenças do SDK previamente aceitas e internet para o primeiro download das dependências.

```bash
npm ci
npm test
npm run android:apk
```

Se necessário, defina `JAVA_HOME` e `ANDROID_HOME`. O script detecta locais comuns e usa o Gradle wrapper. A saída é `releases/NossoCasamento-v2.0.0-demo.apk` e seu `.sha256`. Para abrir no Android Studio:

```bash
npm run android:sync
npm run android:open
```

O projeto mantém o wrapper em LF, `android.overridePathCheck=true` para caminhos Windows com acentos e os caminhos do SDK em arquivo local ignorado pelo Git. Dependências e arquivos gerados ficam fora do versionamento; o APK de demonstração está em `apk/` por conveniência.

## Personalizar e distribuir

- Data, horário e dados do casal: Configurações no aplicativo.
- Identidade do pacote/nome: `capacitor.config.json` e recursos Android.
- Ícone: recursos `wedding_launcher`/`wedding_mark` em `android/app/src/main/res/`.
- Versão: mantenha `package.json` e `android/app/build.gradle` alinhados.

Para distribuir definitivamente, faça testes em dispositivos, gere uma chave release e guarde-a fora do repositório. Uma assinatura debug não é a assinatura de produção. Não foi realizado teste em aparelho físico nesta atualização; a validação inclui build, assinatura, alinhamento e conferência web.
