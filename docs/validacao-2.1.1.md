# Validação da versão 2.1.1

Realizada em 26/11/2026, com dados fictícios na prévia local.

- Os 50 testes existentes passaram.
- TypeScript, build web e compilação Android passaram. O APK foi conferido com `apksigner` e `zipalign`, com versão 2.1.1 / código 4 e a mesma assinatura da 2.1.0. A prévia de produção abriu sem erros de console.
- Foram conferidas as nove telas do planejamento nas larguras de 320, 390, 768 e 1280 px. Em todas, o corpo da página permaneceu na largura disponível e os blocos principais não ultrapassaram a borda direita.
- A compilação final também passou pelas nove telas em sete larguras intermediárias (287, 347, 411, 539, 667, 913 e 1441 px): 63 combinações sem conteúdo aumentando a largura do corpo da página. Essas larguras são apenas condições de teste; os novos estilos usam porcentagens, `rem`, `clamp()` e grades com `auto-fit`/`minmax()`, adaptando-se ao espaço disponível.
- No orçamento a 390 px, a tabela percorreu 615 px horizontalmente enquanto o deslocamento horizontal da página permaneceu em zero. A tabela mantém todas as colunas e pode receber foco pelo teclado.
- Cadastro mínimo conferido no navegador para despesas, convidados, famílias, itens da casa, tarefas, fornecedores e cronograma.
- Na despesa, categoria, estimativa e observações foram preenchidas; depois, o valor foi editado com os detalhes fechados. Os dados opcionais continuaram intactos.
- Um campo inválido dentro de “Mais detalhes” foi revelado automaticamente antes da correção, sem bloquear o formulário em uma área escondida.

Os campos opcionais continuam no formulário e no backup. A versão não altera o schema nem remove registros existentes.

A conferência de layout foi realizada no navegador com tamanhos de celular, tablet e computador. O comportamento de gestos no WebView ainda deve ser conferido em um aparelho Android físico.
