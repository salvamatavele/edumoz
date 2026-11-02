# Aceitação da fundação existente — 2026-10-28

Âmbito: tarefas 1.13/1.14 da alteração clone-esagrada-functional-parity e superfícies EduMoz existentes. Não equivale a aceitação de M01–M15 nem de endpoints futuros. A aceitação usa testes automáticos, HTTP real e navegador de produção em edumoz_test; não foram usados dados reais da escola.

## Fronteiras de pedidos e dados

| Requisito | Evidência e resultado |
|---|---|
| RS-01 — destinos de login | Allowlist pt/en; testes hostis e navegador com fallback seguro e query válida; login-destination-checks.json e capturas login-safe-* |
| RS-02 — origem/CSRF e tamanho | Verificações próprias no proxy, protecção Auth.js mantida, corpo Auth.js limitado a 64 KiB e Server Actions a 1 MiB; testes unitários e request-boundary-production.json com recusa 403/413 |
| RS-03 — cache privada | Nenhuma cache persistente privada no inventário de src; no-store/private e Vary Cookie nas rotas privadas, sessão Auth.js sem cache; A/B no navegador sem mistura de alunos/facturas |
| RS-04 — ficheiros | Inventário: cinco SVGs de estrutura em public, nenhuma API de upload/download privado ou escritor de ficheiros em runtime. Não há um upload existente para proteger. O armazenamento privado e os seus testes são pré-requisito obrigatório do primeiro consumidor M01-PROFILE/M01-DOCUMENTS ou M02, antes de aceitar ficheiros; não se declara essa implementação entregue agora |
| RS-05 — cabeçalhos | nosniff, DENY, Referrer-Policy e CSP parcial de base/object/frame, sem X-Powered-By; dez verificações HTTP reais passaram. Não se declara CSP completa nem configuração HTTPS de produção |
| RS-06 — logs e tentativas | Logger com categorias fixas sem payloads; AuthThrottle persistente/HMAC, concorrência/expiração/falha fechada testadas; 11 falhas de navegador deixam orçamento em 10; auditoria sem segredos |

A clarificação de 1.13 é de dependência: protecções das superfícies actuais concluídas; armazenamento privado é bloqueante na primeira funcionalidade que recebe/serve ficheiros. Criar uma API sem consumidor só para preencher a checkbox contrariaria RS-04 e KISS. O requisito de ficheiros continua integralmente obrigatório em M01 e M02, sem redução de segurança nem declaração de upload testado.

## Navegador

Build de produção localhost:3011, sem Docker, MariaDB edumoz_test. Desktop e viewport explícito de 390×844; override reposto ao terminar. Evidência actual em foundation-acceptance-browser.json, capturas foundation-* e estado de escrita em foundation-restricted-write-check.json. Registos detalhados anteriores continuam válidos para os fluxos não alterados.

| Conta/contexto | Percurso | Resultado |
|---|---|---|
| Gestor restrito A, pt, desktop | Alunos; URLs directos Finanças, Configuração, Académico, Professores, Avaliação, Horários e Pautas | Só Alice, sem criar; gestão sem grants recusada |
| Gestor restrito A com attendance/view | Folha submetida por URL | Consulta permitida, marca desactivada, sem Submeter/Reabrir; texto corrigido para não o identificar indevidamente como director de turma |
| Gestor restrito A, pt/en, móvel | Lista e menu | Cartões legíveis; apenas ligações autorizadas; idioma mantém contexto |
| Mesmo leitor, escola B, en, móvel | Troca explícita A → B; Alunos e Finanças | Só Beatriz; finanças em consulta sem controlos de criação |
| Leitor B | IDs conhecidos de factura e recibo de A | Não devolve Alice, referência nem conteúdo de pagamento; selecção genérica/recibo não encontrado |
| Encarregado A, pt, móvel | Login; atalhos de gestão/notas/presenças | Login encaminha ao portal próprio; atalhos recusados ou encaminhados sem acesso à gestão |
| Encarregado A, pt, móvel | Portal financeiro com ID de aluno de B | Só Alice e as suas facturas; o ID estrangeiro não selecciona Beatriz |
| Encarregado A, en, desktop | Portal e navegação | Só educanda própria e ligações familiares; consola sem erros/avisos no percurso verificado |
| Gestor com perfil docente proprietário, pt/en | Notas, fecho/reabertura, presenças e horário | Evidências grade-*, term-*, existing-review-attendance.png e schedule-transaction-en.png; bloqueios e persistência verificados |
| Gestor A/B, pt/en | Facturação, pagamento sintético, confirmação/reversão e recibo | Evidências financial-*, existing-review-finance-en.png e finance-filters-preserved.png |
| Associação revogada com JWT existente | Pedido seguinte e escolha explícita de escola remanescente | Evidências authorization-school-b-recovered.png e testes de sessão/revogação |

Não foram executados OAuth Google real, envio de correio, impressora física, câmara, operador de pagamento real ou funcionalidades ainda ausentes. A política e os contratos Google são testados em componentes; simulador financeiro é identificado como tal. A aceitação da fundação não declara essas integrações operacionais.

## Continuidade

Os módulos usam esta base e continuam sujeitos a spec aprovada, migrações ensaiadas, testes e comparação com a origem. M01 exige aprovação do contrato esagrada-m01.md antes de código novo. O inventário de ficheiros da origem não significa que todos os seus ramos tenham sido executados.
