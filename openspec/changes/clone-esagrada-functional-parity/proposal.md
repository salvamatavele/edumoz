## Why

O esagrada-next contém fluxos escolares em utilização que o EduMoz ainda não cobre. Pretende-se atingir paridade funcional integral com a origem, incluindo fichas, formulários, relatórios e impressos, preservando a identidade visual, o multilinguismo e a arquitectura multi-escolas do EduMoz.

## What Changes

- Inventariar e rastrear todas as capacidades da origem até uma implementação e evidência de aceitação no EduMoz; consultar `source-inventory.md` e `parity-matrix.md`.
- Implementar sequencialmente identidade e permissões; estrutura académica e fichas; candidaturas; matrículas e renovação; horários e atribuições; avaliação, comportamento e fecho anual; calendários de avaliações e exames; diário e livro de turma; planificação; finanças e pagamentos; extracurriculares; documentos e cartões; portaria; comunicação e avisos; portal e relatórios.
- Preservar o layout, cores, tipografia, temas, componentes e navegação do EduMoz; adaptar os formulários à sua linguagem visual mantendo campos, validações e resultados funcionais. Manter pt-MZ e inglês em todas as superfícies novas.
- Tornar regras e identificação da escola configuráveis por tenant, incluindo cabeçalhos, assinaturas, referências, calendário, taxas e integrações.
- Corrigir e comunicar anomalias encontradas, com prioridade para autorização, relações entre escolas, integridade de notas, concorrência financeira e protecção de dados.
- Executar localmente sem Docker, com base MariaDB local, testes isolados, verificação no navegador por módulo e revisão dos impressos.
- **BREAKING**: evoluir modelos de dados, permissões e regras académicas/financeiras mediante migrações aditivas, reconciliação e plano de recuperação; preservar os dados e trabalho local existentes.

## Capabilities

### New Capabilities

- `identity-administration`: contrato detalhado de M01, aprovado em 2026-10-28; contas e associações escolares, credenciais, QR, perfis e auditoria.

- `financial-concurrency`: intenções únicas de emissão/pagamento, referências seguras e saldos/transições serializados.

- `esagrada-functional-parity`: contrato transversal de paridade, inventário integral e aceitação por módulo, incluindo integração com as capacidades existentes.
- `school-security-reliability`: autorização efectiva, isolamento de relações, integridade transaccional, segurança de integrações e ficheiros, desempenho mensurável e recuperação operacional.
- `local-module-validation`: execução sem Docker e critérios de testes automáticos, navegador, idiomas, escolas e impressos para cada entrega.

### Modified Capabilities

- `family-finance-portal`: permissão escolar explícita para finanças próprias do aluno, com compatibilidade das concessões existentes e padrão da origem nas escolas novas; alteração proposta em M01, ainda não implementada.

- `grade-entry`: validar limites e impedir mutações após fecho, incluindo concorrência.
- `term-closing`: fotografia transaccional e reabertura autorizada/auditada com histórico dos resultados.

- `configurable-roles`: aplicar permissões actuais nos pontos de entrada existentes e acrescentar recursos de finanças/horários.
- `platform-admin-access`: reler o privilégio persistido em cada pedido para permitir revogação imediata.

As restantes specs existentes continuam obrigatórias; cada alteração concreta dos seus requisitos deve produzir uma delta explícita antes de implementar o módulo correspondente. A spec transversal não revoga silenciosamente requisitos existentes.

## Impact

Abrange `src/app`, `src/features`, `src/components`, `src/lib`, `src/i18n`, `messages`, Prisma, armazenamento, testes e documentação. A origem é `/home/salvado/Projects/DEV/nextjs/esagrada-next`, apenas para leitura; o destino é este repositório. Preserva-se Auth.js inicialmente; não se copia Better Auth ou outro framework por arrasto. Dependências de PDF, exportação, QR, notificações e pagamentos serão avaliadas por necessidade.

Não inclui copiar dados pessoais, segredos ou credenciais da origem, alterar a instalação da escola, publicar em produção ou executar operações financeiras externas. Integrações reais serão implementadas e validadas em sandbox quando existirem credenciais próprias; a ausência de credenciais fica explicitamente pendente e nunca é apresentada como paridade verificada.
