# Spec — Paridade funcional integral com esagrada-next

- Estado: proposta aprovada pelo utilizador em 2026-10-27; implementação iniciada pela fundação local.
- Change: [clone-esagrada-functional-parity](../../openspec/changes/clone-esagrada-functional-parity/proposal.md).
- Origem: /home/salvado/Projects/DEV/nextjs/esagrada-next, apenas leitura.

## Requisitos

Clonar funcionalmente todos os módulos, fichas, campos, formulários, regras, impressos, pautas, exportações e integrações da origem para EduMoz, mantendo o layout, cores, tipografia, temas, português de Moçambique/inglês e multi-escolas. Corrigir e comunicar anomalias e práticas inseguras durante a adaptação. Execução e testes locais sem Docker.

O contrato normativo está nas [três specs do change](../../openspec/changes/clone-esagrada-functional-parity/specs/). A [matriz](../../openspec/changes/clone-esagrada-functional-parity/parity-matrix.md) organiza 15 entregas; o [inventário](../../openspec/changes/clone-esagrada-functional-parity/source-inventory.md) fixa 792 ficheiros iniciais com hashes e deve incorporar novas descobertas.

## Desenho e decisões

Seguir o [desenho técnico](../../openspec/changes/clone-esagrada-functional-parity/design.md): monólito modular, autorização actual no servidor, integridade entre escolas/anos, Decimal, transacções seguras, migrações aditivas, ficheiros privados e serviços por escola. Não copiar bases pessoais nem segredos. Antes de cada módulo, detalhar a spec própria e deltas de requisitos existentes; resolver ambiguidades de negócio com o utilizador.

## Critérios de aceitação

- Todos os itens funcionais inventariados ligados a implementação e evidência, sem exclusões silenciosas.
- Cada módulo aceite apenas após testes verdes e navegador em pt/en, escolas A/B, papéis relevantes e desktop/móvel.
- Todos os impressos e exportações comparados quanto a conteúdo e apresentação, com dados sintéticos.
- Testes de integração em base local separada; origem e dados reais da escola intocados.
- Integridade de notas/fechos, permissões/revogação, relações entre tenants e concorrência financeira demonstradas por testes.
- Metas de desempenho e recuperação do design verificadas com registo de medições e ensaio de restauro.
- Integrações sem credenciais ou hardware permanecem explicitamente pendentes; não declarar conclusão integral enquanto faltarem evidências obrigatórias.

## Plano e aprovação

Executar a [lista sequencial de tarefas](../../openspec/changes/clone-esagrada-functional-parity/tasks.md). Aprovação desta proposta é necessária antes da implementação, conforme as instruções do projecto. A criação dos artefactos não constitui aprovação nem implementação.
