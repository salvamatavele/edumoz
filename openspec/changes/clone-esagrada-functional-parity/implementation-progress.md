# Progresso da implementação

## 2026-10-27 — Fundação local

- Aprovação: o utilizador respondeu «sim» à proposta e ao início pela fundação. Não voltar a pedir autorização para trabalho já descrito; esclarecer apenas decisões novas que alterem requisitos.
- Estado inicial do destino: HEAD `dace519`; apenas a spec geral e o change estavam por versionar. O trabalho financeiro que estava solto na exploração anterior já integra este estado; nenhum ficheiro preexistente foi revertido.
- Runtime observado: Node 26.5.0, pnpm 11.21.0, MariaDB 13.0.2; aplicação local em localhost:3000, MariaDB em 127.0.0.1:3306. Origem apenas lida.
- Criada base `edumoz_test` com conta aleatória limitada à base. `.env.test.local` ignorado e modo 0600; nenhum segredo registado aqui. Duas migrações existentes aplicadas com sucesso, sem seed de aplicação.
- Protecções: validação do destino na configuração Vitest e no cliente Prisma em testes; URL separada explícita, loopback e nome/conta reservados, sem opções; configuração unitária sem `.env` ou acesso a base real.
- `database-safety.test.ts`: 16 casos passaram; chamada `TEST_DATABASE_URL= npm test -- src/test/database-safety.test.ts` recusada no arranque, antes dos testes, como esperado.
- Primeira suite limitada a dois workers: 70 ficheiros/479 testes passaram; apenas `schedule.integration.test.ts` falhou porque dependia de `EPC-MAPUTO` semeada. Corrigido para criar os próprios fixtures sintéticos e limpar pelo seu âmbito; os cinco testes desse ficheiro passaram depois da correcção.
- `test-isolation.test.ts`: dois testes passaram, incluindo recusa por MariaDB de SQL directo para `edumoz.School` com `LIMIT 0` (nenhum registo de desenvolvimento consultado).
- Ensaio de recuperação: `.local/recovery/3082e9a308967c8c/report.json`; restaurados dump AES-256-GCM e anexo sintético. Conferidas 44 tabelas, colunas, contagens e fixture. Base restaurada `edumoz_test_restore_3082e9a308967c8c` retida para inspecção. Chave local do ensaio não constitui estratégia de chaves para produção.
- Lint: zero erros e dois avisos preexistentes de compatibilidade React Compiler (TanStack Table/react-hook-form). Typecheck passou após configuração de segurança e fixture de horários.
- Navegador: entrada pt-MZ e en acessíveis e tradução de «Sign in to EduMoz» observada; não foram testados ainda percursos autenticados, módulos ou impressos. Indicador de issue do Next observado, ainda por diagnosticar.
- Build: output de produção isolado em `.next-production` para não substituir o desenvolvimento. Primeira tentativa bloqueada pelo acesso de rede às fontes Google. Segunda tentativa com autorização chegou a uma falha Turbopack ao abrir uma porta interna (`EPERM`). A execução alternativa `npm run build -- --webpack` foi recusada pela autorização de ferramentas e não foi executada. O impedimento foi resolvido após o pedido explícito do utilizador para corrigir o build, conforme a verificação abaixo.
- Suite final após corrigir o fixture e acrescentar testes de isolamento: **72 ficheiros, 486 testes passaram**, sem skips, em 86,87 s. Nenhum teste executado na base de desenvolvimento.
- Inventário reconciliado por caminhos e dependências em `source-map.md`: 792 ficheiros, zero divergências de hash desde a proposta. A rastreabilidade fina por campo/fluxo continua obrigatória em cada módulo.

## Próximo ponto de continuação

Referência histórica após a primeira entrega: 1.1–1.6 concluídas. A continuação actual está registada no fim deste documento. Procedimentos locais em `docs/local-development.md`.

## 2026-10-27 — Resolução do build Turbopack

- Investigado o panic log: erro `EPERM` ao criar o socket local do worker PostCSS, não erro de sintaxe de CSS. Um ensaio isolado confirmou que sockets locais funcionam no processo autorizado.
- A CLI directa instalada (`EDUMOZ_PRODUCTION_BUILD=1 node node_modules/next/dist/bin/next build`) completou o build com Turbopack.
- Guardada a cache anterior em `.local/turbopack-cache-before-validation` e repetido o comando habitual `npm run build` com cache nova e autorização de execução: **exit 0**, compilação em 20,3 s, TypeScript em 9,2 s, geração de 35/35 páginas concluída. Não foi usado Webpack.
- Mantida a inclusão dos tipos gerados de `.next-production` em `tsconfig.json`, acrescentada pelo Next. Nenhum reset de base, alteração de layout ou interrupção do servidor de desenvolvimento foi necessário.

## 2026-10-27 — Design e autorização efectiva (1.7–1.9)

- 1.7: MASTER visual reconciliado com CSS, Lexend/Source Sans 3 e temas existentes após leitura das skills de UI. Sem mudança dos tokens de runtime.
- 1.8: spec detalhada em `docs/specs/esagrada-authorization.md` e deltas OpenSpec. Loader recarrega conta, memberships, escola activa, superadmin e grants em cada pedido de sessão. Papel inconsistente falha fechado; conta inactiva invalida sessão; privilégios enviados pelo cliente não concedem acesso.
- 1.9: contexto normalizado conserva grants; 23 actions académicas/financeiras verificam recurso/acção. Páginas e navegação usam `view`, formulários e operações distinguem `create` e `edit`. Gestão de papéis continua reservada a acesso total; posse docente/familiar existente preservada.
- Catálogo alargado a finance/scheduling (oito permissões). Migração aditiva e idempotente aplicada com êxito em edumoz_test e desenvolvimento; não atribui grants a papéis existentes.
- Ensaios novos: 10 casos de sessão com MariaDB; 5 callbacks; 22 chamadas directas de escrita recusadas para gestor só de leitura antes de acesso a dados; 10 páginas directas recusadas antes de consultas; navegação, botões, cookies fragmentados e recuperação do selector.
- Navegador: instância de produção localhost:3011, exclusivamente edumoz_test, sem Docker. Login pt/en, Alice só em A, Beatriz só em B, finanças só visíveis em B e sem criação; mudar B → A numa página financeira negou leitura. Suspender A afectou o próximo pedido sem novo login; escolher B recuperou acesso. Conta e escolas sintéticas removidas e servidor temporário parado.
- Evidências locais ignoradas em `.local/evidence/authorization-school-a-finance-denied.png`, `authorization-school-b-recovered.png`, `authorization-school-b-en.png`. Não contêm dados reais.
- Regressão final: **78 ficheiros/548 testes passaram**, sem skips, em 125,67 s; tipos e build Turbopack passaram (35/35 páginas). Lint: zero erros, dois avisos preexistentes React Compiler. OpenSpec validado com `--strict`.
- Tarefas 1.1–1.9 concluídas: **9/313**; restante programa pendente.

### Ponto de continuação

1.10 — proteger referências, junções, nested writes, updates e upserts entre escolas/anos. A04 permanece aberta; A02/A03 (notas/fecho), A05/A06 (concorrência financeira) e A15 (retorno do login) permanecem pendentes nas respectivas tarefas. Nenhum módulo M01–M15 aceite e 1.14 ainda pendente.

## 2026-10-27 — Início da integridade de tenant (1.10, parcial)

- Spec detalhada em `docs/specs/esagrada-tenant-integrity.md`; parent 1.10 não marcado como concluído.
- Corrigido vector directo: extensão não validava dados de update/updateMany nem ramo update de upsert. Agora recusa mudanças de schoolId, inclusive `{ set }`, criação malformada e operações relacionais `school`. Incluída guarda de updateManyAndReturn para completude da fronteira, embora o provider actual não ofereça esse método.
- 21 testes MariaDB de isolamento passaram, incluindo rollback transaccional e manutenção dos dados após recusa. Sem migração de schema ou alteração de registos reais.
- Pendentes as referências a outras entidades, junções, nested writes recursivos, anos e constraints. A04 permanece aberta até estes caminhos serem protegidos e testados.
- Regressão após a guarda de tenant: **78 ficheiros/557 testes passaram**, sem skips, em 124,30 s. Build Turbopack com TypeScript e 35/35 páginas passou; lint sem erros, com os dois avisos preexistentes. OpenSpec validado novamente com `--strict`.
- Continuação exacta: terminar TI-03/TI-04 da spec de integridade antes de avançar para 1.11. O programa mantém **9/313 tarefas concluídas**, com 1.10 parcialmente implementada.

## 2026-10-27 — Integridade de tenant concluída (1.10)

- Inventário gerado de schema: 99 comparações de referências; 64 triggers BEFORE INSERT/UPDATE em 38 modelos, com IDs e âncoras de escola/ano imutáveis. FKs existentes mantêm existência e políticas de exclusão. SQL e metadata têm teste de sincronização; o gerador recusa sobrescrever uma migração aplicada divergente.
- Cliente Prisma percorre escritas/leituras relacionadas; filtra as seis junções por pai; exige criação das junções pelo pai scoped; proíbe SQL livre e operações globais de identidade. User relacionado exige select seguro, sem navegação a outras memberships. Permission só de leitura, com contagens inversas scoped; School limitada ao id activo.
- Presenças gravam upserts de registos através da sessão autorizada. Matrículas validam aluno/turma/percurso e ano no servidor com erros de campo; garantias persistentes continuam a arbitrar corridas.
- 98 testes novos de integridade (86 variações de referências entre escolas/anos, metadata, guards instalados, junções/contagens, nested writes, identidade global, concorrência e cinco submissões de matrícula forjadas); suite total: **79 ficheiros/655 testes passaram**, sem skips, em 95,66 s. Tipos, lint (zero erros/dois avisos anteriores) e build Turbopack passaram.
- `npm run db:test:integrity` ensaiou base descartável: histórico incompatível recusado antes de instalar triggers, sem reescrever registos; histórico válido preservado, 64 guards instalados e escritas válidas/forjadas verificadas. Base e concessões temporárias removidas. Relatório em `.local/evidence/tenant-migration-report.json`.
- Migração aplicada primeiro em edumoz_test. Antes da aplicação em edumoz foi guardado e conferido backup AES-256-GCM em `.local/backups/before-tenant-integrity-1793132632429` (modo 0600, ignorado; chave local não equivale a gestão de chaves de produção). Servidor local parado para janela sem escritores; preflight de edumoz passou e a migração foi aplicada sem alterar registos históricos. Servidor reiniciado na porta 3000 sem Docker.
- Navegador de produção isolado em edumoz_test: criação de Carla Browser Integrity e matrícula válida em A, persistência após reload, leitura pt/en e troca para B mostrou apenas Beatriz. Leituras de académico, professores, avaliação, horários, finanças e configuração passaram. Evidências `.local/evidence/tenant-enrollment-persisted.png`, `tenant-school-b-isolated.png`, `tenant-browser-read-checks.json`. Fixtures e servidor temporário removidos após ensaio.
- Descoberta de tradução no filtro financeiro: `common.selectPlaceholder` inexistente; corrigido para `form.selectPlaceholder`. Testes do painel financeiro passaram.
- Estado: **10/313 tarefas concluídas**. Próxima: 1.11 (notas e fecho concorrente). Nenhum módulo M01–M15 aceite.

## 2026-10-28 — Integridade de notas e fecho (1.11)

- Spec detalhada `docs/specs/esagrada-grade-integrity.md` e deltas grade-entry/term-closing, no âmbito aprovado. Grade.score validado contra maxScore antes de qualquer escrita; lote inválido faz rollback inclusive do contador técnico. Criação/alteração de avaliação também verifica trimestre, escola/ano e posse.
- Term.revision permite adquirir bloqueio de linha por update atómico condicionado ao estado, sem abrir SQL livre ao cliente de escola. Fecho lê plano/notas/esquemas dentro da transacção RepeatableRead após o bloqueio. Corridas determinísticas confirmaram ambas as ordens: nota incluída quando confirmada primeiro; lançamento recusado quando o fecho detém primeiro o bloqueio. Dois fechos só materializam uma vez.
- Seis triggers adicionais reforçam Grade/Assessment no MariaDB: estado aberto, score [0,maxScore], máximo positivo e não inferior a notas persistidas; termId da avaliação imutável. Políticas administrativas de cascata de exclusão existentes preservadas. Preflight recusa histórico numérico incompatível sem o reescrever.
- Reabertura exige term-closing/edit e motivo de 10–1000 caracteres. Snapshots dos TermResult anteriores e autoria/motivo ficam na auditoria da mesma transacção; pauta e portal não publicam resultados enquanto reaberto. Grelha de trimestre fechado fica em consulta, mesmo para o docente dono.
- Suite: **81 ficheiros/672 testes passaram**, sem skips, em 112,02 s; testes de concorrência determinísticos, reabertura, posse/permissão, escola B, triggers e quatro percursos de diálogo. Tipos e build Turbopack passaram; lint sem erros e com dois avisos anteriores.
- Navegador com conta sintética de gestor e perfil docente próprio: nota 25 recusada (máximo 20); nota 15 guardada; fecho en; grelha em consulta; reabertura pt com motivo; correcção para 18; novo fecho pt. Conferência da base isolada: status CLOSED, Grade.score=18, TermResult.average=18, snapshot anterior=15. Evidências `.local/evidence/grade-out-of-range-en.png`, `grade-closed-readonly-en.png`, `term-reopen-reason-pt.png`, `grade-browser-result.json`. Fixture removido após ensaio.
- Migração aplicada em teste e em desenvolvimento, com janela sem escritores e novo backup AES-256-GCM verificado em `.local/backups/before-tenant-integrity-1793163576460`. Aplicação reiniciada na porta 3000 sem Docker. Nenhum valor de nota anterior foi alterado pela migração.
- Estado: **11/313 tarefas concluídas**. Próxima: 1.12 (idempotência e concorrência financeira). Nenhum módulo M01–M15 aceite.


## 2026-10-28 — Integridade financeira (1.12)

- Spec detalhada `docs/specs/esagrada-financial-integrity.md` e delta financial-concurrency. GenerationKey única por escola/tabela/matrícula/período; contador de referência por escola, acima do histórico, com bloqueio explícito e retry limitado. Números consumidos em transacção independente não são reutilizados; lacunas são possíveis e documentadas.
- Intenção UUID obrigatória em pagamentos manuais/móveis, isolada por escola e tipo, mantida pela interface após falhas. Repetição equivalente não duplica; parâmetros divergentes recusados. Bloqueio da factura antecede leitura/transição/soma/auditoria. Resposta atrasada não revive estorno. Contacto com operador fora de transacção, com tentativa INITIATED persistida antes; segunda intenção móvel pendente recusada.
- Simulador respeita idempotência e recusa referências desconhecidas; permanece em memória, sem integração real. Vencimento dia 31 em Fevereiro é limitado ao último dia do mês. Campos financeiros de Payment e chave da factura protegidos por triggers.
- Quinze testes de concorrência MariaDB incluem 24 alocações paralelas, geração duplicada, saldo de pagamentos distintos, chave reutilizada noutra factura, gateway retido por barreira enquanto outra escrita confirma, confirmação/reversão concorrentes e resposta obsoleta após estorno. Componentes verificam retenção de intenção após falha e mensagem de erro na confirmação.
- Regressão: **85 ficheiros/703 testes passaram**, sem skips, em 134,04 s. Tipos e build Turbopack passaram (35/35 páginas); lint sem erros e com dois avisos preexistentes. Ensaios de migração tenant/financeira passaram em bases descartáveis: duplicados, linhas ambíguas e pagamentos zero recusados sem reescrever histórico; referências/valores/hash UTF-8 preservados. Relatórios emitidos apenas após remoção das bases temporárias.
- Navegador em edumoz_test: gerar factura de 100 MT; repetição não cria outra; pagamento manual 40 MT; móvel simulado 60 MT pendente na primeira consulta e confirmado na segunda; saldo 100; estorno móvel com motivo devolve saldo a 40 e mantém histórico. Conferidos pt/en, vencimento 2026-02-28 e uma auditoria por transição na base. Evidências `.local/evidence/financial-reversal-pt.png`, `financial-reversal-en.png`, `financial-browser-result.json`. Fixtures e servidor de teste removidos.
- Migração aplicada em edumoz após backup AES-256-GCM verificado `.local/backups/before-tenant-integrity-1793165548534`, com servidor parado. Preflight passou; nenhum histórico incompatível foi corrigido automaticamente. Servidor reiniciado em localhost:3000 sem Docker.
- Descoberta A17: link para pagamentos actualiza query sem seleccionar separador numa navegação cliente; abrir o separador manualmente funciona, reload aplica initialTab. Corrigir antes da aceitação funcional; não constitui divergência de saldo.
- Estado: **12/313 tarefas concluídas**. Próxima: 1.13 (fronteiras de segurança). Nenhum módulo M01–M15 aceite.


## 2026-10-28 — Fronteira de pedidos (1.13, parcial)

- Spec `docs/specs/esagrada-request-security.md` detalha redirects, origem/CSRF, cache, storage, cabeçalhos, logs e limites; parent 1.13 continua por concluir. Consultados os guias locais desta versão Next sobre segurança de dados, Server Actions e headers.
- RS-01/A15 corrigido: destino de login numa allowlist derivada das rotas protegidas traduzidas; recusa absoluto, protocol-relative, backslash, controlos/whitespace, caminhos percent-encoded ou dot segments e páginas desconhecidas. Preserva parâmetros e fragmento de destino válido. Google e credenciais partilham a mesma variável validada; autorização no destino mantém-se.
- Testes: 41 variações de domínio e sete de formulário. Regressão integral **87 ficheiros/751 testes passaram**, sem skips, em 139,74 s. Typecheck, lint (zero erros/dois avisos anteriores) e build Turbopack (35/35 páginas) passaram.
- Navegador de produção isolado: URL absoluta hostil no login en regressa a /en/students; protocol-relative no login pt regressa a /alunos; /en/students?q=Alice preservado após login. Conta de gestor só de leitura, duas escolas sintéticas; sem contacto com Google ou destino externo. Evidências `.local/evidence/login-safe-fallback-en.png`, `login-safe-fallback-pt.png`, `login-safe-valid-en.png`, `login-destination-checks.json`. Fixtures próprias removidas e servidor de teste parado.
- Inventário actual: um Route Handler Auth.js; não encontrados endpoints de upload nem cache persistente privada em src. Isto não demonstra segurança das futuras funcionalidades. A18 regista ausência de limitação no provider Credentials.
- Continuação: concluir RS-02–RS-06 (origem/limites/cabeçalhos/logs/cache/storage) e respectivos ensaios antes de marcar 1.13; depois 1.14 e módulos M01–M15. A17 do separador financeiro permanece registada. Estado **12/313 tarefas concluídas**.


## 2026-10-28 — Comparação directa solicitada pelo utilizador

- O utilizador assinalou distância entre o EduMoz e os fluxos reais do esagrada-next e pediu executar a origem em Docker para comparar lado a lado. Prioridade actual: observar e mapear os fluxos reais antes de continuar a declarar equivalência funcional.
- Docker Desktop iniciado; não havia containers esagrada existentes. Criada pilha independente edumoz-esagrada-comparison, snapshot da working tree da origem pelo seu Dockerfile, sem reutilizar .env/dados/volumes. MariaDB 11.4, 70 migrações e seed próprio com administrador aleatório; 96 tabelas confirmadas. Fonte em localhost:3002; EduMoz idêntico ao build actual em localhost:3011 sem Docker, só edumoz_test com duas escolas sintéticas. Instâncias mantidas para comparação, sem alterar funcionalidades nesta entrega.
- Diferença observada: ficha origem com sete secções e catálogo de 48 campos versus seis controlos no modal EduMoz. Comportamento pai → encarregado preenchido automaticamente confirmado; procura por código e consentimento visíveis. Cadastro incremental nome/turma difere da obrigatoriedade de código/nascimento/sexo do destino. Pautas/documentos têm vários fluxos distintos. Tesouraria exige configuração anual antes de gerar cobranças.
- Report detalhado, limites, evidências e como retomar em `docs/comparisons/esagrada-edumoz.md`. Fotografias/anexos, regras financeiras completas e impressos continuam por ensaiar. Contagem técnica de testes não equivale a paridade operacional. Estado inalterado: 12/313; nenhum módulo M01–M15 aceite.


## 2026-10-28 — Prioridade: corrigir o existente

Pedido explícito do utilizador aplicado sem avançar novos módulos. Correcções e limites em `docs/specs/esagrada-existing-corrections.md`; A17–A24 registadas no inventário de anomalias. Regressão final: **98 ficheiros / 845 testes**, 138,83 s; build Turbopack e typecheck passam, lint sem erros e um aviso TanStack conhecido. Auditoria de produção: zero alertas conhecidos. Ensaios de migração tenant/financeiros passam com Prisma actualizado.

Navegador de produção isolado em edumoz_test confirmou telefone sem e-mail, deduplicação e troca de escolas A/B, mapa → Pagamentos, registo sintético 40/100 MT e recibo, idioma preservando factura, presenças submetidas/reabertas e novamente submetidas, onze falhas de login com orçamento limitado a dez. Snapshot/auditoria em `.local/evidence/existing-review-browser-result.json`; imagens e logs no mesmo directório. Migração aditiva AuthThrottle aplicada ao edumoz após backup cifrado verificado; servidor local reposto em localhost:3000 sem Docker.

Parent 1.13 e matriz geral continuam abertos até a sua aceitação completa. Estado **12/313**; não declarar os módulos M01–M15 equivalentes ao esagrada-next. Esta revisão não substitui a comparação operacional integral.

### Continuação de 2026-10-28 — finanças e horários existentes

A25/A26 corrigidas sem novos módulos: filtros financeiros preservados e período validado, colocação de horários serializada por ano para impedir colisão de aluno que não é abrangida pelos índices de docente/sala/grupo. Teste com barreira falhou antes (duas colocações aceites) e passou após a correcção (uma aula e um conflito). Docente/sala inactivos e remarcação inexistente são recusados sem escrita/auditoria.

Regressão final **98 ficheiros / 862 testes**, 136,84 s. Build Turbopack e tipos passaram, lint zero erros/um aviso conhecido. Navegador de produção, só edumoz_test: mapa → conta → pagamentos → mapa com contexto mantido; período NaN recusado; remarcação gravada e leitura pt/en de horários confirmada. Evidências e limites na spec de correcções. O 404 localizado foi depois corrigido e verificado na nota final abaixo. Estado inalterado **12/313**; 1.13/1.14 e paridade M01–M15 não aceites globalmente.


Verificação final: A27 fecha o 404 em inglês nos percursos localizados; navegador pt/en e retorno /en confirmados. Suite **99 ficheiros / 864 testes**, 150,13 s; build/typecheck passam e lint sem erros/um aviso conhecido. Dez testes das fronteiras HTTP reais passaram, sem credenciais ou mutações de negócio. Inventário de endpoints/cache/storage registado. Capturas e relatórios em `.local/evidence/`, detalhes na spec de correcções. Contagem de tarefas permanece 12/313: não se aceita a fundação inteira por corrigir estes defeitos, nem se declara paridade dos módulos.


## 2026-10-28 — Fundação aceite, M01 preparado

- 1.13 consolidada com inventário e fronteiras efectivamente existentes. Clarificação alinhada com RS-04/KISS: não criar endpoint de upload sem consumidor; armazenamento privado com testes é pré-requisito explícito do primeiro consumidor M01/M02, sem afirmar entrega dessa funcionalidade.
- 1.14 concluída: contas de leitor restrito A/B e encarregado A em edumoz_test; navegador de produção em desktop e 390×844, pt/en, menus restritos, acesso directo proibido, consulta sem edição/reabertura, mudança de escola e recusa de factura/recibo de A em B. Família recebe só a própria educanda mesmo com ID estrangeiro. Zero avisos/erros de consola no percurso familiar verificado; zero auditorias de escrita das contas restritas. Evidências foundation-acceptance-browser.json, foundation-restricted-write-check.json e capturas foundation-*. Viewport reposto.
- A28 corrigida: texto de consulta de presenças não inventa vínculo de director de turma. Regressão **99 ficheiros/864 testes**, 132,06 s; build Turbopack e tipos passam. Dez verificações HTTP do build final passam. Não se alteraram regras/permissões nesta correcção textual.
- M01: 65 fontes com hashes, nove perfis/55 permissões, formulário e matriz observados na origem sem gravações. Contrato docs/specs/esagrada-m01.md, mapa de permissões e deltas OpenSpec preparados; aprovação solicitada e ainda pendente. Tarefas 2.1/2.2 não marcadas como concluídas; nenhum código funcional novo de M01.
- Estado **14/313**. Nenhum módulo M01–M15 foi aceite como equivalente. Sem nova migração, seed/reset ou alteração de dados da origem.


## 2026-10-28 — M01 aprovado; consulta e estado escolar entregues

- Aprovação explícita recebida para docs/specs/esagrada-m01.md; tarefa 2.2 concluída. Progresso global: **15/313**; M01 permanece parcial.
- Implementada lista de contas da escola, filtros SQL e paginação de 25, selects mínimos sem hashes, contactos, papéis e códigos das fichas locais. Activação/suspensão altera apenas memberships da escola, mantém conta global e outras escolas, relê permissões persistidas, serializa administração pela escola, protege contas de plataforma e último gestor e regista auditoria. Acções de criação/eliminação não são anunciadas no catálogo enquanto não existem.
- Migração aditiva 20261028040000_school_user_permissions ensaiada duas vezes em base descartável com histórico e identificador existente; preservou grants e não atribuiu users/edit. Aplicada em teste e desenvolvimento; Prisma confirma oito migrações actualizadas. Backup cifrado local verificado antes da aplicação; servidor normal reposto em localhost:3000, sem Docker.
- Suite final **101 ficheiros / 887 testes**, 284,59 s, todos verdes; tipos e build Turbopack passam. Lint: zero erros, um aviso TanStack conhecido. Uma execução anterior concorrente com build excedeu timeout num teste existente; suite isolada e execução final completa passaram sem aumentar timeout.
- Navegador de produção isolado em localhost:3011: 27 resultados atravessam duas páginas; conta partilhada apresenta apenas códigos A/B respectivos; suspensão de dois vínculos A preserva B e identidade global; reactivação persiste; auto-suspensão revoga acesso no mesmo JWT; último gestor não pode ser suspenso. Leitor sem concessão recebe negação; após concessão explícita users/view, consulta sem controlos de alteração, em inglês e móvel 390×844, sem scroll horizontal.
- Corrigidas anomalias observadas: selector de escola usava cache da sessão após revogação; passou a receber contexto efectivo do servidor. Fecho do diálogo foi traduzido e recebeu alvo de 44px; contagens usam pluralização pt/en.
- Evidências locais: .local/evidence/m01-users-full-tests.log, m01-users-build.log, m01-users-types.log, m01-users-lint.log, m01-permission-migration.json, m01-users-browser-final-state.json e capturas m01-*.png. Fixtures sintéticas restauradas activas; origem não alterada.
- Continuam pendentes criação/convites, credenciais aleatórias, edição de identidade, retirada da associação e restantes requisitos M01. Sem upload novo nem aceitação de módulos M01–M15.


## 2026-10-28 — dependência de credenciais: troca própria e versão global

- Antes de emitir credenciais, fechada a ausência de revogação de sessões após mudança de palavra-passe. Escopo detalhado no contrato aprovado M01: somente o titular, actual obrigatória, nova de 12–128 caracteres e confirmação, sem normalizar/truncar. Contas Google sem password local não recebem uma por este fluxo. Nenhuma permissão administrativa nova.
- User.authVersion com default zero preserva contas/hashes e sessões legadas até à primeira troca. JWT compara versão persistida e ignora valores de actualização do cliente. Login por credenciais transporta a versão da leitura verificada; mudança concorrente não pode emitir sessão renovada indevidamente. A troca usa compare-and-swap, incrementa versão, remove sessões do adaptador e grava apenas auditoria global redigida. O fluxo mantém orçamento persistente de tentativas.
- Migração 20261028050000_user_auth_version ensaiada em base descartável com contas locais/Google anteriores e novas, preservando os dados. Aplicada em edumoz_test e edumoz após backup cifrado byte-verificado .local/backups/before-tenant-integrity-1793195521729. Servidores locais repostos: desenvolvimento 3000 e produção de teste 3011. Origem intocada.
- Suite completa **105 ficheiros/912 testes**, 264,67 s; tipos e build Turbopack passam; lint zero erros/um aviso TanStack conhecido. Cinco ficheiros/32 testes focados de UI/domínio/actions/callback e dois ficheiros/18 testes integrados passaram antes da regressão. Corrigido o setup do teste que devolvia por engano a função mock como cleanup Vitest; nenhum timeout aumentado nem teste omitido.
- Navegador: formulário pt/en, desktop e 390×844 (clientWidth=scrollWidth=375), três campos ocultos e validação obrigatória; gestor/docente e A/B. Conta sintética dedicada teve credencial trocada pela DAL; navegador recusou o JWT anterior e a password antiga, aceitando a nova. Vínculos A/B permanecem activos; auditoria contém apenas sessionsRevoked. Consola sem erros/avisos. A submissão do formulário de troca é coberta por componente/integração e não foi executada no navegador.
- Evidências: .local/evidence/m01-password-{unit,integration,full-tests,types,lint,build}.log, m01-auth-version-migration.json, m01-password-final-state.json e capturas m01-password-*.png.
- **15/313** tarefas gerais continuam concluídas: 2.3/2.4/2.5 são tarefas amplas e permanecem abertas. Troca própria é subentrega; emissão/expiração/obrigação de credenciais iniciais, criação/convites, recuperação e restantes requisitos M01 continuam pendentes. Nenhum módulo integralmente aceite nesta continuação.


## 2026-10-29 — criação de contas e credenciais iniciais

- Entrega M01-USERS-CREATE parcial: nome/contactos opcionais, papéis base existentes múltiplos, vínculo por código docente local/livre; criação User/memberships/vínculo/auditoria em transacção. Código EDU-… único permite conta sem email/telefone. Actor relido sob bloqueio escolar; users/create não é concedida a papéis restritos automaticamente; criador restrito não gere gestores. Campos forjados de escola, hash, activação e plataforma são ignorados.
- Contactos de comunicação novos não são identificadores de autenticação nem chaves únicas: evitam oráculo de existência de contas noutras escolas. Contas/telefones/emails legados mantidos; novo titular entra pelo código. Sem associação automática ou herança por contacto. Convite e verificação continuam pendentes.
- Segredo inicial de 32 bytes, Argon2, 24h, uma apresentação e idempotência por escola/actor/requestId. Reemissão explícita somente antes da activação, com conta activa/exclusiva, preserva código e revoga segredo/sessões. Digest de pedidos na auditoria mantém idempotência após reemissões posteriores. Obrigações e validade são persistidas e verificadas pelo servidor, incluindo corrida com substituição. Convite não liga outra escola antes da substituição inicial.
- auth() suprime escola, papéis, memberships e privilégios da sessão inicial; shell apresenta somente o formulário de substituição, incluindo acesso directo a Finanças. Novas sessões Auth.js configuradas para oito horas; contexto principal determinístico por papel base. Perfil configurável/união das 55 capacidades permanece pendente.
- Limites persistentes separados por finalidade para login/criação/troca; formatos equivalentes de telefone partilham o orçamento de login. Teste de limpeza corrigido para isolar os seus dados não confirmados numa transacção; mantém verificação de exactamente 100 exclusões e 20 restantes, sem interferência de manutenção concorrente. Nenhum timeout aumentado nem teste omitido.
- Migrações 20261029000000_initial_school_credentials e 20261029010000_unverified_account_contacts ensaiadas com histórico e base descartável; preservaram hashes, identificadores legados, grants e IDs de permissões existentes. Aplicadas em edumoz_test/edumoz (onze migrações) após backups cifrados byte-verificados .local/backups/before-tenant-integrity-1793257721311 e before-tenant-integrity-1793259954085. Sem Docker no EduMoz, reset ou alteração da origem. Servidores repostos em 3000 e 3011.
- Navegador: criação efectiva em escola sintética A, dois papéis, sem contactos, vínculo docente, entrega oculta e remoção ao fechar; persistência/código/estado inicial; ausência em B. Reemissão e substituição pela DAL da fixture, seguidas de login inicial limitado, JWT anterior revogado, segredo anterior recusado e novo login docente. Conta activada perde o botão de reemissão. Leitor: zero controlos de criação/alteração. Formulário final pt/en, desktop e 390×844, rolagem interna sem overflow da página. Submissão de troca/reemissão coberta por componentes/integração, sem automatizar nova password no navegador.
- Validação final **111 ficheiros/1001 testes**, 205,55 s; tipos e build Turbopack passaram; lint zero erros/um aviso TanStack conhecido. Evidências .local/evidence/m01-create-*.log/png/json, m01-initial-migration.json e m01-contact-migration.json. Fixture final: duas memberships A activas, ficha docente A, authVersion=2, obrigação limpa e auditoria sem segredo. Credenciais reais intactas.
- Tarefa 2.5 subdividida em seis subitens para reflectir consulta, estado, criação e pendências; progresso **18/318**. M01 continua parcial: edição/retirada, convite/prova, funcionário, nove perfis/excepções, recuperação, QR, lotes e impressos por concluir. Nenhum módulo M01–M15 aceite como equivalente.

### Fecho da verificação entre separadores — 2026-10-30

Criação e suspensão com formulário da escola A foram recusadas após mudar a sessão para B. O navegador apresentou o erro de contexto e a verificação MariaDB confirmou ausência de novas contas, alterações de vínculos e auditorias de estado. Reposição da escola A concluída. Suite final: 111 ficheiros/1001 testes, 205,55 s; tipos/build aprovados, lint sem erros (um aviso TanStack conhecido). Progresso mantém 18/318 tarefas; M01 continua parcial.

### Edição de identidade exclusiva — 2026-10-30

- Entregue 2.5.4.1: nome e contactos de comunicação, carregados por acção autorizada apenas ao abrir o diálogo. Alvos partilhados/externos/plataforma recusados sem detalhes; gestores protegidos perante actor restrito. Identificadores de entrada, versão de autenticação, credenciais, vínculos, estado e papéis preservados. Sem migração ou alteração da origem.
- Revisão updatedAt do snapshot evita perda de alterações; gravação condicional, releitura de autoridade e auditoria com changedFields na mesma transacção. Contactos não verificados não associam identidades nem servem para login; a lista prefere contactos de comunicação quando presentes.
- 114 ficheiros/1026 testes passaram (207,67 s), incluindo integração MariaDB com concorrência, partilha A/B, actor revogado, payload forjado e auditoria sem contactos. Tipos/build Turbopack passaram; lint zero erros/um aviso TanStack conhecido.
- Navegador em edumoz_test confirmou gravação e persistência, login/acesso preservados por verificação independente, conta ausente em B, recusa de edição partilhada, formulário A recusado após sessão B e leitor sem botão Editar. pt/en, claro/escuro e móvel 390×844 sem overflow horizontal. Credenciais e dados reais intactos. Evidências .local/evidence/m01-edit-*.
- Progresso 19/319 após subdivisão explícita de 2.5.4; M01 permanece parcial. Vínculos profissionais/docente-funcionário, convites, perfis, recuperação, QR e impressos continuam pendentes.

### Vínculo docente local — 2026-10-30

Implementado em identity/{domain,data,actions,ui}/school-user-teacher-link*: carga mínima por pedido, procura por código exacto no índice escolar, prévia nome/código, confirmação e troca/desligação condicionais. Não existe lista global ou associação por contacto/nome. Conta partilhada pode gerir somente a relação da escola actual; users/edit e autoridade persistida são relidos em cada passo. Ligar exige papel TEACHER activo e ficha activa livre. Desligar continua disponível para retirar uma ligação já existente após suspensão do papel. Sem concessões de papéis ou alteração de User.

Revisão das memberships locais e timestamps monotónicos impedem sobrescrita, incluindo ciclo ligar/desligar depois de snapshot nulo. Ambas as pontas e auditoria com IDs locais integram uma transacção; ficha ocupada/desactivada/externa e contexto alterado recusam sem remover a ligação anterior. Acesso docente resolve a nova ficha no pedido seguinte. Nenhuma ficha, aula ou nota é apagada.

O navegador confirmou substituição, desligação e reposição da ficha original da conta sintética partilhada. Verificação independente em edumoz_test confirmou escola B, identidade global, papéis/estados e ambas as fichas preservados, com exactamente três auditorias locais. Recusas de código externo e confirmação A→B não acrescentaram alterações. Prévia pt/en, móvel 390×844 sem overflow, leitor com zero botões de vínculo e consola sem erros. Evidências .local/evidence/m01-teacher-link-*.

Sem migração nesta subentrega. Ficha/vínculo de funcionário continua pendente; não há Staff no destino e não foi criada uma tabela sem consumidor. A diferença entre esta entrega docente e o contrato profissional completo permanece explícita.

Aceitação desta subentrega docente: **117 ficheiros/1055 testes**, 204,55 s, todos verdes. Tipos e build Turbopack passaram; lint sem erros, um aviso TanStack conhecido. Os testes de interface esperam explicitamente pelo fim das transições antes de clicar/avaliar os controlos; não foram introduzidos sleeps, skips ou aumento de timeout. Hashes da origem administration.ts e user-dialogs.tsx conferidos com o inventário existente. Progresso **20/320** após subdivisão explícita; M01 não aceite na íntegra.

### Funcionários e acumulação profissional — verificação concluída, 2026-10-30

- Ficha Staff escolar com os campos profissionais da origem, consulta paginada/filtros SQL, criação idempotente e edição com revisão. Identificadores/documento/NUIT/notas não saem na listagem. Função profissional não concede papéis. Repetição com conteúdo diferente recusa sem duplicar ou confirmar dados não gravados.
- Migração aditiva 20261030000000_school_staff: índices escolares, FK, triggers de scope imutável e pertença escolar da conta; catálogo school-staff/view/create/edit sem grants. Histórico de migração anterior preservado; gerador suporta --metadata-only e os testes conferem separadamente migrações históricas e triggers novos. Doze migrações aplicadas em teste e desenvolvimento após ensaio descartável e backup cifrado verificado. Restauro sintético verificou 46 tabelas, colunas, contagens e anexo cifrado.
- Motor profissional comum mantém as garantias docentes e acrescenta Staff, com prévia de nome/código, confirmação, revisão de membership/perfis e auditoria atómica com IDs. Teacher, User, papéis, história e escola B preservados nas operações Staff; não une homónimos ou contactos.
- Navegador em edumoz_test criou ficha com dados sintéticos, editou função/inactivou, ligou/substituiu/desligou Staff da conta que acumula docência, recusou ficha externa/inactiva e ambos os formulários A→B. pt/en, móvel 390×844 sem overflow. Leitor recebeu só consulta temporária (já restaurada), sem criar/editar; remoção da concessão negou no pedido seguinte. Retorno após login para Staff confirmado depois da correcção A43.
- Regressão final: 122 ficheiros/1095 testes, 229,32 s, todos verdes; tipos/build Turbopack aprovados, lint zero erros/um aviso TanStack conhecido. Limpeza de fixtures em transacção ReadCommitted com retry de deadlock e entrada por colagem no ensaio de criação de papel mantêm as mesmas verificações, sem skips ou aumento de timeout. Resíduos da falha de limpeza eliminados apenas nos dois tenants sintéticos próprios.
- Progresso 21/320. O pedido mais recente exige execução contínua até concluir o plano completo; esta nota é um marco interno, não um encerramento. M01 continua em execução pela gestão de sessões. Fichas com fotografias/documentos e integrações seguintes permanecem rastreadas nos consumidores e não são declaradas aceites nesta âncora.

## 2026-10-30 — Sessões JWT revogáveis (2.4)

M01-SESSION aceite: AuthSession sem bearer em claro, compatibilidade legada, revogação própria/outras com confirmação, grants independentes da escola e rotação de credenciais na mesma transacção. A44/A45 corrigidas, incluindo adopção concorrente e preservação de tombstone. 128 ficheiros/1118 testes passaram em 255,50 s; heartbeat concorrente 7/7 e guards de página revalidados depois do ajuste aos PageProps gerados. Build final Turbopack aprovado, lint zero erros/um aviso TanStack existente. Migração 13 ensaiada/aplicada após backup; restauro de 47 tabelas/anexo passou.

QA local em edumoz_test confirmou terminar outras sessões/persistência, manter actual, logout próprio/acesso recusado seguinte, nova entrada/retorno pt/en, leitura sem grants administrativos, regressão de Pessoal e móvel 390×844 sem overflow. Evidências .local/evidence/sessions-*. Conta do gestor restaurada. Progresso 22/320. Próximo trabalho: retirada escolar com preservação de identidade/fichas e última via administrativa, seguido dos restantes fluxos M01. Não encerrar a execução por este marco.

## 2026-10-30 — Retirada local aceite (2.5.6)

REMOVED preserva memberships/fichas/identidade global, com prévia nominal, revisão, escola de abertura, confirmação e auditoria. Convites antigos revogados e aceitação serializada/revalidada; atribuição de papéis corrigida para a última via administrativa e autoridade persistida. A46–A48 resolvidas. Testes finais 131/1140 verdes em 362,85 s, código zero; build/lint e restauro de 47 tabelas passaram. Navegador confirmou A removida/B activa, perfis e User completos preservados, contexto A→B recusado (retirada e papel), leitor sem acção, pt/en/móvel sem overflow. Evidências .local/evidence/removal-*; origem 65/65 hashes inalterados. Progresso 23/320. Continuar 2.6/2.7 sem encerrar por este marco.

## 2026-10-31 — Criação de papéis corrigida (2.6.1)

A49–A51 verificadas: actor/escola persistidos, UUID/replay seguro, campos limitados, auditoria atómica/redigida; catálogo de QA completo (50) sem grants novos, seed seguro/idempotente e diálogo móvel corrigido. 132/1149 verdes em 315,66 s, build/lint e navegador pt/en/móvel/A→B passaram. Origem não alterada. Progresso 24/323 após subdivisão explícita de 2.6; continuar 2.6.2 e restantes fluxos, sem encerrar a tarefa global por este marco.

### Gestão de papéis 2.6.2 aceite — 2026-10-31

Regressão final integral: 136 ficheiros/1182 testes passaram em 326,61 s, código zero, sem skips nem alteração dos timeouts. Build Turbopack e tipos passaram; lint zero erros/um aviso TanStack conhecido. Migração ensaiada e aplicada nas duas bases; restauro de 47 tabelas aprovado. Navegador pt/en/móvel, edição real, protecções de eliminação, contexto A→B e cancelamento imediato verificados; integração cobre eliminação positiva, concorrência e rollback da auditoria. Origem 65/65 hashes preservados. Evidências .local/evidence/role-management-*. Progresso 25/323; M01 e o programa completo continuam abertos.

### Nove perfis de sistema — instalação e correspondência aceites, 2026-10-31

140 ficheiros/1201 testes passaram em 336,72 s, código zero. Build Turbopack passou; tipos/lint sem erros na verificação anterior (um aviso TanStack conhecido), nova verificação final registada separadamente. Instalação escolar cria os nove perfis protegidos e só projecta 28 acções com consumidores actuais; não atribui pessoas e nunca reescreve perfis existentes. As 55 capacidades e dependências estão tipadas e descritas em docs/comparisons/esagrada-m01-system-role-projection.md. A granularidade ainda não consumida continua em 2.6.4/2.7 e nos módulos respectivos; esta aceitação não afirma que perfis de módulos ausentes já executam essas funções.

Integração cobre concorrência, colisão de nome/chave reservada, repetição após remover grants/editar texto, actor revogado e rollback real da auditoria. Navegador confirmou escola A→B recusada sem escrita, instalação inicial e repetição numa escola sintética vazia C com o build final, zero atribuições e uma auditoria; A/B e papéis prévios preservados. Prévia pt/en/móvel 390×844 x=16..374 sem corte, botões alcançáveis por teclado, protecção de eliminação de sistema e consola sem avisos/erros. Restauro 47 tabelas aprovado. Origem 65/65 hashes inalterados.

A revisão de source Staff confirmou academic.manage_teachers; corrigida a projecção antes da aceitação e repetidos os testes. Uma fixture inicial não atribuída foi ajustada explicitamente só em edumoz_test com auditoria própria; o produto não sobrescreve ajustes nem acrescenta grants em repetições. Instalação inicial no build final foi novamente ensaiada na escola C vazia. Evidências .local/evidence/system-roles-*. Progresso 26/323; prosseguir atribuições múltiplas, M01 continua aberto.


### Atribuições múltiplas 2.6.4 aceites — 2026-11-01

Migração 20261031010000_membership_permission_roles ensaiada e aplicada em desenvolvimento/teste; ponte legada preservada e backfill idempotente apenas dos gestores que a consumiam. Baselines comparadas novamente após a regressão: dois contextos de desenvolvimento e 48 de teste com acesso efectivo inalterado. Configuração vazia não repõe acesso total; reposição legada exige intenção própria e autoridade persistida. Preparação de associações suspensas não as activa. Junção escolar protegida por FK/triggers, contagens deduplicadas e referências históricas preservadas.

Regressão final: **146 ficheiros/1260 testes**, 422,07 s, código zero. A primeira passagem de 145/1255 precedeu a descoberta de A55 no navegador e não foi usada como aceitação final. Build Turbopack/tipos passaram; lint zero erros/um aviso TanStack conhecido; OpenSpec válido. Restauro cifrado verificou 48 tabelas/estrutura/contagens/anexo. A54 impede auto-associação docente por users/edit delegado; A55 exige permissão na lista escolar e limita pautas próprias por Teacher activo/grupo/disciplina/matrículas. Integração cobre concessão/revogação, configuração vazia/reposição explícita, suspensos, revisão concorrente de membro/perfil, escola alheia, actor revogado, própria conta/plataforma, última via administrativa, rollback real de auditoria e corrida entre gravações.

Navegador no build final: redução dois→um→zero, duas atribuições sem grants após paginação/pesquisa sem perder selecções, reabertura persistida, recusa de formulário A→B sem auditoria adicional, escola B e fichas docentes A/B preservadas. Docente sem grants recebe recusa directa em /alunos; pautas não enumeram turma/disciplina alheia e IDs directos não devolvem resultados. Prévia pt/en/móvel efectivo 390×844: x=16..374, clientWidth=scrollWidth=341; rodapé alcançado por teclado (Cancelar y=729..777), consola sem erros/avisos. As capturas finais role-assignment-final-mobile-* substituem medições preliminares em separadores de fundo que não receberam o override de viewport. Evidências .local/evidence/role-assignment-*; origem 65/65 hashes inalterados.

Após validação e conforme autorização explícita, eliminados exactamente o backup cifrado desta migração, as duas baselines privadas e a base/ficheiros temporários deste restauro. Relatórios sem dados pessoais preservados; restantes backups não alterados. Servidor QA localhost:3011 e desenvolvimento localhost:3000 sem Docker. Progresso **27/323**; M01 e o sistema integral continuam abertos. Seguem excepções de permissões (2.7), sem declarar capacidades de módulos futuros implementadas.
