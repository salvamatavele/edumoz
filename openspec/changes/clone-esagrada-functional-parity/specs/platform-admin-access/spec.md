## MODIFIED Requirements

### Requirement: `isPlatformAdmin` viaja na sessão
O sistema SHALL incluir o valor real de `User.isPlatformAdmin` no JWT e na sessão, e
SHALL usar esse valor (não um valor fixo) em toda a `SessionContext` construída pelas
Server Actions e páginas. A sessão MUST reler o valor persistido e a actividade da conta em cada pedido; o valor antigo do JWT não concede privilégios revogados.

#### Scenario: Utilizador com isPlatformAdmin
- **WHEN** um utilizador com `User.isPlatformAdmin: true` inicia sessão
- **THEN** `session.isPlatformAdmin` é `true` e continua `true` depois de trocar de escola enquanto o privilégio persistido permanecer activo.

#### Scenario: Privilégio retirado durante a sessão
- **WHEN** `User.isPlatformAdmin` passa a `false` com JWT ainda válido
- **THEN** o pedido seguinte não recebe privilégio de plataforma e só pode usar memberships activas.
