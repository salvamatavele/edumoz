# Anomalias e decisões de adaptação

Levantamento estático em 2026-10-27. Não é auditoria exaustiva nem prova de exploração. Registar novas descobertas durante toda a implementação e comunicar ao utilizador.

| ID | Local e evidência | Impacto | Tratamento / verificação exigida |
|---|---|---|---|
| A01 | EduMoz `identity/domain/access.ts`: `hasPermission` sem chamadas de aplicação | Papel configurável pode não restringir operações | Corrigido em 1.9: 23 actions e páginas de gestão verificam permissões; 22 chamadas directas de escrita e 10 páginas sem grants recusadas em testes. UI de leitura e escolas A/B verificadas no navegador |
| A02 | EduMoz `academic/actions/record-grades.ts`: não lê estado do trimestre | Notas podem divergir das pautas fechadas | Corrigido em 1.11: bloqueio de Term, verificação de estado em actions/triggers, reabertura com motivo e snapshots; testes das duas ordens concorrentes e navegador concluídos |
| A03 | EduMoz `academic/domain/grade-schema.ts`: só mínimo; action não compara `maxScore` | Nota acima do máximo pela API/action | Corrigido em 1.11: validação transaccional de maxScore para o lote inteiro, triggers numéricos e ensaio de nota 25/20 no navegador |
| A04 | EduMoz `enroll-student.ts`: grava referências sem validar escola/ano; extensão não valida relações recursivamente | Risco de referências entre escolas | Corrigido em 1.10: validação de formulário e 64 triggers sobre referências/âncoras, cliente scoped também em junções e nested writes; casos negativos entre escolas/anos, concorrência, preflight e navegador verificados |
| A05 | EduMoz `generate-invoices.ts`: existência e contagem antes da escrita | Corridas de referência/idempotência | Corrigido em 1.12: generationKey única, contador bloqueado, testes paralelos e replay no navegador |
| A06 | EduMoz pagamentos: transição calculada antes da transacção e recálculo sem bloqueio explícito do agregado | Corrida entre confirmação/reversão e saldos concorrentes | Corrigido em 1.12: bloqueio por factura e releitura transaccional; interleavings determinísticos e estorno no navegador |
| A07 | EduMoz `auth/config.ts`: memberships/superadmin carregados no login | Revogação não imediata | Corrigido em 1.8: loader em cada pedido de sessão, com testes de integração/callback; suspensão com sessão existente e recuperação explícita para B confirmadas no navegador |
| A08 | Origem `AGENTS.md`, secção de testes: integração usa base da escola e documenta resíduos financeiros anteriores | Ensaios podem alterar registos reais | Nunca transportar essa prática; base de testes própria e fixtures por execução |
| A09 | Origem `identity/application/authorization.ts`: comentário descreve palavra-passe inicial igual ao código | Credencial previsível mesmo com bloqueio de escrita | Activação com segredo temporário aleatório; testes de expiração, uso único e revogação |
| A10 | Origem `openspec/README.md` declara comunicação/encerramento por construir; existem specs e código correspondentes | Inventário documental desactualizado | Cruzar código, specs e navegador; não excluir módulos pelo índice |
| A11 | EduMoz MASTER visual diverge dos tokens/fontes/temas implementados | Regressão visual se copiado cegamente | Corrigido em 1.7: MASTER reconciliado com CSS e fontes actuais; nenhum token visual de runtime alterado |
| A12 | Origem webhook devolve 200 para resultados não reconhecidos excepto assinatura | Risco a investigar de perda de retries legítimos, depende da classificação em `receberWebhook` | Distinguir ignorar definitivo de erro transitório; ensaiar indisponibilidade e reentrega |

## Registo contínuo

Por descoberta acrescentar caminho/linha ou hash, reprodução, severidade, dados afectados, decisão, tarefa, teste de regressão e estado. Correcções de segurança mantêm a finalidade do fluxo, sem copiar defeitos por fidelidade à origem. Incidentes de dados reais não devem ser simulados nem corrigidos na instalação da origem nesta iniciativa.

## 2026-10-27 — Autorização efectiva

- A13 (corrigida, 1.9): proxy reconhecia apenas cookie de sessão não fragmentado. JWTs maiores podem ser divididos pelo Auth.js. `session-cookie.ts` reconhece os nomes normais/seguros e o primeiro fragmento; três casos de regressão. Continua a ser uma verificação optimista; a validação real pertence ao Auth.js e ao loader.
- A14 (corrigida, 1.9): selector escondia uma escola autorizada remanescente quando a escola seleccionada era revogada. Corrigido sem mudar escola automaticamente; teste de componente e percurso sintético A suspensa → escolha explícita de B no navegador. Mensagem `auth.noAccess` tornada aplicável também à página/escola seleccionada.
- A15 (corrigida, parte de 1.13): SignInForm usava continuar sem validar antes de navegar. Agora sign-in-destination.ts só permite páginas protegidas conhecidas pt/en, preserva query/fragment e usa fallback da língua para destinos inválidos. Quarenta e um casos de domínio e sete de formulário passaram; navegador com credenciais sintéticas confirmou fallback pt/en de URL absoluta/protocol-relative e preservação de query válida. Google verificado em componente, sem autenticação externa real.
- Ensaio de produção: hostname interno 127.0.0.1 com URL pública localhost provocou redireccionamentos cíclicos nos rewrites pt; alinhar `next start --hostname localhost` com o URL público eliminou o ciclo. Não foi necessário alterar rotas da aplicação. Instância e fixtures temporárias removidas após o ensaio.
- Decisão: consulta docente de pautas da escola preservada conforme o requisito existente `report-cards`; lançamentos docentes e portal familiar mantêm as verificações de posse. Não transformar uma política de leitura explícita em restrição nova sem rever o requisito.

- A16 (corrigida, 1.10): filtro de turma no painel financeiro usava `common.selectPlaceholder`, ausente dos catálogos. Server log de navegador em en mostrou MISSING_MESSAGE. Reutilizada a chave existente `form.selectPlaceholder`; testes do painel passaram.

## 2026-10-28 — Finanças

- A17 (corrigida em 2026-10-28; evidência abaixo): FinancePanel usa Tabs.defaultValue; navegação cliente do mapa de dívida para `?tab=payments&factura=...` mantém o separador anterior. Reproduzido no navegador. Clique manual em Pagamentos ou reload abre a factura correcta; sincronizar estado de navegação com teste de regressão antes de M10.
- Contador inicialmente actualizado só por Prisma.update apresentou MariaDB 1020 sob concorrência; fronteira estreita passou a bloquear School com SELECT FOR UPDATE. Vinte e quatro alocações simultâneas passaram.
- Simulador anteriormente ignorava a chave e confirmava referências desconhecidas; corrigido em 1.12 com testes. Estado do operador simulado continua volátil e não prova integração real.
- Vencimento 31 em Fevereiro transitava para Março; corrigido em 1.12 com teste de ano normal/bissexto e conferência de data no ensaio sintético.

- A18 (corrigida em 2026-10-28; evidência abaixo): provider Credentials ainda não limita tentativas antes de pesquisa de conta/Argon2. Levantamento estático; falta implementar e ensaiar limites sem enumeração e sem confiar em cabeçalhos IP arbitrários. Nenhum ensaio de força bruta contra contas reais.


## 2026-10-28 — Correcção do existente antes de novos módulos

Os textos A17/A18 acima registam a descoberta original. A17: separador sincronizado com navegação/URL e rascunhos por factura, testes de componente e percurso real mapa → Pagamentos → troca pt/en confirmados. A18: orçamento persistente AuthThrottle, HMAC e consumo transaccional antes de Argon2; concorrência e expiração em integração, onze tentativas de navegador para identificador sintético inexistente deixam attempts=10 e a mesma resposta genérica.

- A19 (corrigida): página directa de presenças tratava ausência de Teacher como leitura sem restrição e posse implícita. Agora exige docente activo ou attendance/view antes da leitura; administradores sem docente consultam sem autoria. Testes negativos GUARDIAN/STUDENT/gestor restrito, datas e ownership.
- A20 (corrigida): submissão podia alterar sessão submetida e reabertura concorrente duplicar auditoria; transições condicionais transaccionais e testes concorrentes. Navegador confirmou duas submissões separadas por uma reabertura, com uma auditoria de reabertura.
- A21 (corrigida): Credentials exigia e-mail na autorização apesar de anunciar telefone. Usa ID autenticado e associação activa; login sem e-mail confirmado em produção.
- A22 (corrigida): precisão superior à coluna decimal podia sofrer arredondamento silencioso; schemas impõem a precisão armazenada. Rascunhos de notas/presenças reconciliados quando o snapshot muda.
- A23 (corrigida): idioma perdia query e memberships duplicavam escola. Query preservada, escolas agregadas por ID; navegador A/B e pt/en confirmados.
- A24 (corrigida): dependências com avisos conhecidos, pedidos/logs/cache sem as novas protecções; versões corrigidas, limite Auth.js, origem exacta, logs sem payloads e cabeçalhos. Audit de produção sem alertas conhecidos; não representa auditoria exaustiva.

Resultados finais: 98 ficheiros/845 testes, build Turbopack e typecheck passam. Lint: zero erros, um aviso TanStack Table documentado. Relatório completo e limites em docs/specs/esagrada-existing-corrections.md. Nenhum módulo novo aceite nesta revisão.

## Continuação da revisão — 2026-10-28

- A25 (corrigida): links do mapa financeiro espalhavam `classGroupId` enquanto a página/formulário liam `turma`; abrir conta perdia o filtro. Links de conta e pagamentos agora preservam turma, ano e mês; navegar de pagamentos para facturação mantém também a conta. URL de período não numérico/fraccionário/fora dos limites era encaminhado sem validação ao Prisma; página recusa antes da leitura e DAL devolve resultado vazio para valores inválidos. Testes de componentes, página sem acesso à base e integração passaram. Navegador de produção confirmou mapa → conta → pagamentos → mapa, e recusou mês NaN.
- A26 (corrigida): duas colocações concorrentes com a mesma matrícula, docentes e salas diferentes, no mesmo tempo eram ambas aceites. Teste com barreira reproduziu duas respostas success antes da correcção. A gravação agora bloqueia o ano activo, relê o horário e os membros e revalida conflitos dentro de ReadCommitted, com retry apenas de transacções revertidas. Teste corrigido confirma um success, um conflict e uma única aula; casos de docente/sala inactivos e remarcação inexistente não escrevem aula nem auditoria. Confirmação positiva de remarcação no navegador pt/en.

O bloqueio por ano é deliberadamente conservador para os escritores actuais. Futuras alterações de composição de grupos devem usar a mesma fronteira. Não se alega protecção contra escritores SQL externos. O 404 nativo em inglês foi identificado nesta verificação e corrigido em A27.

- A27 (corrigida): notFound nos percursos pt mostrava a página inglesa nativa. Acrescentado not-found no segmento de língua com mensagens pt/en, tokens actuais e ligação de recuperação localizada. Testes de ambas as línguas, catálogos e navegador de produção confirmaram português, inglês e retorno a /en. Não introduz detecção de idioma arbitrária para URLs globais desconhecidos.

Verificação final desta continuação: **99 ficheiros / 864 testes**, 150,13 s; build Turbopack e tipos passam; lint zero erros/um aviso TanStack conhecido. Dez verificações HTTP de produção confirmaram cabeçalhos públicos, redirects privados sem cache, origem ausente/externa/null recusada, corpo Auth.js excessivo recusado e sessão Auth.js sem cache. Resultado em `.local/evidence/request-boundary-production.json`.


## Aceitação da fundação e preparação M01 — 2026-10-28

- A28 (corrigida): folha de presenças de gestor com attendance/view chamava-o director de turma sem esse vínculo. Mensagem pt/en tornou-se neutra de consulta; testes de componente/catálogos e navegador confirmaram. Autorização não alterada.
- A29 (divergência documental da origem, capturada em M01): spec de autenticação indica 26 permissões/sete perfis e recuperação por email fora de âmbito, mas código e navegador mostram 55/nove e existe recuperação implementada. Contrato e inventário usam a working tree actual e mantêm os ensaios dos ramos pendentes.
- A30 (risco de desempenho da origem para não transportar): listUsers não tem take/skip; listCredentials lê conjuntos e filtra em memória. M01 exige paginação e filtros no SQL, sem afirmar que as metas de carga já foram medidas.
- A31 (diferença multi-escolas proposta, aprovação pendente): gerir User global pela escola A pode afectar B. M01 separa suspensão/remoção local de mudanças de identidade/password globais em contas partilhadas; o comportamento está explicitamente submetido à aprovação, ainda sem código novo.

Aceitação da fundação actual registada em docs/specs/esagrada-foundation-acceptance.md; armazenamento privado continua bloqueante antes do primeiro upload, não foi declarado implementado. Nenhuma integração real ausente nem módulo funcional foi aceite nesta consolidação.


## M01 — consulta e estado escolar — 2026-10-28

- A31: diferença multi-escolas aprovada. Suspensão local implementada e verificada sem alterar conta global/outra escola; edição de identidade e remoção continuam pendentes.
- A32 (corrigida): selector mantinha escolas de uma sessão cliente antiga após auto-suspensão. Contexto efectivo do servidor prevalece agora; teste de regressão e repetição no navegador confirmaram apenas a escola ainda autorizada.
- A33 (corrigida): fecho do diálogo só em inglês e alvo pequeno; tradução pt/en e alvo 44px. Contagem da nova lista com pluralização correcta. Tipos, componentes e build verificados.


- A34 (corrigida para a troca própria): não existia versão persistida que invalidasse JWTs após troca de password. Acrescentada authVersion com compatibilidade zero, comparação por pedido e protecção da corrida entre verificação de credenciais e emissão de sessão. Regressão e navegador confirmam recusa de sessão/password anteriores. Emissão inicial e reposição continuam pendentes e devem usar a mesma fronteira.


## Criação e credencial inicial — 2026-10-29

- A35 (não transportada da origem): createUserAccount grava auditoria depois da transacção da conta; uma falha dessa gravação pode deixar criação concluída com resposta de erro. No destino, conta/associações/vínculo/auditoria são atómicos e o pedido é idempotente. Observação de código, sem provocar falhas na instalação de origem.
- A36 (risco multi-escolas corrigido): erro de unicidade de email/telefone poderia revelar existência de identidade noutra escola. Contactos novos são de comunicação, não únicos/não verificados, sem pesquisa global ou associação; código próprio autentica. Sucesso independente testado com contacto já usado em B; campos de login existentes preservados. Verificação/convite consentido continuam pendentes.
- A37 (corrigida/prevenida): gestor ainda com credencial inicial não é via administrativa utilizável; foi excluído da contagem do último gestor. Actor inicial também não pode gerir contas via contexto antigo. Integração inclui protecção, reemissão e corrida com activação.
- A38 (corrigida): findFirst podia escolher arbitrariamente entre variantes legadas de telefone. Consulta limitada a dois recusa ambiguidade; variantes normais partilham limite. Orçamentos de mutação têm finalidade própria, sem colisão com identificadores públicos de login.
- A39 (corrigidas na UI): contagem pt de zero, indicação de código de entrada na procura e texto de reemissão que sugeria regenerar código; testes e navegador actualizados. Limpeza de limites passou a ter ensaio transaccional, evitando falsa falha por manutenção concorrente sem reduzir o limite verificado.

- A40 (corrigida, 2026-10-30): formulários antigos podiam usar a escola alterada noutro separador. Criação/reemissão/estado exigem escola esperada e comparam com a sessão no servidor; o diálogo fixa o contexto de abertura. Testes de acções/componentes e navegador recusaram criação/suspensão A→B; MariaDB confirmou ausência de alterações.

- A41 (adaptação concluída em 2.5.4.1): origem identity/application/administration.ts:updateUserAccount altera identificadores de entrada e audita após a escrita; presentation/admin-actions.ts:updateUserAction grava identidade e vínculos em operações separadas. O EduMoz mantém contactos não verificados separados do login, limita a edição global à identidade exclusiva, compara revisão e audita na mesma transacção sem valores pessoais. Testes confirmam login inalterado e recusa concorrente/entre escolas. A atomicidade dos futuros vínculos mantém-se pendente em 2.5.4.2; origem apenas lida.

- A42 (prevenida na gestão docente, 2026-10-30): comparar apenas teacherId actual não detecta um ciclo ligar→desligar após snapshot sem vínculo. A implementação usa revisão das memberships locais e versões de ambas as fichas, actualizadas monotonicamente com a auditoria na mesma transacção. Integração confirma recusa do snapshot antigo, concorrência por ficha e preservação da escola B. A41 fica corrigida para a relação docente; funcionário permanece dependência explícita. O ensaio de componentes anterior foi estabilizado aguardando o fim do carregamento antes de procurar Guardar/Save.

- A43 (corrigida durante QA de pessoal): a nova rota staff existia e tinha guard efectivo, mas faltava no catálogo privado do proxy. O retorno após login caía em alunos e faltavam os cabeçalhos privados explícitos desse proxy. Acrescentada a rota e ensaio que inventaria todas as páginas do dashboard, além de retorno pt/en e Vary/Cookie/no-store. Nenhuma leitura sem autorização foi permitida pelo guard da página.

- A44 (corrigida e verificada em M01-SESSION): Auth.js usa JWT e não havia evento/registry de revogação no logout; limpar o cookie não invalida uma cópia assinada anterior. Confirmado por leitura de config.ts e da implementação local @auth/core/actions/signout.js. Introduz-se nonce estável, registo global do titular e revogação antes da limpeza, com testes de replay/corrida/indisponibilidade. Não é prova de acesso indevido a dados reais.

- A45 (corrigida em sessões): adopção simultânea de um cookie legado podia gerar erro MariaDB 1020 no upsert do Prisma e recusar temporariamente pedidos válidos. Teste reproduziu seis adopções concorrentes. Inserção nativa parametrizada preserva revogação com COALESCE e retry limitado; adopção concorrente e logout passaram. Não foi alterado o isolamento nem aumentado o timeout.

- A46 (adaptada na retirada escolar): origem identity/application/administration.ts:deleteUserAccount elimina User global e audita depois. No EduMoz, a retirada aprovada marca somente as memberships locais REMOVED, preservando IDs, fichas e escola B; auditoria e retirada são atómicas. Testes e navegador confirmaram preservação e recusa de reactivação/vínculo por formulário anterior.
- A47 (corrigida durante a retirada): acceptInvitations lia convites pendentes e criava a membership sem partilhar o lock da gestão escolar ou reler expiração, titular e domínio. Uma aceitação iniciada antes da retirada podia repor acesso. Aceitação e retirada agora serializam por escola, com releitura autorizada no lock; a retirada revoga os convites anteriores dessa conta. Testes reproduzem a concorrência e recusam titular/expiração/domínio inválidos.

- A48 (corrigida na dependência de retirada): assignPermissionRole não partilhava o lock escolar, não protegia a última via administrativa e aceitava a própria restrição; os testes positivos usavam actores inexistentes na base, confiando apenas no mock de sessão. Mutação passou para fronteira autorizada com actor persistido, alvo activo local, escola esperada, proibição de plataforma/próprio e guarda do último gestor. Actores de teste agora existem com memberships/flag efectivos. Concorrência retirada/restrição preserva pelo menos um gestor; retirada não pode ser reactivada por atribuição antiga.

- A49 (corrigida e verificada, 2026-10-31): criação de papéis não fixava a escola de abertura nem relia a autoridade no mesmo lock/transacção; testes positivos também usavam actores inexistentes. Fronteira persistida e idempotência por UUID acrescentadas, com limites de campos, replay sem duplicação, recusa de conteúdo alterado e auditoria sem descrição livre. Os testes focados usam actores reais e passaram.
- A50 (corrigida, 2026-10-31): a preparação de edumoz_test aplicava migrações, mas não semeava o catálogo fixo completo. A matriz de QA mostrava só 16 das 50 entradas suportadas. Preparação passa a semear as 50 de forma idempotente, sem criar papéis/grants; teste verifica IDs e concessões preservados. CLI de seed lê o ambiente local, valida o destino de teste e não imprime erros brutos com eventual configuração sensível. Navegador confirmou 50 checkboxes.
- A51 (corrigida e verificada em móvel): diálogo de criação podia exceder a largura útil em móvel devido à largura mínima da tabela. A medição apenas do documentElement não detectava o corte. Revalidar limites do diálogo, overflow próprio e deslocação interna da tabela, além da imagem, antes de aceitar a correcção.
- A52 (corrigida e verificada): PermissionRole usava ON DELETE SET NULL nas memberships; uma eliminação directa podia retirar a restrição e activar o significado legado de acesso total do gestor. Migração aditiva usa RESTRICT, gestão verifica referências activas e históricas, serializa atribuição/eliminação e audita atomicamente. Integração confirma recusa inclusive por eliminação SQL/ORM directa e rollback se a auditoria falhar; não se afirma ocorrência em dados reais.

- A53 (corrigida e verificada): a comparação de marcadores por regex lia texto plural traduzido como variável ICU. Parser oficial e casos de plurais/selects/tags/sintaxe inválida; comparação de nomes preservada. Cancelar a gestão de papéis já não refresca a página sem necessidade e não perde o diálogo aberto a seguir; resposta incerta continua a refrescar. Regressão final 136 ficheiros/1182 testes aprovada.

- A54 (corrigida e verificada, 2026-11-01): quando docentes recebem grants administrativos explícitos, users/edit podia permitir trocar o próprio vínculo docente e assumir outra autoria. A fronteira persistida recusa a própria ficha para actores delegados; integração confirma vínculo A/B e auditoria preservados, mantendo gestão de pares autorizada. UI esconde os controlos próprios correspondentes.
- A55 (corrigida e verificada, 146 ficheiros/1260 testes e navegador final): navegador confirmou que docente sem students/view recebia a lista escolar por URL directa apesar de não ter ligação no menu. Retirado o bypass de papel; página nega antes da leitura. A excepção docente de pautas também não filtrava posse: filtros/resultados passam a limitar-se a Teacher activo e membros dos seus grupos, recusando turma/disciplina/trimestre alheios antes de consultar nomes/resultados. Integração cobre turma alheia, conta alheia, grupos parciais e ficha inactiva; teste de página fixa a passagem do titular. Grant administrativo report-cards/view continua uma autorização distinta e explícita. Build final confirmou recusa de /alunos e de pautas alheias; 2.6.4 aceite.

- A56 (correcção em validação, 2026-11-01): catálogo CRUD de 50 pares era apresentado como se todos tivessem consumidores reais. A revisão encontrou acções futuras sem guard, incluindo grades/view e enrollments/view nas projecções dos perfis de sistema. Isto não demonstrou acesso a dados, mas a configuração prometia controlo que não existia. Mantido o catálogo/IDs históricos; declaradas as 26 acções efectivamente consumidas. Novas excepções/criações recusam acções ausentes, a edição conserva valores legados sem permitir acrescentar outros, a grelha identifica/desactiva controlos pendentes e a preparação de novos perfis só projecta as 26. Repetir preparação continua a preservar perfis existentes. A integração futura de uma acção não pode activar automaticamente valores dormentes: exige comparação de acesso e decisão explícita/migração de compatibilidade no consumidor. Permissões administrativas são distintas do trabalho próprio docente/familiar; a UI explicita o âmbito. Regressão integral/navegador ainda pendentes.
