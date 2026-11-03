# Sugestões para avaliar

Estas ideias não foram implementadas na versão 2.1.0. A prioridade abaixo considera o benefício para o casal e as dependências necessárias.

| Ordem | Funcionalidade                           | Benefício                                                                               | Esforço / decisão necessária                                                                                                           |
| ----- | ---------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Confirmação online automática            | O convidado responde no link e a família já aparece atualizada, sem copiar código.      | Alto. Precisa de hospedagem pública, banco/API, tokens limitados por convite e proteção contra abuso.                                  |
| 2     | Planejamento compartilhado entre o casal | Os dois celulares acompanham a mesma lista, com responsáveis e histórico de alterações. | Alto. Conta, autorização por planejamento, política de conflito e sincronização offline.                                               |
| 3     | Mapa visual de mesas com capacidade      | Arrastar famílias/pessoas e ver lugares livres ou mesas acima do limite.                | Médio. Definir quantidade/formato das mesas e como acomodar acompanhantes sem nome. A versão atual já permite atribuir e listar mesas. |
| 4     | Importação de convidados por CSV         | Cadastrar listas grandes com prévia, detecção de repetidos e vínculo às famílias.       | Médio. Definir colunas, tratamento de homônimos e revisão antes de salvar.                                                             |
| 5     | Lista de presentes ligada à casa         | Presentes recebidos atualizam quantidades e evitam compras duplicadas.                  | Médio. Definir se será só controle privado ou lista pública. Reserva pública exige backend.                                            |
| 6     | Planejamento financeiro próprio da casa  | Meta separada, preço pago, histórico de compras e comparação de lojas.                  | Médio. Manter pagamentos da casa separados do casamento e definir se haverá comprovantes/parcelas.                                     |

Sugestão: priorizar confirmação online e compartilhamento entre o casal no mesmo backend. Depois, adicionar o mapa de mesas. Nenhum serviço externo, conta ou assinatura paga foi criado para essas ideias.
