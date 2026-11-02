# Desenvolvimento local sem Docker

## Ambiente

Usar Node compatível com as versões instaladas de Next/Prisma, pnpm 11.21.0, MariaDB local e os clientes `mariadb` e `mariadb-dump`. Levantamento inicial: Node 26.5.0, MariaDB 13.0.2. As versões registadas descrevem o ambiente observado, não uma recomendação de versão para produção.

1. Instalar dependências com `pnpm install --frozen-lockfile`.
2. Copiar `.env.example` para `.env` e configurar `DATABASE_URL`, `AUTH_SECRET` e `AUTH_URL`. Não guardar valores reais no Git.
3. Gerar cliente com `npm run db:generate` e aplicar migrações com `npm run db:deploy` na base local destinada ao desenvolvimento. Rever SQL antes de migrações novas; não usar resets numa base existente.
4. Iniciar com `npm run dev`; destino habitual: `http://localhost:3000`, MariaDB em `127.0.0.1:3306`.

O seed é uma operação explícita para demonstração em base nova, não um pré-requisito dos testes. Nunca executar comandos no repositório ou base do esagrada-next para testar EduMoz.

## Testes seguros

```bash
npm run test:unit
npm run db:test:prepare
npm test
npm run typecheck
npm run lint
```

`db:test:prepare` cria `edumoz_test`, uma conta com segredo aleatório e acesso apenas a essa base e `.env.test.local` com permissões 0600. Exige que a conta de desenvolvimento possa criar a base/conta locais; se não puder, o administrador pode fornecer uma URL de teste com o contrato abaixo. O script não adopta nem apaga uma base já existente sem configuração e não sobrescreve `.env.test.local`. Uma segunda execução com configuração válida aplica apenas migrações pendentes.

Contrato: `TEST_DATABASE_URL` usa MySQL, loopback (`localhost`, `127.0.0.1` ou `::1`), base `edumoz_test` ou `edumoz_test_<sufixo>` e conta `edumoz_test_<sufixo>` sem privilégios noutras bases. Não são aceites parâmetros adicionais na URL. A base tem de diferir da de desenvolvimento mesmo através de aliases de loopback. Credenciais fornecidas manualmente devem cumprir a mesma restrição de privilégios; o nome de utilizador, por si só, não impõe grants.

O Vitest valida antes de carregar os testes e fornece a URL segura aos workers. Prisma repete a validação quando `NODE_ENV=test`. A configuração unitária não carrega `.env`, fornece URLs vazias e não permite importar um cliente real. `npm test` sem configuração segura falha antes de executar qualquer teste.

Os testes de integração criam os seus próprios dados sintéticos e limpam por IDs/âmbito dos fixtures. A escola de demonstração não é necessária. O teste de privilégios verifica que SQL directo também não consegue consultar tabelas da base `edumoz`. Máximo de dois workers evita saturação da máquina e da base; aumentar só após medir.

## Build e navegador

`npm run build` valida a compilação de produção em `.next-production`; `npm start` usa o mesmo directório. `npm run dev` continua a usar `.next`. A variável interna `EDUMOZ_PRODUCTION_BUILD=1` nos scripts mantém os outputs separados e evita substituir os artefactos do servidor de desenvolvimento durante a verificação. Para testar produção ao lado do desenvolvimento: `npm start -- --port 3001`.

### Turbopack e cache após execução bloqueada

O processamento PostCSS usa um worker Node com comunicação por socket local; o build precisa dessa permissão e de acesso às fontes Google usadas pelo projecto. Em 2026-10-27 foi observado `EPERM` nesse worker em execuções restritas. O build autorizado passou através da CLI directa e, depois de guardar a cache anterior de `.next-production/cache/turbopack` em `.local/turbopack-cache-before-validation`, também passou com `npm run build` e cache nova. Mantém-se Turbopack como compilador. A cache de desenvolvimento e os dados da aplicação não foram removidos.

## Ensaio de recuperação

`npm run db:test:recovery` usa exclusivamente a base de testes, acrescenta um fixture sintético e faz um dump encriptado AES-256-GCM. Restaura numa base local nova com prefixo `edumoz_test_restore_`, compara tabelas, colunas, contagens e o fixture, e ensaia também um anexo privado sintético. Os ficheiros e o relatório ficam em `.local/recovery/`, ignorado pelo Git. A chave junto do dump serve apenas este ensaio sintético; backups reais exigem chave num cofre separado. A base restaurada fica disponível para inspecção, sem apagar bases preexistentes. Não executar este ensaio em paralelo com testes que escrevam na base de testes.

Verificar cada módulo em pt-MZ/en, escolas A/B e papéis relevantes, desktop/móvel. Registar erros, persistência, recusas de acesso e impressos. Uma página acessível não prova a aceitação de todo o módulo. Integrações reais precisam de credenciais sandbox próprias.


## Contas novas — M01 parcial (2026-10-29)

Um gestor com users/view e users/create abre /utilizadores (inglês: /en/users), cria a conta e entrega em privado o código de entrada e a credencial temporária. Email/telefone desta criação são contactos de comunicação; a nova conta entra pelo código EDU-… entregue. Logins legados por email/telefone continuam válidos. A credencial inicial expira em 24 horas e deve ser substituída antes do acesso escolar; depois é necessário entrar novamente. A entrega não fica recuperável na lista. Se ainda não foi activada e pertence apenas à escola, um criador autorizado pode reemitir a credencial inicial, invalidando a anterior. Contas activadas/partilhadas não são repostas por esse botão. Convite/prova de posse, reposição de contas activadas e restantes fluxos M01 continuam em implementação.
