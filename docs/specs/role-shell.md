# Spec — Casca de navegação e autorização por papel

- **Estado:** ✅ Implementado — ver [`CHANGELOG.md`](../../CHANGELOG.md) §Fase 5
- **Depende de:** [`domain-foundation.md`](./domain-foundation.md), [`pending-fixes.md`](./pending-fixes.md)
- **Âmbito:** para onde cada papel é encaminhado, o que a navegação mostra, e o padrão que
  restringe LEITURA por papel — não o conteúdo de cada painel.

---

## 1. Contexto

Hoje qualquer sessão autenticada — gestor, professor, aluno ou encarregado de educação —
aterra em `/` depois de entrar e vê a mesma navegação. `/alunos` é o único ecrã funcional, e
só verifica `session.schoolId`: não olha ao papel. Um aluno ou encarregado com sessão válida
abre a lista completa da escola — nomes, datas de nascimento, encarregados de **outros**
alunos — porque `isSchoolAdministrator` só protege as acções de escrita (criar, matricular),
nunca a leitura da página. É uma fuga real, não hipotética.

Isto ficou deliberadamente fora do âmbito da fundação (`domain-foundation.md §7`:
"dashboards por papel" nas fases seguintes), mas cada spec de módulo a seguir (Presenças,
Avaliação, Horários, Finanças) vai assumir uma estrutura de navegação por papel — sem a
construir agora, cada módulo inventaria a sua própria, e a fuga em `/alunos` fica por
corrigir até lá.

Este spec **não** desenha o conteúdo de cada painel — isso é de cada módulo, à medida que
for construído. Desenha só a casca: encaminhamento depois de entrar, visibilidade da
navegação, e o padrão que as páginas seguintes replicam para restringir leitura por papel.

---

## 2. Requisitos

| ID | Requisito |
|----|-----------|
| RF-01 | Depois de entrar, o destino depende do papel na escola activa — deixa de ser sempre `/` |
| RF-02 | `/alunos` só é visível a papéis de staff (gestor, professor); um papel de família (aluno, encarregado) é reencaminhado, não vê a lista |
| RF-03 | A navegação do cabeçalho só mostra ligações que o papel pode abrir |
| RF-04 | Um papel de família tem um destino próprio (`/portal`), mesmo sem conteúdo de módulo construído ainda |
| RF-05 | Trocar de escola (`SchoolSwitcher`) respeita o papel na escola nova — se um professor numa escola for encarregado noutra, `/alunos` deixa de estar acessível ao trocar |
| RF-06 | Depois de entrar, a casca deixa de ser a da montra pública (`SiteHeader`/`SiteFooter`, com "Pedir demonstração") — passa a um painel com barra lateral, navegação por papel e sessão do utilizador visível |

### Não funcionais

| ID | Requisito |
|----|-----------|
| RNF-01 | A verificação de papel na leitura usa o mesmo padrão já usado na escrita (`SessionContext` + funções puras de `access.ts`) — não middleware nem um sistema de RBAC novo |
| RNF-02 | `/portal` (vazio de propósito) diz claramente "ainda não há nada aqui" — nunca parece um erro |

---

## 3. Desenho

### 3.1 `isStaffRole` — o complemento de `isFamilyRole`

`access.ts` já tem `isFamilyRole` (aluno/encarregado) e `isSchoolAdministrator`
(gestor/admin da plataforma, para ESCRITA). Falta o par para LEITURA: quem é staff
independentemente de administrar. Com os cinco papéis actuais, é o complemento exacto:

```ts
export function isStaffRole(role: Role): boolean {
  return !isFamilyRole(role);
}
```

### 3.2 `/alunos` deixa de ser universal

```
StudentsPage
  auth() → SessionContext
  isFamilyRole(context.role) → redirect("/portal")
  (staff continua como hoje)
```

`/students` já é a única rota protegida e a única com conteúdo real — por isso `SignInForm`
passou a usar `/students` (traduzido com `getPathname`, não `/`) como `callbackUrl` por
omissão, para os dois métodos de login. Não é preciso uma rota-gateway nova: a própria
página decide, no servidor, se mostra a lista (staff) ou reencaminha (família). Isto
funciona igualmente para Google — que não permite decidir o destino do lado do cliente
antes de autenticar, porque o fluxo sai da aplicação para o ecrã do Google e volta.

### 3.3 `/portal` — destino de família, ainda vazio

Rota nova (`routing.pathnames`), protegida como `/students`
(`PROTECTED_PATHNAMES`), com `auth()` a redireccionar para o login se não houver sessão.
Conteúdo: mensagem de boas-vindas e "as suas funcionalidades chegam nos próximos módulos" —
nada mais. É o ponto que os módulos de Presenças/Avaliação vão substituir por conteúdo real
quando existir "as minhas notas" ou "o meu educando".

### 3.4 Duas cascas, por route group

Primeira versão desta secção pusera "Alunos"/"Portal" como ligações condicionais dentro do
`SiteHeader` de marketing. Não chegava — RF-06 pede uma casca a sério, não uma montra com
duas ligações a mais. A solução final usa route groups do Next.js, que não mudam nenhum
URL:

```
src/app/[locale]/
  layout.tsx              — <html>, providers, skip-link (fica igual para os dois grupos)
  (marketing)/layout.tsx  — SiteHeader + SiteFooter (montra: /, /design-system, /sign-in)
  (dashboard)/layout.tsx  — DashboardShell (painel: /alunos, /portal)
```

`(dashboard)/layout.tsx` chama `auth()` uma vez, resolve `navItems` por papel
(`isFamilyRole`) e passa tudo já resolvido — nome, escola, papel traduzido, lista de
navegação — ao `DashboardShell` (client component): barra lateral fixa em ecrãs médios,
gaveta com sobreposição em ecrãs pequenos, cabeçalho utilitário
(`SchoolSwitcher`/`LocaleSwitcher`/`ThemeToggle`) e rodapé mínimo, sem o `SiteFooter` de
marketing.

**Armadilha:** um componente de ícone (`lucide-react`) não pode atravessar a fronteira
Server → Client como prop — o Next.js recusa em runtime ("Only plain objects can be passed
to Client Components"). `navItems` do servidor só leva `{ href, label }`; o `DashboardShell`
resolve o ícone do lado do cliente, a partir do `href` (`NAV_ICONS` em
`dashboard-shell.tsx`).

### 3.5 `setRequestLocale` tem de ser chamado em cada segmento, não só na página

Ao separar a casca de marketing para `(marketing)/layout.tsx`, `pnpm build` passou a marcar
`/`, `/design-system` e `/sign-in` como dinâmicos — perdia-se a pré-renderização estática
que a Fase 2 (Passo 4) tinha montado. Cada `page.tsx` já chamava `setRequestLocale(locale)`;
o que faltava era o próprio `(marketing)/layout.tsx` chamá-lo também, porque é ele quem
renderiza `SiteFooter` (que usa `getTranslations()`). O next-intl exige `setRequestLocale`
em CADA segmento (layout ou página) que consome traduções e quer fazer parte do render
estático — não basta que um antepassado o tenha chamado. Sem aviso do Next.js: o build
simplesmente marca a rota como dinâmica, silenciosamente.

### 3.6 Troca de escola (RF-05)

Não exige código novo: `SchoolSwitcher` já chama `router.refresh()` depois de trocar, e
`/alunos` já vai verificar o papel a cada render (§3.2). Um professor que troca para uma
escola onde é encarregado de educação é automaticamente reencaminhado para `/portal` no
refresh — é consequência do design em §3.2, não um requisito à parte para implementar.

---

## 4. Rotas

| Rota (pt / en) | Quem | Conteúdo |
|---|---|---|
| `/alunos` / `/students` | Staff (gestor, professor) | Como já existe hoje |
| `/portal` / `/portal` | Família (aluno, encarregado) | Placeholder — RNF-02 |

---

## 5. Critérios de aceitação

- [x] Um aluno ou encarregado autenticado não consegue ver a lista de `/alunos` — é
      reencaminhado para `/portal` (verificado manualmente com uma conta `GUARDIAN` real)
- [x] Um professor ou gestor continua a ver `/alunos` normalmente
- [x] Depois de entrar (credenciais ou Google), um papel de família aterra em `/portal`, um
      de staff em `/alunos`
- [x] A ligação "Alunos" não aparece na navegação a um papel de família; "Portal" não
      aparece a staff
- [x] Um utilizador com `Membership` de professor numa escola e de encarregado noutra perde
      o acesso a `/alunos` ao trocar de escola no `SchoolSwitcher` (consequência de §3.2,
      não testado à parte — o `SchoolSwitcher` já tinha cobertura própria)
- [x] `/portal` sem sessão redirecciona para o login, tal como `/alunos`
      (`PROTECTED_PATHNAMES`)
- [x] Depois de entrar, `/`, `/design-system` e `/sign-in` continuam pré-renderizadas
      estaticamente (`pnpm build` — nenhuma regressão da Fase 2)
- [x] O painel (barra lateral, cabeçalho, rodapé) substitui por completo a montra depois de
      entrar — sem "Pedir demonstração" nem ligações de marketing
- [x] Terminar sessão a partir do painel funciona e devolve a `/`
- [x] A gaveta móvel abre e fecha correctamente por baixo de 768px
- [x] `pnpm build`, `lint` e `test` verdes

---

## 6. Fora de âmbito

Conteúdo real de `/portal` (as próprias notas de um aluno, os educandos de um encarregado —
depende de Avaliação/Presenças existirem primeiro), consola de administração da plataforma
(`PLATFORM_ADMIN` continua sem estar na sessão — ver nota em `create-student.ts`), um
professor ver só os seus próprios agrupamentos lectivos (vem com Presenças/Horários, que já
têm essa regra escrita: `attendance.md` RF-04), e qualquer sistema de permissões mais fino
que os cinco papéis actuais.
