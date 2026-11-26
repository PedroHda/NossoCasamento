# Validação 2.2.0 — 26/11/2026

- `npm test`: 60 testes aprovados, incluindo total de R$ 12.570,00, inclusão única, preservação de preços/quantidades recebidas, backup antigo, exclusões, concorrência e falha de armazenamento.
- `npm run android:apk`: TypeScript, Vite, sincronização Capacitor e Gradle concluídos.
- APK: pacote `io.github.pedrohda.nossocasamento`, versão 2.2.0, código 5, Android mínimo 24 e alvo 36.
- Assinatura e alinhamento verificados com `apksigner` e `zipalign`. Certificado SHA-256: `7f007734dba318e7acd03c55c325a6220a16aa4ca8351dd3f7147898c1d00d08`, igual ao da série 2.1.
- Prévia local: o resumo exibiu 0 de 21 unidades recebidas e R$ 12.570,00 faltantes. Foram encontrados 16 registros; a pesquisa expandida mostrou quatro cortinas por R$ 1.480,00 e três luminárias por R$ 570,00, além das fontes por grupo.
- A interação com a tela foi encerrada a pedido do usuário. Não foi concluída uma nova verificação visual em várias larguras. As tabelas continuam dentro de uma região própria de rolagem, com medidas relativas na nova folha de estilos.
- A instalação/atualização e os gestos em aparelho físico não foram testados nesta entrega.

A metodologia, as premissas e as fontes estão na [pesquisa da casa](pesquisa-casa-2026-11-26.md).
