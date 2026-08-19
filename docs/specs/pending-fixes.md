# Spec — Fecho da fundação

- **Estado:** ✅ Implementado — ver [`CHANGELOG.md`](../../CHANGELOG.md) §Fase 3
- **Depende de:** [`domain-foundation.md`](./domain-foundation.md)
- **Âmbito:** o que ficou por fazer na Fase 2 e bloqueia os módulos seguintes.

---

## 1. Contexto

A fundação está construída e verificada, mas três coisas ficaram por fechar. Duas delas
bloqueiam qualquer módulo novo: sem selector de escola, um utilizador com duas escolas fica
preso à primeira; e sem um `FormModal` ligado a uma Server Action real, cada módulo
inventaria o seu próprio padrão de mutação.

---

## 2. Requisitos

| ID | Requisito |
|----|-----------|
| RF-01 | Selector de escola no cabeçalho, para quem tem mais do que uma `Membership` |
| RF-02 | O papel apresentado e as permissões seguem a escola activa |
| RF-03 | Uma Server Action de exemplo, ligada ao `FormModal`, com validação Zod partilhada |
| RF-04 | Datas e números em inglês formatados em convenção britânica |
| RF-05 | Página `/design-system` revista visualmente após a migração para shadcn |
| RF-06 | Ligação "Alunos" na navegação, visível apenas com sessão |

---

## 3. Desenho

### 3.1 Selector de escola

A sessão já transporta `memberships` e `schoolId`. Falta a interface e a mutação.

```
SchoolSwitcher (client)
  └─ useSession().update({ schoolId })   → callback `jwt` com trigger "update"
```

O callback `jwt` **já valida** que a escola pedida consta das `Membership` do token — sem
isso bastaria pedir a troca para um `schoolId` qualquer. Essa parte está feita e testada
pela leitura do código; falta o componente e um teste que exercite a troca.

Não aparece para quem só tem uma escola: um selector com uma opção é ruído.

### 3.2 Server Action de exemplo

O `FormModal` recebe `onSubmit: (values) => Promise<FormActionResult>`. Falta demonstrar o
lado do servidor, e o exemplo torna-se o molde dos módulos seguintes:

```
features/academic/actions/create-student.ts   "use server"
  1. auth() → sessão e schoolId; recusa sem SCHOOL_MANAGER
  2. schema.parse(values)          ← o MESMO esquema Zod do cliente
  3. getTenantDb(schoolId).student.create({ data: { schoolId, ... } })
  4. erros de unicidade → fieldErrors, não mensagem geral
  5. revalidatePath
  6. AuditLog
```

O passo 4 é o que justifica o canal `fieldErrors`: "já existe um aluno com este número" só
se sabe consultando a base de dados, e tem de aparecer junto ao campo.

### 3.3 Datas em inglês

**O defeito:** o `<html lang>` declara `en-GB` mas o formatador do next-intl usa o código
curto `en`, que o `Intl` trata como `en-US`. 4 de Maio aparece como `05/04/2010`.

Duas saídas:

| Opção | Custo |
|---|---|
| **A.** Locale de formatação distinto do de encaminhamento — o `NextIntlClientProvider` e o `getRequestConfig` recebem `en-GB`, o `pathnames` continua com `en` | Requer confirmar que o next-intl 4 aceita a divergência sem avisar |
| **B.** Passar `locales: ["pt", "en-GB"]` | URLs ficam `/en-GB/students` — feio e mau para links partilhados |

**Recomendação: A.** Se o next-intl a recusar, a alternativa é formatar datas através de um
utilitário próprio que receba o tag completo de `LOCALE_TAGS`, deixando o next-intl só com
as mensagens.

**Resultado:** o next-intl recusou — não avisa, mas parte silenciosamente. `useFormatter()`
usa o mesmo `locale` para formatar E para gerar `href`s (`Link`, `usePathname`), e
`routing.pathnames` só conhece "pt"/"en"; um `Link` para "/design-system" passou a
resolver `/pt-MZ/design-system`, que não existe. Implementada a alternativa: `locale` em
`request.ts` ficou no código curto, e `useLocaleFormatter`
(`src/i18n/use-locale-formatter.ts`) formata com `Intl` directamente e o tag completo, à
parte do next-intl. Ver CHANGELOG.md, Fase 3.

### 3.4 Revisão visual do style guide

A migração para shadcn substituiu o `Button` e acrescentou nove componentes. O critério de
aceitação "zero regressões visuais em `/design-system`" nunca foi verificado com os olhos.
É a única forma de o verificar: nenhum teste apanha um contorno que desapareceu.

---

## 4. Critérios de aceitação

- [x] Um utilizador com duas `Membership` troca de escola e a lista de alunos muda
      (verificado por teste — o seed não tem nenhum utilizador com duas escolas)
- [x] O selector não aparece para quem só tem uma escola
- [x] Pedir a troca para um `schoolId` fora das suas `Membership` não altera a sessão
- [x] Um número de aluno repetido devolve o erro **no campo**, não no topo
- [x] Criar um aluno sem papel de gestão é recusado pela Server Action
- [x] A criação fica registada em `AuditLog`
- [x] `04/05/2010` em português e `04/05/2010` em inglês — mesma data, mesma ordem
- [x] `/design-system` revista nos dois temas, sem regressões
- [x] `pnpm build`, `lint` e `test` verdes
- [ ] ~~Criar um aluno pelo `FormModal` grava e a lista actualiza sem recarregar a página~~
      — grava, confirmado em teste e manualmente; a lista **não** actualiza, porque parte
      da `Enrollment`, não do `Student` (ver CHANGELOG, "Problema conhecido"). Corrigir
      exige um ecrã de matrícula, fora do âmbito deste spec.

---

## 5. Fora de âmbito

Ecrãs de gestão de utilizadores e convites, recuperação de palavra-passe, e o registo de
auditoria com interface própria.
