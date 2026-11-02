# Revisão do EduMoz existente antes de avançar

Autorização: pedido explícito de 2026-10-28 para corrigir o que já foi implementado e existe, antes de avançar. Não aceitar módulos novos nem declarar paridade global nesta revisão.

## Critérios

1. Links, separadores, troca de idioma/escola e actualizações devem manter o contexto correcto; limpar rascunhos de uma factura ao abrir outra e impedir opções duplicadas de escola.
2. Rever permissões/posse e invariantes das mutações actuais, validação e precisão de valores, fecho e repetição de pedidos.
3. Corrigir os alertas aplicáveis das dependências instaladas, verificando avisos dos mantenedores, compatibilidade e regressão. Não actualizar a origem nem executar audit fix --force.
4. Limitar tentativas de credenciais antes de pesquisa/Argon2, com estado persistente partilhado entre processos, chaves não reversíveis, falha fechada e respostas sem enumeração. Não confiar em cabeçalhos IP arbitrários.
5. Executar testes até verde por correcção, regressão integral e build, e verificar os percursos afectados no navegador pt/en com dados sintéticos A/B.

## Primeiras correcções

- A17: mudanças de separador passam a actualizar o URL preservando os filtros; mudanças do separador pedido pelo servidor repõem a selecção. PaymentManager tem chave por factura para não reaproveitar rascunhos/intenções entre facturas.
- Troca de idioma preserva query, incluindo valores repetidos e IDs de documentos.
- Selector agrega memberships por schoolId sem alterar os papéis nem grants efectivos.

## Limites

A ficha completa, candidaturas, mapas e outras superfícies ausentes da origem continuam na matriz. Uma ausência de funcionalidade não é corrigida silenciosamente por marcar um teste técnico como paridade. Todas as divergências dos módulos existentes continuam abertas até implementação e aceitação específicas.

## Correcções verificadas em 2026-10-28

- Autenticação: contas locais podem entrar por telefone sem e-mail; a decisão usa o ID autenticado e a associação activa, mantendo a política Google separada. Docentes inactivos deixam de obter posse profissional.
- Protecção de credenciais: AuthThrottle persistente com HMAC, 10 tentativas por identificador/15 minutos e 300 globais/minuto, consumo transaccional e falha fechada. A resposta não distingue conta inexistente. Os limites precisam de acompanhamento operacional; não constituem garantia de disponibilidade contra todos os ataques.
- Pedidos: limite real de 64 KiB no corpo Auth.js, origem exacta nas mutações de páginas, respostas privadas sem cache e cabeçalhos de enquadramento/conteúdo. O navegador detectou uma incompatibilidade na cópia de NextRequest que foi corrigida reconstruindo explicitamente URL, método, cabeçalhos, sinal e corpo; o login de produção foi repetido com sucesso.
- Presenças: folhas por URL exigem perfil docente activo ou permissão administrativa de consulta; famílias e gestores restritos são recusados antes de ler colegas. Consulta administrativa não implica autoria docente. Reabrir exige autorização própria. Datas inválidas, dia da semana e limites do ano lectivo são verificados; submissão e reabertura concorrentes são serializadas e auditadas.
- Valores: validação respeita as casas decimais armazenadas de notas, pesos e propinas; facturas e recibos mostram a moeda persistida. Não foram inventadas novas regras nacionais de avaliação.
- Interface: idioma conserva parâmetros, selector de escolas elimina duplicados, separadores acompanham o URL, rascunhos não passam entre facturas. Actualizações de notas/presenças reconciliam o estado com o servidor; falhas de transporte mostram mensagem e permitem recuperação. Validação Zod usa a língua por pedido, sem alterar estado global; esquema de avaliação usa subscrição explícita do formulário.
- Dependências: Next/eslint-config-next 16.4.1, Prisma 7.10.1, Zod 4.6.6 e fast-uri 3.1.9. Auditoria de produção devolveu zero alertas conhecidos. Fontes do mantenedor: [Next Server Actions](https://github.com/vercel/next.js/security/advisories/GHSA-p3m5-59mp-jv5r), [Next SVG/libsharp](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw). Isto não prova ausência de vulnerabilidades desconhecidas.

### Evidência

- Build de produção Turbopack concluído com sucesso; typecheck sem erros. ESLint sem erros, com um aviso conhecido de incompatibilidade de memoização da API TanStack Table; componente usa opt-out explícito do React Compiler.
- Regressão integral e ensaios de migração encontram-se em `.local/evidence/existing-review-tests.log`, `existing-review-build.log`, `existing-review-lint.log` e relatórios de migração. Os ensaios recusam históricos inválidos sem os alterar.
- Navegador em produção, porta 3011, exclusivamente `edumoz_test`: login por telefone sem e-mail; duas escolas sem duplicação e alunos isolados; link Facturação → Pagamentos; pagamento manual sintético de 40/100; mudança pt → en conserva factura e separador; presenças Falta → Submeter → Reabrir → Atrasado → Submeter.
- Capturas `existing-review-finance-en.png`, `existing-review-attendance.png` e estado/auditoria `existing-review-browser-result.json` em `.local/evidence/`. Segredos sintéticos ficam fora do Git.
- Migração aditiva `20261028030000_auth_throttle` aplicada também em `edumoz`, após backup cifrado local com verificação byte a byte. Não foi feito reset nem seed da base de desenvolvimento. EduMoz continua sem Docker; Docker da origem permanece separado para comparação.

Esta revisão corrige os defeitos identificados nas superfícies actuais. A matriz completa de paridade e a aceitação de módulos permanecem pendentes; não se declara que todo o sistema foi auditado ou que a clonagem terminou.

Resultado final: **98 ficheiros / 845 testes passaram**, sem skips, em 138,83 s. Após onze tentativas inválidas de navegador para identificador sintético inexistente, o contador persistente ficou em dez; mensagem genérica preservada. Recibo sintético de 40 MT confirmado. Um aviso TanStack Table permanece no lint, sem erros.

### Continuação — filtros financeiros

Correcção dos links existentes: conta e pagamentos preservam `turma`, `periodYear` e `periodMonth`, com o mesmo contrato do formulário GET. Períodos fora dos limites já usados na emissão (ano 2000–9999, mês 1–12) são recusados na página antes da consulta; a leitura DAL também rejeita números inválidos. Não alterar regras de emissão nem interpretar filtros inválidos como um relatório de outro período.

### Continuação — concorrência de horários

Reprodução: duas colocações concorrentes de grupos com a mesma matrícula, docentes e salas distintos, no mesmo tempo; a versão anterior aceitou ambas. Manter a pré-validação descritiva, mas bloquear a linha do ano activo e reler agrupamentos, membros e horário dentro da transacção ReadCommitted antes de gravar. Recusar ano desactivado, referências de outro ano, docente/sala inactivos ou remarcação de outro ano. Repetir apenas transacções integralmente revertidas. A solução serializa colocações por escola/ano; futuras mutações de composição de grupos também terão de respeitar esta fronteira. Não garante integridade contra SQL externo que contorne a aplicação.

Validação desta continuação: **98 ficheiros / 862 testes passaram**, sem skips, em 136,84 s. Build de produção e typecheck passaram; lint sem erros e o mesmo aviso TanStack conhecido. Logs `.local/evidence/existing-continuation-tests.log`, `existing-continuation-build.log`, `existing-continuation-lint.log`. Reprodução negativa anterior `.local/evidence/schedule-concurrency-before.log`, regressão corrigida `schedule-concurrency-after.log`. Navegador de produção pt/en: filtros preservados e remarcação de horário concluída; capturas `finance-filters-preserved.png` e `schedule-transaction-en.png`. Nenhuma migração adicional, reset ou alteração na origem nesta continuação. O 404 nativo inglês foi entretanto corrigido na verificação final abaixo.

### Verificação final da continuação

Corrigido também o 404 das rotas localizadas: mensagens pt/en, cores/tipografia actuais e recuperação para o início da língua correcta. Capturas `.local/evidence/localized-not-found-pt.png` e `localized-not-found-en.png`; recuperação /en confirmada no navegador. **99 ficheiros / 864 testes passaram**, sem skips, em 150,13 s. Build e tipos passaram; lint zero erros e um aviso TanStack já documentado.

Dez verificações reais HTTP do servidor de produção passaram: cabeçalhos de segurança e ausência de X-Powered-By em três rotas públicas; redirects privados pt/en com no-store/private e Vary Cookie; POST com origem ausente, externa ou null recusado; corpo Auth.js de 70.000 bytes recusado com 413; endpoint de sessão sem cache. Relatório `.local/evidence/request-boundary-production.json`. Inventário `.local/evidence/runtime-boundary-inventory.json`: um Route Handler Auth.js, cinco SVGs públicos de estrutura, sem chamadas de escrita em ficheiros nem directivas de cache persistente nas fontes de runtime. Isto limita o âmbito verificado actual; uploads privados têm de ser estabelecidos e testados antes de aceitar o primeiro módulo consumidor.
