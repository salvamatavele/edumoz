# Spec — Autorização efectiva por pedido

Estado: implementação no âmbito da proposta aprovada e da instrução para prosseguir. Tarefas 1.8–1.9. Mantém o contrato de gestores sem papel configurável e a posse docente/família existente.

## Requisitos

- RF-01: após verificar o JWT, carregar conta activa, estatuto de plataforma, memberships activas em escolas activas e permissões actuais da membership escolhida. Não usar o JWT como fonte final de privilégios.
- RF-02: suspensão/apagamento de conta, suspensão de membership, desactivação de escola e revogação de superadmin devem afectar o pedido seguinte; não manter cache entre pedidos.
- RF-03: escola escolhida sem membership activa não concede contexto; superadmin actual pode escolher escola activa sem membership. Não mudar silenciosamente para outra escola ao perder acesso.
- RF-04: permissões de um papel só são válidas se esse papel pertence à mesma escola; papel vazio ou relação inconsistente nega tudo. A ausência de papel numa membership de gestor válida mantém acesso total, conforme spec existente.
- RF-05: cada action de gestão verifica recurso/acção; páginas e navegação usam `view`. Posse docente/familiar permanece verificada e não é substituída por ser gestor. Gestão de papéis continua reservada a acesso total.
- RF-06: acrescentar `finance` e `scheduling` ao catálogo, com traduções pt-MZ/en e sem conceder essas permissões automaticamente a papéis restritos.
- RF-07: contexto normalizado único conserva as permissões da sessão; nenhum ponto de entrada pode perdê-las ao reconstruir o contexto.
- RF-08: após revogação da escola seleccionada, manter escolha explícita de outra escola autorizada, mesmo quando só resta uma. Não transferir automaticamente a escola activa.

## Abordagem

Loader na fronteira servidor `lib/auth`, com selects explícitos e consulta de identidade global autorizada pelas excepções existentes. O callback JWT Auth.js consulta este loader em cada pedido de sessão; conta inválida devolve token nulo e invalida a sessão. O callback de sessão só propaga os privilégios acabados de validar. O callback de troca de escola actualiza memberships e superadmin antes de resolver a escolha. Permissões vindas do cliente/JWT são ignoradas.

Domínio mantém `hasPermission` puro; `toSessionContext` faz a conversão sem I/O. A memoização, quando necessária, será limitada ao pedido; inicialmente preferir consultas frescas a cache global. DALs internas recebem escola a partir de sessão validada; nenhuma nova API pública de dados sem guarda será criada.

Não alterar Auth.js, passwords, schema ou UI visual nesta entrega. Não adicionar políticas pedagógicas. A revogação vale a partir da leitura de autorização do pedido seguinte, não retroactivamente sobre transacções já em curso.

Mantido o contrato de `openspec/specs/report-cards/spec.md`: professores podem consultar pautas da escola enquanto membros do pessoal. A posse estrita continua nos lançamentos de notas e presenças e na leitura do portal familiar. Restringir pautas docentes por turma seria uma alteração desse contrato, não uma correcção implícita.

## Aceitação

- Testes de integração com MariaDB e fixtures próprias demonstram revogação entre leituras sucessivas sem novo login, superadmin sem membership, escola inactiva, papel alterado e papel de outra escola.
- Testes do callback demonstram ligação ao loader e limpeza de identidade inválida; privilégios do token não se sobrepõem à base.
- Testes de actions demonstram que gestor com `view` não consegue `create`, nem autorização de outro recurso, e que superadmin/gestor sem papel mantêm comportamento.
- Navegação e botões não oferecem acções indisponíveis; pedidos directos continuam recusados independentemente da interface.
- Lint, tipos, suite e build permanecem verdes. Verificação autenticada no navegador faz parte da aceitação transversal 1.14, sem declarar essa tarefa concluída antes de a executar.
