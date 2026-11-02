## ADDED Requirements

### Requirement: Notas e avaliações respeitam limites e estado do trimestre
O servidor SHALL recusar notas fora de [0,maxScore] e criações/alterações de notas ou avaliações em trimestre fechado. A transacção MUST revalidar posse, membros e estado; uma submissão com nota inválida não pode gravar parcialmente.

#### Scenario: Nota superior ao máximo
- **WHEN** um docente envia nota acima do maxScore para um membro do seu grupo
- **THEN** o servidor devolve erro e não grava notas nem auditoria de sucesso.

#### Scenario: Submissão após fecho
- **WHEN** um docente envia um lançamento com a página antiga depois de o trimestre fechar
- **THEN** a operação é recusada até reabertura autorizada.

#### Scenario: Fecho concorrente
- **WHEN** fecho e lançamento disputam o mesmo trimestre
- **THEN** o resultado inclui a nota confirmada antes do bloqueio de fecho ou a mutação é recusada após o fecho; não há pauta construída com um estado intermédio.
