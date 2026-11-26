# Nosso Casamento para Android

**[Baixar NossoCasamento-2.1.1.apk](https://github.com/PedroHda/NossoCasamento/raw/refs/heads/master/apk/NossoCasamento-2.1.1.apk)** · [Checksum SHA-256](../apk/NossoCasamento-2.1.1.apk.sha256)

Os arquivos seguem o padrão `NossoCasamento-<versão>.apk`, sem prefixo `v` ou sufixo no nome. O script de compilação lê a versão do `package.json` e gera o APK e seu `.sha256` com esse padrão.

A versão 2.1.1 simplifica os cadastros e contém a rolagem horizontal das tabelas dentro da tela. Mantém o pacote e a mesma assinatura da 2.1.0, permitindo atualizar essa versão sem reinstalar. Exporte um backup antes de atualizar.

Inclui contagem inicial para **24/07/2027**, agora com data e horário editáveis, orçamento, pagamentos, parcelas, comprovantes, convidados, checklist, fornecedores, cronograma, relatórios e lembretes. A interface e as fontes estão incorporadas e abrem sem internet.

## Instalar

1. Se já usa o app, exporte o backup em Configurações e guarde o JSON fora dele.
2. Baixe `NossoCasamento-2.1.1.apk` no Android.
3. Abra o arquivo pelo download ou gerenciador.
4. Se solicitado, permita a instalação pela origem usada e confirme.
5. Abra **Nosso Casamento**, com o ícone de alianças, e importe o backup se reinstalou.

Requisitos: **Android 7.0+** e **WebView/Chrome 110+**. A assinatura é **debug**, para instalação direta. A versão 2.1.1 mantém `io.github.pedrohda.nossocasamento`, com `versionCode 4`.

**A assinatura é diferente do APK 2.0.0 que está no repositório.** A chave anterior não estava disponível neste computador. O Android pode recusar a atualização por cima; nesse caso, exporte o backup no aplicativo antigo, guarde o arquivo fora dele e só então desinstale, instale a 2.1.1 e importe o backup. A chave privada deste build não está no Git. Para versões seguintes, preserve essa chave fora do repositório ou adote uma chave release estável com uma transição planejada.

## Armazenamento e backup

Os dados ficam no `localStorage` da WebView, separados do navegador e de outros celulares. Não há banco, login ou sincronização remota. O primeiro acesso usa exemplos, ou migra os dados v1 existentes no mesmo armazenamento. A migração preserva a chave anterior e transforma os saldos pagos em lançamentos sem inventar datas.

Fechar o aplicativo mantém os dados; limpar dados/desinstalar pode apagá-los. Em **Configurações → Exportar backup**, o compartilhamento do Android permite guardar o JSON. A importação aceita v1/v2 até 6 MB e pede confirmação antes de substituir. Comprovantes e lixeira fazem parte do backup. Os limites de arquivo estão no [README](../README.md).

PDF, CSV, ICS, comprovantes e backup usam o compartilhamento nativo. Os arquivos temporários ficam no cache do aplicativo; escolha uma pasta ou destino para manter uma cópia permanente. Não há acesso amplo obrigatório ao armazenamento do aparelho.

O botão Voltar fecha uma janela/menu, retorna à visão geral ou minimiza o aplicativo quando já está na tela inicial.

## Lembretes

Abra **Lembretes → Ativar lembretes** e autorize as notificações se o Android solicitar. A antecedência é configurada em **Configurações**. Tarefas e pagamentos usam 09:00 de Brasília; o cronograma usa seu próprio horário. São agendados até 50 próximos avisos no futuro, atualizados ao abrir ou alterar os dados. Prazos já passados continuam no painel, sem gerar avisos retroativos.

A entrega depende das permissões, das restrições de bateria e das configurações de alarmes do Android; não é garantida precisão no segundo. Verifique os avisos no aparelho antes de depender deles. A versão web oferece a agenda e exportação ICS, sem notificações nativas.

## Conexão automática à agenda

Em **Agenda** ou **Lembretes**, toque em **Conectar agenda**. O Android solicita leitura e escrita no calendário apenas ao usar essa função. Escolha um calendário editável do aparelho e confirme a conexão. Não é necessário informar senha Google no app; ele usa o provedor de calendário já configurado no celular.

O app copia casamento, cronograma, tarefas pendentes, pagamentos e entregas previstas. Atualiza até 250 eventos próximos/recentes ao abrir/retomar o app e a cada edição, sem serviço permanente em segundo plano. A duração e o aviso dos momentos podem ser personalizados. Para os demais prazos, usa 09:00 de Brasília e a antecedência geral.

O vínculo nativo guarda os IDs das cópias e uma marca do planejamento. Repetir a sincronização não deve duplicá-las. Ao pagar/concluir/receber ou excluir um registro, suas cópias futuras saem da agenda; o histórico passado é mantido. **Desconectar agenda** remove as cópias identificadas como pertencentes ao planejamento, preservando os outros eventos. Não são adicionados participantes nem enviados convites.

Importar o JSON em outro celular não concede acesso à agenda. Use **Escolher / reautorizar agenda** se necessário. Agendas compartilhadas expõem os títulos/prazos às pessoas que já têm acesso. Avisos do calendário e notificações do app são opções independentes; ativar ambos pode produzir dois avisos.

Essa integração compilou no APK, mas as permissões, o provedor de calendário e a entrega dos avisos ainda precisam de teste em um aparelho físico.

## Compilar

Pré-requisitos: **Node.js 22.12+, JDK 21, SDK Android 36**, licenças do SDK previamente aceitas e internet para o primeiro download das dependências.

```bash
npm ci
npm test
npm run android:apk
```

Se necessário, defina `JAVA_HOME` e `ANDROID_HOME`. O script detecta locais comuns, incluindo o JDK do Android Studio, e usa o Gradle wrapper. A saída é `releases/NossoCasamento-2.1.1.apk` e seu `.sha256`. Para abrir no Android Studio:

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
