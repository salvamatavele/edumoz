# Spec — Integridade de escola e ano lectivo

Estado: desdobramento da tarefa 1.10 da proposta aprovada. Não constitui conclusão da tarefa antes de todos os critérios passarem.

## Requisitos

- TI-01: um cliente de escola não pode transferir registos para outra escola por `create`, `createMany`, `update`, `updateMany` ou qualquer ramo de `upsert`. Valores contraditórios ou operações de atribuição devem falhar antes da escrita, sem serem silenciosamente reescritos.
- TI-02: proibir alteração da relação `school` pelo cliente de escola; a API interna usa `schoolId` explícito. Não permitir `connect`, `disconnect`, nested update ou outras operações relacionais como alternativa à validação do identificador.
- TI-03: todas as referências entre entidades da escola devem pertencer à mesma escola; quando ambas pertencem a ano lectivo, devem corresponder ao ano do agregado. Validar junções, nested writes e leituras de relações, incluindo operações dentro de transacções.
- TI-04: constraints persistentes devem impedir relações inválidas mesmo em concorrência; migrações aditivas devem detectar dados históricos incompatíveis e recusar, sem os corrigir ou apagar automaticamente.
- TI-05: nenhum teste altera dados reais. Usar MariaDB edumoz_test com duas escolas e anos sintéticos, confirmando estado inalterado após cada recusa e rollback de operações compostas.

## Abordagem e entregas

1. Guarda imediata de mutação do tenant na extensão Prisma: validar criação e todos os ramos de actualização; recusar a relação `school`. Esta entrega reduz um vector concreto e não cobre ainda relações a outras entidades.
2. Inventário das relações e junções e escolha explícita de constraints compostas/validação transaccional, incluindo compatibilidade com dados anteriores.
3. Aplicar validação e constraints; ensaiar SQL, relações aninhadas, concorrência e isolamento de leituras. Só concluir 1.10 depois destas entregas.

Não usar validação prévia fora da transacção como única garantia contra referências concorrentes. Não prometer isolamento recursivo apenas por injectar `schoolId` no `where` principal. Modelos globais de identidade continuam a exigir a sua fronteira de autorização específica.

## Aceitação

- Criações e actualizações com schoolId estrangeiro (literal ou `{ set }`), relação `school` e cada ramo de upsert são recusadas; nenhuma linha muda de escola.
- Valores correctos e actualizações sem alterar escola mantêm o comportamento. Os casos anteriores de listagem, contagem e exclusão por escola continuam verdes.
- IDs de escola B e de outro ano em matrículas, grupos, notas, presenças, documentos e finanças são recusados em chamadas directas, nested writes e junções.
- Constraints e testes reais cobrem concorrência e rollback; lint, tipos e regressão completa passam antes da aceitação final.

## Estado da primeira entrega

Guarda de mutação directa implementada em `src/lib/db/tenant.ts`. Casos MariaDB em `tenant.test.ts` verificam valores literais e `{ set }` em update/updateMany/upsert, ramo create incompatível, relação school com connect/update, valores malformados, lote recusado sem escrita, actualizações válidas e rollback transaccional. **21 testes de isolamento passaram**.

Limites ainda abertos: referências a outras entidades; nested writes a modelos da escola a partir de pais; modelos globais expostos pelo cliente; junções sem schoolId; include/select relacional; compatibilidade de anos; constraints persistentes. Nenhuma migração de integridade aplicada nesta entrega. A tarefa 1.10 permanece por concluir.

## Decisão de persistência

Manter as FKs existentes para existência e políticas de exclusão. Acrescentar triggers BEFORE INSERT/UPDATE gerados de schema e âncoras explícitas: 99 comparações de escola/ano e imutabilidade dos IDs e das ligações que definem âmbito. Isto evita duplicar schoolId/academicYearId nas seis junções e em todos os descendentes apenas para construir FKs compostas. A alternativa de validação prévia sem garantia persistente foi rejeitada.

Não se permitem transferências de escola/ano por alteração de PK ou de âncora; é necessário criar o registo no destino pelo fluxo de negócio apropriado. Como o âmbito dos pais não muda, uma leitura de validação não pode ficar obsoleta por transferência concorrente; as FKs continuam a arbitrar existência e exclusão. Não adicionar bloqueios de escola inteira a cada escrita. Cascatas de FKs não executam triggers no MariaDB: os IDs/âncoras são imutáveis antes de qualquer cascata de update; cascatas de delete mantêm as políticas existentes. Documentação consultada: https://mariadb.com/docs/server/server-usage/triggers-events/triggers/trigger-limitations .

A migração exige janela sem escritores: preflight read-only recusa relações inválidas antes de criar triggers. DDL MariaDB não oferece rollback de toda esta sequência; falha parcial exige inspecção e recuperação, nunca `migrate resolve --applied` sem verificar os objectos. Gerador versionado e teste de igualdade impedem deriva entre schema, metadata e SQL.

No cliente de escola: junções são filtradas pelo pai; criação de junções ocorre por escrita aninhada no pai autorizado. Modelos globais de identidade e SQL livre não são acessíveis por este cliente. Catálogo Permission é só de leitura; School é só de leitura e limitada ao id activo. Leitura relacionada de User exige select explícito de id/nome/email/imagem e não permite navegar para outras memberships. Escritas aninhadas são percorridas e scoped, sem aceitar mudança de schoolId ou ligação school. Operações globais continuam numa DAL de identidade autorizada, separada.

## Aceitação final da tarefa 1.10

Implementadas as três entregas. Suite: 79 ficheiros/655 testes passaram; migração com 64 triggers ensaiada em base vazia/histórico sintético e aplicada em teste/desenvolvimento após backup e janela sem escritores. Navegador confirmou criação/matrícula válida, persistência, idiomas e escolas A/B. Ver `implementation-progress.md` para evidências e limites operacionais. Esta aceitação cobre a integridade das entidades existentes; cada novo módulo deve acrescentar as suas relações à fronteira e uma nova migração, sem reescrever esta.


## Fronteira autorizada de identidade M01 — 2026-10-28

As DAL src/features/identity/data/school-users.ts e school-user-status.ts usam o cliente global sob autorização explícita, com predicados escolares fixos e selects mínimos. A consulta não devolve memberships nem códigos de outra escola. A mutação relê actor e concessões, bloqueia a escola na transacção e altera apenas memberships locais; não altera User global. São excepções específicas de lint para administração de identidade, sem relaxar as guardas tenant. Testes cobrem associação partilhada A/B, actor revogado, gestor restrito, último gestor concorrente, conta de plataforma e conta global inactiva.


## Criação e reemissão M01 — 2026-10-29

create-school-user.ts é a nova excepção explícita de identidade global no lint. authorizeSchoolIdentityMutation partilha bloqueio escolar e revalidação persistida de actor/versão/obrigação/permissão com a mudança de estado. A criação só escreve memberships da escola validada e docente local livre; não pesquisa nem liga User por contacto. Reemissão só inicial/exclusiva, com CAS de versão e predicado de memberships novamente na escrita; não toca em contas estabelecidas de outras escolas. Cliente tenant mantém User global inacessível e todos os guards/constraints anteriores. Migrações novas são aditivas, sem reescrever as anteriores.
