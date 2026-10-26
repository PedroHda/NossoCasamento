# Arquitetura e preparação para persistência remota

A versão 2 usa React e TypeScript, com dados validados por Zod. O único armazenamento implementado é `localStorage`. Não existe conexão com banco, backend, autenticação, fila de sincronização ou armazenamento remoto de arquivos.

## Caminho dos dados

```text
Telas React → PlanningProvider → PlanningRepository → LocalPlanningRepository
                    ↓                         ↓
             regras de domínio        localStorage :v2
```

- `src/domain/schema.ts`: modelo v2, limites, datas, valores e integridade de referências.
- `src/domain/migration.ts`: conversão de backups v1 e criação dos exemplos.
- `src/domain/planning.ts`: cálculos em centavos, parcelas, lixeira, lembretes e gráfico.
- `src/data/contracts.ts`: contratos assíncronos de persistência, identidade e colaboração.
- `src/data/local-repository.ts`: migração, leitura, validação, revisão, locks e eventos de outras abas.
- `src/data/services.ts`: ponto de composição dos adaptadores.
- `src/app/context.tsx`: estado das telas, gravação, recuperação, avisos e desfazer.
- `src/services/`: exportações locais, arquivos, convites portáveis e notificações Android.

Os componentes não acessam `localStorage` diretamente. O provider aceita `ApplicationServices` por propriedade; o padrão vem de `createServices()`. Os contratos de identidade e colaboração são apenas interfaces, sem comportamento ativo.

## Contrato do repositório

| Operação                       | Responsabilidade                                                                 |
| ------------------------------ | -------------------------------------------------------------------------------- |
| `load()`                       | Ler e devolver um plano válido, ou `null` se ausente.                            |
| `save(plan, expectedRevision)` | Validar e gravar somente sobre a revisão esperada; devolver a versão persistida. |
| `replace(plan)`                | Substituir após confirmação explícita do usuário; também usado na recuperação.   |
| `subscribe(listener)`          | Avisar alterações externas, permitindo recarregar o plano.                       |
| `rawBackup()`                  | Disponibilizar dados para recuperação, inclusive quando inválidos.               |

O adaptador local incrementa a revisão e atualiza o timestamp a cada gravação. Usa Web Locks quando disponíveis, e conserva a chave v1 intacta depois de migrar para v2. Sem Web Locks, a checagem de revisão reduz conflitos, mas não garante exclusão mútua entre processos.

Não há replicação ou sincronização offline com servidor. Abrir em outra origem ou aparelho cria um armazenamento separado. As exportações são manuais.

## Modelo de domínio

`Plan` contém ID, versão, revisão, timestamp, preferências, despesas, convidados, tarefas, fornecedores, cronograma e lixeira. Registros têm ID e timestamp; pagamentos, parcelas e comprovantes têm IDs próprios. Despesas referenciam fornecedores; pagamentos referenciam parcelas e comprovantes da própria despesa.

O snapshot inteiro é validado antes de salvar. São rejeitados IDs repetidos, referências inexistentes, valores com mais de duas casas decimais, pagamentos acima do saldo e arquivos incompatíveis com o formato declarado. Registros da lixeira continuam contando para integridade e limite de arquivos. O limite de lixeira é 100 registros; exclusões adicionais falham sem remover dados.

Comprovantes são base64 no JSON, dentro dos limites locais. Esse desenho é próprio para a versão demonstrativa; um adaptador remoto deve mover arquivos para um serviço de objetos e alterar o schema com migração. URLs assinadas temporárias não devem ser persistidas como referência definitiva.

## Como adicionar uma API depois

1. Definir autenticação e vínculo dos dois membros ao planejamento. Implementar `IdentityGateway` e `CollaborationGateway` somente quando o backend estiver pronto.
2. Implementar `PlanningRepository` remoto e injetá-lo em `PlanningProvider`, ou selecioná-lo em `createServices()`.
3. Aplicar autorização no servidor em todas as leituras, alterações, convites e arquivos. IDs e validação do cliente não são autorização.
4. Garantir a comparação de revisão e a gravação numa transação atômica. Traduzir conflito para `RevisionConflictError`; não sobrescrever silenciosamente.
5. Modelar entidades/tabelas e migrações, preservando IDs e centavos. Uma API de snapshot pode ser a primeira implementação; normalização exige recompor e validar o agregado na leitura.
6. Criar importação local → remoto explícita e recuperável, com backup e política de conflitos. Não enviar dados automaticamente ao instalar a nova versão.
7. Substituir o transporte base64 de arquivos por upload autorizado, limites no servidor e referências permanentes. Validar conteúdo no servidor também.
8. Implementar assinatura de alterações/realtime no adaptador e remover inscrições ao sair. Tratar sessão expirada e perda de conexão de forma visível.
9. Para sincronização offline, projetar fila persistente, idempotência e reconciliação de conflitos; esses mecanismos ainda não existem.
10. Para RSVP automático, criar endpoint com tokens limitados a um convite, regras de acompanhantes, proteção contra abuso e política de privacidade. O código manual atual não autentica o convidado.

Supabase/PostgreSQL pode ser avaliado nessa etapa. Nenhum SDK, SQL, segredo ou projeto externo foi configurado agora. A chave administrativa de qualquer serviço jamais deve entrar no frontend ou no Git.

## Validação atual

Os testes cobrem migração, revisões, corrupção, falha de cota, referências, parcelas, totais, agenda, convites e exportações textuais. A compilação TypeScript confere o contrato entre camadas. Permissões/notificações Android precisam ser verificadas em aparelhos reais antes de distribuição definitiva.
