# Spec — Notas e fecho consistente

Estado: tarefa 1.11 da proposta aprovada. Mantém fórmula, arredondamento e política de notas em falta existentes.

## Requisitos

- GI-01: autorizar o docente e os membros no servidor; recusar a submissão inteira se alguma nota enviada para um membro válido estiver fora de [0,maxScore], sem escrever notas ou auditoria de sucesso. Escalas finais continuam a ser normalizadas pelo motor existente; maxScore da avaliação pode diferir de 20.
- GI-02: não criar/alterar avaliações ou notas em trimestre fechado. Validar a escola e ano do trimestre. O feedback é pt-MZ/en e não depende do botão estar escondido.
- GI-03: serializar lançamento/criação de avaliação e fecho pelo agregado Term. Fecho lê plano, notas e esquema dentro da mesma transacção depois de obter o bloqueio. Resultado concorrente: nota incluída se gravada antes do fecho, ou pedido recusado depois. Dois fechos não recalculam silenciosamente.
- GI-04: permitir reabertura apenas com term-closing/edit, escola válida, trimestre fechado e motivo não vazio (10–1000 caracteres). Guardar autoria, motivo e snapshot de cada TermResult anterior na mesma transacção; os resultados antigos permanecem até novo fecho e não aparecem como pauta actual enquanto OPEN. Novo fecho pode recalcular, preservando os snapshots auditáveis.
- GI-05: preservar a identidade do trimestre da avaliação e proteger limites/estado também no MariaDB para as mutações directas de Grade/Assessment. Migrar de forma aditiva, recusando histórico com valores inválidos sem o corrigir automaticamente.

## Desenho

Adicionar Term.revision (contador técnico) e incrementá-lo por update condicionado ao estado no início da transacção; o update mantém o bloqueio de linha até commit. Não reabrir excepções a SQL livre no cliente de escola. Usar RepeatableRead com a primeira operação a adquirir o bloqueio de Term, antes de qualquer leitura do plano, e passar o cliente transaccional às DALs de plano/esquemas; nenhuma leitura do plano fora da transacção de fecho.

Triggers complementares validam score e trimestre nas escritas de Grade/Assessment e fazem leitura bloqueante do Term antes da mutação. Assessment.termId não pode ser transferido para contornar o fecho. Cascatas administrativas de exclusão mantêm as políticas existentes; não existe endpoint de exclusão administrativa nesta entrega. A migração de integridade anterior permanece imutável.

Reabertura através do diálogo existente em Avaliação, conservando os componentes e tokens EduMoz. Motivo obrigatório, estado pendente, erro acessível e refresh após commit. O servidor cria snapshots de resultados em AuditLog com IDs e valores, sem nomes/contactos nem segredos. Operações pesadas de fecho/histórico serão medidas e migradas para jobs recuperáveis no módulo de avaliação; não declarar esse módulo entregue nesta fundação.

## Aceitação

- Testes negativos de nota acima de maxScore, negativa, payload misto e trimestre fechado: nenhum efeito parcial.
- Professor de outro grupo, gestor sem posse, escola B e papel sem edit continuam recusados.
- Concorrência MariaDB de fecho versus lançamento e dois fechos; resultados e auditoria reflectem uma ordem consistente.
- Reabertura sem motivo/permissão ou escola errada recusada; com autorização preserva snapshots e permite nova nota/fecho.
- Testes UI para diálogo/motivo e navegação local de fechar → recusa docente → reabrir → corrigir → fechar; pt/en.
- Suite, lint, tipos, migrações e Turbopack verdes antes de 1.12.

## Aceitação

81 ficheiros/672 testes passaram; bloqueio e ambas as ordens concorrentes verificados em MariaDB; percurso pt/en de nota inválida → nota 15 → fecho → consulta → reabertura motivada → nota 18 → novo fecho confirmou snapshot 15 e resultado 18. Migração aplicada em teste/desenvolvimento após backup. Tipos, lint (dois avisos anteriores) e Turbopack verdes. Evidências em implementation-progress.md. Fechos grandes e interface de exploração do histórico permanecem no módulo de avaliação; esta entrega não declara esse módulo completo.
