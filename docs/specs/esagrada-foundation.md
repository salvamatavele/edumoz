# Spec — Fundação da clonagem

Estado: implementação autorizada pela aprovação da proposta em 2026-10-27.

## Requisitos

Executar localmente sem Docker. Antes dos testes com escrita, criar base local `edumoz_test` com conta aleatória sem acesso à base `edumoz`. Exigir `TEST_DATABASE_URL` explícita; recusar servidor remoto, nome fora do prefixo reservado, conta administrativa, opções de URL e coincidência com a base de desenvolvimento. Falhar antes de importar testes ou abrir Prisma. Testes unitários devem correr sem base configurada e falhar se tentarem abrir um cliente real.

## Abordagem

Configuração Vitest valida o destino e fornece a URL aos workers; o cliente Prisma repete a validação em `NODE_ENV=test`. Configuração unitária separada aceita apenas domínio, componentes, UI, i18n e helpers puros, sem fallback para a base de desenvolvimento. Preparação usa o cliente MariaDB do host, conta da aplicação apenas para provisionar uma base nova e conta limitada para aplicar migrações existentes. Credenciais aleatórias ficam apenas em `.env.test.local` ignorado e com modo 0600. Não adoptar bases desconhecidas, não executar resets nem seed da escola.

## Aceitação

- URLs inseguras e aliases da base de desenvolvimento são recusados por testes unitários.
- `npm test` sem configuração segura termina antes de executar os ficheiros.
- `npm run test:unit` não depende de MariaDB nem lê `.env`.
- Preparação aplica migrações só no destino de teste; a conta de teste não lê `edumoz`.
- Integração usa fixtures sintéticas A/B existentes nos testes e a suite fica verde antes da próxima tarefa.

## Decisões e evidência

Baseline: Node 26.5.0, pnpm 11.21.0, MariaDB 13.0.2, aplicação configurada em localhost:3000 e base edumoz em 127.0.0.1:3306. Sem TEST_DATABASE_URL na configuração original. Lint inicial: zero erros, dois avisos de compatibilidade React Compiler em TanStack Table e react-hook-form. Nenhum teste de integração foi executado contra a base de desenvolvimento.

Resultado da entrega de isolamento: 72 ficheiros/486 testes passaram na base separada. As duas migrações existentes foram aplicadas sem seed. Confirmada a recusa de consulta de tabelas de desenvolvimento pela conta de teste, inclusive por SQL directo. Teste antigo de horário passou a criar e limpar os seus próprios dados em vez de exigir a escola de demonstração. Recuperação sintética encriptada verificada em 44 tabelas e num anexo. O bloqueio inicial de build foi resolvido: `npm run build` com Turbopack e cache nova completou compilação, TypeScript e geração de 35/35 páginas.
