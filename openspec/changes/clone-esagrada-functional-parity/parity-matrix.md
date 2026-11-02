# Matriz de paridade funcional

Estado em 2026-10-27. Inventário estático inicial: presença de código não prova funcionamento. Todos os módulos permanecem por validar no navegador. Nenhuma linha é aceite apenas por existir uma rota.

| ID | Módulo | Origem (`src/modules`) | Conteúdo obrigatório | EduMoz actual | Aceitação |
|---|---|---|---|---|---|
| M01 | Identidade e administração | `identity` | Sessões; utilizadores; papéis; permissões de leitura/escrita e excepções; recuperação; perfil; credenciais QR; auditoria; painéis por perfil | Identidade parcial | Pendente |
| M02 | Estrutura académica e fichas | `academic` | Ano em vista; anos e trimestres; classes; secções; turmas; disciplinas; docentes; pessoal; alunos; encarregados; campos obrigatórios; fotografias; documentos; assinaturas | Estrutura parcial | Pendente |
| M03 | Candidaturas e ingressos | `admissions` | Janelas por classe/secção; candidatura pública e pela secretaria; edição; documentos; taxas e isenções; estado; selecção; ingresso; ficha da candidatura | Ausente | Pendente |
| M04 | Matrículas e percurso anual | `academic` | Matrícula; boletim; renovação individual e em lote; anulação com rasto; exames; faltas; regras de passagem; fecho anual; dívida transitada; histórico | Matrícula inicial parcial | Pendente |
| M05 | Atribuições e horários | `scheduling` | Atribuições por docente/turma/disciplina; derivação do horário; tempos; salas; grupos paralelos; conflitos e sobreposições autorizadas; impressão por turma/docente | Horários parciais | Pendente |
| M06 | Avaliação e comportamento | `assessment` | Componentes; planos e lançamento de notas; dispensas; limites; fecho e desbloqueios; exames; comportamento disciplinar/trimestral/anual; pautas trimestrais/anuais/globais; mapas; boletins | Notas e fecho trimestral parciais | Pendente |
| M07 | Calendários de avaliações e exames | `assessment` | ACS; semanas de AT; mapas de exames nacionais; blocos; disciplinas; turmas; vigilantes; supervisores; colisões; publicação; renomeação; eliminação segura | Ausente | Pendente |
| M08 | Diário e livro de turma | `classbook` | Aulas do horário; número da lição; sumários; presenças; faltas e justificação; fecho; sumário semanal; páginas fixas do livro de turma | Presenças parciais | Pendente |
| M09 | Planificação e materiais | `classbook` | Plano analítico; semanas; plano quinzenal; plano diário e etapas; actas; revisão/aprovação; materiais; relatórios e impressões | Ausente | Pendente |
| M10 | Finanças e pagamentos online | `finance,payments` | Taxas; preços; descontos; multas; cobranças; pagamentos e alocações; saldo e aplicação de crédito; anulação/reversão; recibos e talões; extractos; dívida; pagamentos de outros anos; operador online; webhook | Facturas e pagamentos parciais; gateway simulado | Pendente |
| M11 | Actividades extracurriculares | `extracurricular` | Actividades; níveis; turmas e horários; membros e inscrições; presenças; avaliações; progressão; propinas; cobranças; pagamentos; cumulativos e relatórios | Ausente | Pendente |
| M12 | Documentos e cartões | `academic,identity` | Declarações; certificados e verificação; fichas; boletins; cartões; QR; credenciais; emissão e revogação; instantâneos; fotografias; anexos; PDF e exportações | Modelos e spec, sem entrega integral | Pendente |
| M13 | Portaria e livro de ponto | `gatehouse` | Entradas/saídas de alunos, docentes e pessoal; cartões e leitor de mão; modo leitor; terminal; aparelhos matriculados; bloqueio; livro de ponto; avisos | Ausente | Pendente |
| M14 | Comunicação e avisos | `communication,notifications` | Comunicados; destinatários; anexos; respostas e conversa individual; caixa de avisos; por ler; push; aparelhos; rotina diária; SMS/WhatsApp conforme integração | Ausente | Pendente |
| M15 | Portal, painéis e relatórios | `portal` | Percurso por ano; notas; boletins; horário; aulas; materiais; avaliações; actividades; finanças; portaria; faltas; avisos; painéis por perfil; todos os relatórios e exportações | Portal parcial de notas/finanças/horário | Pendente |

## Contrato por item

Antes de implementar cada módulo, decompor cada campo, formulário, acção, estado, permissão, impressão, relatório, exportação e integração em linhas filhas com ID estável. Registar: caminho da origem e hash, comportamento observado, destino, spec/cenário, diferenças justificadas, testes automáticos, evidência de navegador pt/en e escolas A/B, impressão quando aplicável, anomalias e estado. Estados: inventariado, especificado, implementado, verificado, bloqueado. Uma dependência externa bloqueada não conta como verificada.

O inventário completo de caminhos está em `source-inventory.md`. Todas as rotas, endpoints, specs, ficheiros de módulo e testes da origem devem ser associados a uma linha ou ter justificação explícita de não funcionalidade (por exemplo, infraestrutura Docker). Funções descobertas fora desses caminhos também entram na matriz. Não há redução de âmbito silenciosa.

## Critério de conclusão

A paridade exige 100% dos itens funcionais associados e verificados, sem módulos marcados como completos com mocks, links inactivos ou impressos por rever. Desvios deliberados de segurança preservam a finalidade do fluxo e ficam documentados. O fecho global exige aprovação das diferenças de negócio que não se possam resolver a partir da origem.


## M01 — detalhamento inicial de 2026-10-28

Contrato preparado para aprovação em docs/specs/esagrada-m01.md, IDs M01-LOGIN a M01-DOCUMENTS. Inventário de 65 fontes com hashes em docs/comparisons/esagrada-m01-source-inventory.json e correspondência inicial das 55 chaves em esagrada-m01-permission-map.md. Nove perfis/formulário de criação/matriz de níveis confirmados no navegador da origem; nenhuma mudança gravada. Estado: especificado parcialmente, aprovação pendente; não implementado nem aceite. A tarefa 2.1 permanece aberta para os ramos/impressos ainda não ensaiados.


## M01 — primeira subentrega verificada em 2026-10-28

Contrato aprovado pelo utilizador. Consulta de contas com paginação SQL de 25, filtros, contactos, papéis e códigos das fichas da escola; activação/suspensão de todas as associações locais com auditoria, protecção do último gestor e revalidação do acesso. Ensaios A/B, leitor sem edição, desktop/390×844 e pt/en passaram. Migração users/view e users/edit não concede acesso automaticamente a papéis restritos. Criação/convites, edição de identidade, credenciais, QR e restantes fluxos continuam pendentes. M01 e tarefa 2.5 permanecem incompletos; esta entrega não equivale a paridade total.


## M01 — troca própria e revogação verificadas em 2026-10-28

M01-PASSWORD parcial: palavra-passe actual, nova/confirmar, Argon2, política de emissão, limite persistente, operação global apenas do titular, concorrência e auditoria sem segredos. authVersion revoga todos os JWTs anteriores e impede renovação por actualização do cliente; versão verificada no login evita corrida com troca concorrente. UI pt/en e móvel verificada; backend sintético seguido de JWT recusado e novo login confirmado no navegador. Não se automatizou a submissão de nova password no navegador; componentes e integração cobrem esse passo. Emissão inicial/obrigação/expiração e recuperação continuam pendentes; M01-SESSION e M01-PASSWORD não têm aceitação integral.


## M01 — criação e credencial inicial — 2026-10-29

M01-USERS-CREATE parcial: criação de conta nova, papéis base múltiplos, ficha docente local, código de entrada próprio e contactos de comunicação separados da autenticação. Nunca associa por contacto; coincidência com identidade de outra escola produz o mesmo resultado independente. users/create tem guard e migração sem concessões automáticas.

M01-CREDENTIALS/M01-PASSWORD/M01-SESSION parciais: entrega única de segredo aleatório, validade 24h, obrigação no servidor antes de leitura/mutação, expiração, reemissão só inicial/exclusiva, revogação por versão e janela configurada de oito horas para novas sessões. Criação/reemissão/auditoria são transaccionais; replays não recuperam nem reemitem segredos. Último gestor conta apenas vias activadas. 111 ficheiros/1001 testes, tipos/build e navegador A/B, leitor, docente, pt/en e móvel verificados.

Convite, identidade/vínculos completos, união dos nove perfis/excepções, recuperação de contas activadas, QR, lotes e impressos/exportações continuam pendentes. Nenhum módulo integralmente aceite.

M01-USERS-EDIT parcial (2026-10-30): edição de nome/contactos de comunicação em identidade exclusiva, sem alterar login ou acesso; snapshot com revisão, auditoria atómica e recusa de partilha/escola alterada. 114 ficheiros/1026 testes e navegador verificados. Gestão de vínculos profissionais permanece pendente.

M01-USERS-LINK parcial (2026-10-30): ligação/substituição/desligação docente local com prévia nome/código, papel Teacher activo, revisão e auditoria transaccional; conta partilhada, escola B e histórico preservados. Implementação e navegador em school-user-teacher-link*. Ficha/vínculo de funcionário ainda pendente.

Validação do vínculo docente: 117 ficheiros/1055 testes, tipos/build aprovados; navegador pt/en, conta partilhada, leitor, escolas A/B e móvel verificados. Funcionário continua pendente em 2.5.4.2.2.

M01-USERS-LINK: docente e funcionário, acumulação e gestão Staff escolar verificadas em 2026-10-30 (122 ficheiros/1095 testes e navegador pt/en/A/B/leitor/móvel). Provas em .local/evidence/staff-*. M01 completo e fichas M02 ainda não aceites; execução contínua segue sessões.

## M01-SESSION — aceite em 2026-10-30

Registo revogável por JWT, logout confirmado, gestão própria de sessões e recusa de cópia cifrada anterior verificados. Mantém Auth.js/oito horas, privilégios actuais e máscara inicial; não confundir com aceitação integral de M01. Regresso pt/en, leitor e móvel passaram; 128 ficheiros/1118 testes, build e restauro de 47 tabelas. Progresso 22/320; restantes fluxos continuam em execução.

## M01-USERS-STATE — retirada aceite em 2026-10-30

Retirada escolar distinta de suspensão, mantendo história e associação B. Activações/vínculos/papéis antigos não a reabrem. Último gestor protegido entre retirada/suspensão/restrição; convites anteriores não repõem acesso. 131 ficheiros/1140 testes, build/restauro e navegador verificados. Estado global da conta/plataforma e gestão completa dos perfis continuam no contrato; M01 não aceite integralmente. Progresso 23/320.

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
