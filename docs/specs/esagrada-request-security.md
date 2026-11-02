# Spec — Fronteiras de pedidos e dados privados

Estado: fronteiras de runtime actual verificadas e aceites em 2026-10-28; evidência em esagrada-foundation-acceptance.md. Upload/download privados são pré-requisito obrigatório do primeiro consumidor, antes de aceitar ficheiros; não existe actualmente uma API dessa natureza a declarar entregue.

## Requisitos e abordagem

- RS-01: o destino `continuar` após login só pode ser uma rota protegida conhecida, na forma pt/en, com parâmetros de consulta preservados. Recusar URLs absolutas, protocol-relative, backslashes, controlos, paths codificados/ambíguos e dot segments. Destino inválido usa a página de alunos da língua actual. Usar a mesma política no fluxo de credenciais e Google; não alterar permissões do destino.
- RS-02: manter protecção nativa de origem/CSRF das Server Actions/Auth.js, sem allowedOrigins abrangentes. Inventariar endpoints adicionais e exigir origem confiável nos métodos com efeitos. Fixar limite de corpo compatível com os formulários actuais.
- RS-03: dados autenticados não podem entrar em cache partilhada sem escola, utilizador, ano e grants pertinentes. Preferir ausência de cache persistente para os dados privados actuais; rever respostas e mudança A/B.
- RS-04: inventariar ficheiros existentes. Qualquer armazenamento novo fica fora de public, com nomes internos aleatórios, tamanho/tipo/assinatura validados e downloads autorizados. Não inventar um endpoint de upload sem consumidor; testar a fronteira de storage antes da primeira funcionalidade que o utiliza.
- RS-05: cabeçalhos de segurança compatíveis com Next e OAuth; sem quebrar localhost, temas e impressões. Testar respostas do build de produção.
- RS-06: logs de autenticação e falhas não incluem credenciais, tokens, documentos, contactos ou payloads de operadores. Limites de tentativas devem ser efectivos e ter testes de abuso, expiração e isolamento; documentar limitação do deployment local e persistência necessária para múltiplas instâncias.

## Aceitação

Testes negativos de destinos pt/en e parâmetros hostis; fluxos do login mantidos. Testes de regressão das fronteiras efectivamente alteradas, suite verde, tipos/lint/build e ensaio no navegador antes de concluir 1.13. Não declarar uploads/cache/logs/limites concluídos por mera existência desta spec.

## Levantamento inicial

Único Route Handler actual: Auth.js. Sem uploads nem cache persistente privados encontrados em src. SignInForm atribui directamente a query continuar a window.location; corrigir A15 primeiro. A17 do painel financeiro fica registada na aceitação funcional.

## Entrega RS-01 — 2026-10-28

Allowlist derivada de routing/PROTECTED_PATHNAMES, sem aceitar caminhos internos ingleses sem prefixo de língua. Segmentos dinâmicos admitem os IDs ASCII alfanuméricos/underscore/hífen usados actualmente. Paths codificados recusados conservadoramente; queries codificadas normais mantidas. Acesso ao destino continua a exigir sessão, escola e permissão.

Quarenta e um testes de domínio e sete de formulário; 751 testes totais, tipos, lint e build passaram. Navegador de produção com conta sintética verificou fallback pt/en e query válida. Google verificado por teste de componente da chamada; OAuth real não foi executado. RS-02–RS-06 pendentes.


## Correcção das credenciais existentes

A18: orçamento persistente MariaDB antes de consulta/Argon2: 10 tentativas por identificador normalizado em 15 minutos e 300 tentativas globais por minuto. Contadores globais porque User é partilhado entre escolas; não confiar em IP de headers arbitrários. HMAC com AUTH_SECRET, sem guardar telefone/e-mail/IP em claro. Limpeza de até 100 linhas expiradas por pedido. Sucesso limpa só o orçamento do identificador; o global permanece. Limitação global protege recursos, podendo recusar logins legítimos sob carga hostil; requer observação operacional e dimensionamento antes de produção. Banco indisponível falha fechado com mensagem genérica. A verificação de password ausente usa hash fictício com custo Argon2 equivalente. Logger Auth.js só emite categorias fixas, sem cause, payloads ou segredos.

Login por telemóvel: autorização usa o ID autenticado pelo provider e estado persistido da conta/membership. Não exigir e-mail nem domínio Google de uma conta local já provisionada; Google mantém a exigência de e-mail verificado e domínio configurado. Não aceitar convites pelo login de um identificador não autenticado.

### Verificação de produção de 2026-10-28

O endpoint Auth.js limita o corpo recebido a 64 KiB antes do processamento, incluindo pedidos sem Content-Length. O pedido reconstruído preserva URL, método, cookies/cabeçalhos e corpo; a autenticação por telefone sem e-mail foi confirmada no navegador de produção. O proxy recusa origens ausentes/externas em mutações de páginas e aplica no-store/private aos percursos privados. A política CSP actual limita base-uri, object-src e frame-ancestors; não equivale a uma CSP completa contra scripts. A migração AuthThrottle foi aplicada em desenvolvimento após backup cifrado verificado. Consultar `esagrada-existing-corrections.md` para resultados e limites da revisão.

### Fronteiras reais do servidor — continuação

Dez verificações HTTP de produção na porta 3011 passaram (relatório `.local/evidence/request-boundary-production.json`): cabeçalhos em homepage/login pt/en, redirects privados pt/en sem cache e com Vary Cookie, origem de mutações ausente/externa/null recusada, corpo Auth.js excessivo recusado e sessão Auth.js sem cache. Inventário actual confirma só Auth.js como Route Handler e nenhum escritor de ficheiros/cache persistente em src; SVGs de estrutura são os únicos ficheiros em public. Não estabelecer um upload genérico sem consumidor: o primeiro módulo de ficheiros deve implementar armazenamento privado e respectivos testes antes de aceitar ficheiros. Esta implementação de armazenamento privado permanece obrigatória no primeiro consumidor; a aceitação das fronteiras actuais da tarefa 1.13 não afirma que uploads ou funcionalidades futuras estejam implementados.

### Aceitação consolidada

A tarefa 1.13 foi clarificada para seguir RS-04: inventariar e proteger o runtime actual, sem inventar uma API de ficheiros sem consumidor. A dependência de armazenamento privado fica expressa no primeiro consumidor de M01/M02. A tarefa 1.14 foi concluída com escola A/B, gestor restrito/família e desktop/móvel, mantendo os limites de integração descritos em esagrada-foundation-acceptance.md. Regressão final: 99 ficheiros/864 testes em 132,06 s, build aprovado e dez verificações HTTP reais aprovadas.
