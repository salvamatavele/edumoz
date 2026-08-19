# platform-admin-access

## Purpose

`User.isPlatformAdmin` corrigido de ponta a ponta (JWT, sessão, `SessionContext`) — um
superadmin passa a ter acesso total, em qualquer escola, sem depender de nenhuma
`Membership`, e sem ser restringido por nenhum `PermissionRole` configurável.

## Requirements

### Requirement: `isPlatformAdmin` viaja na sessão
O sistema SHALL incluir o valor real de `User.isPlatformAdmin` no JWT e na sessão, e
SHALL usar esse valor (não um valor fixo) em toda a `SessionContext` construída pelas
Server Actions e páginas.

#### Scenario: Utilizador com isPlatformAdmin
- **WHEN** um utilizador com `User.isPlatformAdmin: true` inicia sessão
- **THEN** `session.isPlatformAdmin` (ou equivalente na sessão) é `true`, e continua
  `true` depois de trocar de escola

### Requirement: Superadmin tem acesso total, em qualquer escola
O sistema SHALL conceder a um utilizador com `isPlatformAdmin: true` acesso equivalente a
`isSchoolAdministrator` e a `hasPermission` (todas as combinações) em qualquer escola,
independentemente de ter `Membership` nessa escola.

#### Scenario: Superadmin sem Membership na escola
- **WHEN** um superadmin acede a uma escola onde não tem nenhuma `Membership`
- **THEN** as acções que dependem de `isSchoolAdministrator`/`hasPermission` são permitidas
  na mesma

### Requirement: Superadmin não é restringido por um papel configurável
O sistema SHALL NOT aplicar nenhuma restrição de `PermissionRole` a um utilizador com
`isPlatformAdmin: true` — `hasPermission` SHALL devolver sempre verdadeiro para ele, antes
de sequer olhar para papéis configuráveis.

#### Scenario: Superadmin com Membership restrita
- **WHEN** um superadmin tem também uma `Membership` de `SCHOOL_MANAGER` com um
  `PermissionRole` limitado atribuído
- **THEN** continua com acesso total — o estatuto de superadmin prevalece sobre qualquer
  papel configurável
