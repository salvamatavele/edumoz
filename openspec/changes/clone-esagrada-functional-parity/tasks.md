# Plano de implementação sequencial

Proposta aprovada pelo utilizador em 2026-10-27. Execução iniciada pela fundação; progresso e evidências em implementation-progress.md. Os grupos M01–M15 seguem a matriz. Cada tarefa funcional inclui testes relevantes até verde antes da seguinte; se exceder uma sessão, subdividir em checkboxes mantendo todos os critérios. Não marcar a entrega como aceite por existirem apenas modelos ou ecrãs.

## 1. Preparação e fundação transversal

- [x] 1.1 Obter aprovação da proposta e do contrato em docs/specs/esagrada-functional-parity.md antes de escrever aplicação.
- [x] 1.2 Registar alterações locais do EduMoz e hashes da origem sem sobrescrever trabalho existente; reconciliar inventário de rotas, actions, ficheiros e impressos com a matriz.
- [x] 1.3 Confirmar Node/pnpm e MariaDB locais; documentar portas e comandos sem Docker, sem imprimir segredos.
- [x] 1.4 Separar base de desenvolvimento e base de testes, criar fixtures sintéticas de duas escolas e guardas contra execução de testes em base indevida; testar a recusa.
- [x] 1.5 Ensaiar backup e restore sintéticos de base e storage e documentar recuperação antes de migrações.
- [x] 1.6 Recolher baseline de lint, tipos, testes e build e do navegador actual; distinguir falhas anteriores e regressões.
- [x] 1.7 Resolver divergências da documentação de design preservando o EduMoz actual; ler skills de UI e guia Next local antes da implementação.
- [x] 1.8 Especificar e aprovar a fronteira de autorização efectiva, incluindo deltas das capacidades existentes; implementar contexto validado por pedido e testar revogação.
- [x] 1.9 Migrar leituras/actions/APIs existentes para permissões e posse efectivas; testar gestor restrito e pedidos directos.
- [x] 1.10 Proteger referências, junções, nested writes, updates e upserts entre escolas/anos com validação e constraints; testar IDs cruzados.
- [x] 1.11 Corrigir bloqueio após fecho e limites de notas no servidor; testar nota acima do máximo, reabertura auditada e corrida com fecho.
- [x] 1.12 Corrigir idempotência e concorrência da facturação/pagamentos existentes; testar geração simultânea, confirmação/reversão e reconciliação de saldos.
- [x] 1.13 Estabelecer as fronteiras dos percursos existentes: contexto de cache, origem, cabeçalhos, logs redigidos e limites, com regressão e inventário de ficheiros. Armazenamento privado é pré-requisito bloqueante do primeiro consumidor M01-PROFILE/M01-DOCUMENTS ou M02, antes de uploads; não há upload existente a declarar implementado. Aceitação e dependência explícita em docs/specs/esagrada-foundation-acceptance.md.
- [x] 1.14 Verificar a fundação no navegador em pt/en, escolas A/B e papéis restritos; fechar anomalias bloqueantes antes de M01.

## 2. M01 — Identidade e administração

Contrato aprovado em 2026-10-28. Consulta/estado, troca própria/revogação e criação/credencial inicial foram verificadas (111 ficheiros/1001 testes). Contactos novos são de comunicação; autenticação nova por código próprio. A tarefa 2.5 foi subdividida para registar entregas concretas sem aceitar a gestão completa. Convites, edição, perfis avançados e restantes dependências continuam pendentes; 2.1/2.3/2.4 mantêm os critérios integrais por verificar.

- [ ] 2.1 Ler os ficheiros, specs e testes de ``identity`` da origem; decompor campos, formulários, regras, estados, APIs e impressos deste módulo em itens rastreáveis, confirmando hashes.
- [x] 2.2 Escrever e aprovar docs/specs/esagrada-m01.md e deltas OpenSpec aplicáveis, com exemplos reais anonimizados/sintéticos, correspondência de modelos e critérios de aceitação.
- [ ] 2.3 Preparar migrações aditivas e backfill necessários; rever SQL e validar esquema/constraints em base vazia e base sintética com dados anteriores, mantendo testes verdes.
- [x] 2.4 Implementar e testar até verde: Sessões; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
2.5 — Utilizadores, subdividido sem reduzir o contrato M01:

- [x] 2.5.1 Consulta escolar paginada, filtros SQL, contactos/códigos, vínculos e permissões de leitura, em pt/en.
- [x] 2.5.2 Activação/suspensão local, auditoria, protecção de plataforma e último gestor utilizável, preservando outras escolas.
- [x] 2.5.3 Criação atómica/idempotente de conta nova, papéis base existentes e ficha docente local; código próprio, contactos privados sem associação, credencial aleatória de 24h, substituição obrigatória e reemissão inicial restrita, com integração e navegador.
2.5.4 — Edição, subdividida sem reduzir o contrato:

- [x] 2.5.4.1 Edição de nome/contactos de comunicação em contas exclusivas, revisão concorrente, auditoria atómica redigida, preservação de login/acesso e recusa de contexto escolar desactualizado; integração e navegador pt/en/móvel.
2.5.4.2 — Vínculos profissionais, subdivididos sem reduzir o contrato:

- [x] 2.5.4.2.1 Ligar/substituir/desligar ficha docente local com prévia nome/código, papel Teacher activo, revisões, auditoria transaccional e preservação da escola B/histórico; integração e navegador pt/en/móvel.
- [x] 2.5.4.2.2 Preparar ficha de funcionário e gestão dos respectivos vínculos, incluindo acumulação docente/funcionário, sem alterar identidade global partilhada por decisão unilateral da escola.
- [ ] 2.5.5 Convite com prova de posse, verificação/conciliação de contactos e reutilização consentida da identidade global, sem enumeração ou herança automática.
- [x] 2.5.6 Retirada local de associação com confirmação/auditoria, preservação de fichas/histórico e última via administrativa.
2.6 — Papéis, subdivididos sem reduzir o contrato:

- [x] 2.6.1 Corrigir criação/atribuição existentes com autoridade persistida, escola fixa, idempotência, catálogo completo sem grants e última via administrativa; integração e navegador pt/en/móvel.
- [x] 2.6.2 Completar edição/eliminação e matriz de papéis, com revisões, auditoria atómica, referências históricas preservadas e perfis de sistema protegidos.
- [x] 2.6.3 Integrar os nove perfis funcionais de sistema e seed idempotente, sem sobrescrever ajustes nem conceder automaticamente recursos novos; mapear as 55 capacidades e dependências.
- [x] 2.6.4 Integrar atribuições múltiplas por associação escolar e compatibilidade da ponte permissionRoleId, comparando permissões antes/depois e preservando posse docente/familiar.
2.7 — Permissões e excepções, subdivididas sem reduzir o contrato:

- [ ] 2.7.1 Excepções por associação sobre as acções administrativas consumidas: herdar/negar/permitir, motivo, revisão, precedência sobre união, isolamento escolar, última via administrativa, interface pt/en/móvel e integração/navegador.
- [ ] 2.7.2 Integrar as capacidades da origem de gerir perfis/excepções com autoridade delegada explícita e guards reais; impedir auto-elevação/concessões superiores às do actor, manter protecções de própria conta/plataforma/última via e validar correspondência de leitura/escrita e dependências finas por consumidor.
- [ ] 2.8 Implementar e testar até verde: recuperação; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 2.9 Implementar e testar até verde: perfil; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 2.10 Implementar e testar até verde: credenciais QR; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 2.11 Implementar e testar até verde: auditoria; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 2.12 Implementar e testar até verde: painéis por perfil; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 2.13 Reproduzir e corrigir anomalias encontradas no módulo, registando evidência, decisão e testes de regressão; comunicar riscos e diferenças de negócio ao utilizador.
- [ ] 2.14 Executar integração com MariaDB e testes negativos de posse, escolas A/B, anos, permissões e concorrência aplicáveis; não avançar com falhas.
- [ ] 2.15 Executar testes automatizados e manuais no navegador local em pt/en, desktop/móvel, com os papéis aplicáveis; verificar persistência, erros, consola e rede e guardar evidências sintéticas.
- [ ] 2.16 Comparar todos os impressos/PDF/exportações do módulo com a origem: campos, valores, identificação da escola, assinaturas, paginação e documentos extensos; registar evidências.
- [ ] 2.17 Medir consultas e payloads dos fluxos do módulo com dados sintéticos; corrigir N+1, listas sem limite e tarefas longas; executar regressão dos módulos anteriores afectados.
- [ ] 2.18 Actualizar matriz, documentação e anomalias; executar lint, tipos, testes e build relevantes; aceitar o módulo apenas sem itens obrigatórios pendentes antes de iniciar o seguinte.

## 3. M02 — Estrutura académica e fichas

- [ ] 3.1 Ler os ficheiros, specs e testes de ``academic`` da origem; decompor campos, formulários, regras, estados, APIs e impressos deste módulo em itens rastreáveis, confirmando hashes.
- [ ] 3.2 Escrever e aprovar docs/specs/esagrada-m02.md e deltas OpenSpec aplicáveis, com exemplos reais anonimizados/sintéticos, correspondência de modelos e critérios de aceitação.
- [ ] 3.3 Preparar migrações aditivas e backfill necessários; rever SQL e validar esquema/constraints em base vazia e base sintética com dados anteriores, mantendo testes verdes.
- [ ] 3.4 Implementar e testar até verde: Ano em vista; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 3.5 Implementar e testar até verde: anos e trimestres; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 3.6 Implementar e testar até verde: classes; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 3.7 Implementar e testar até verde: secções; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 3.8 Implementar e testar até verde: turmas; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 3.9 Implementar e testar até verde: disciplinas; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 3.10 Implementar e testar até verde: docentes; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 3.11 Implementar e testar até verde: pessoal; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 3.12 Implementar e testar até verde: alunos; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 3.13 Implementar e testar até verde: encarregados; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 3.14 Implementar e testar até verde: campos obrigatórios; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 3.15 Implementar e testar até verde: fotografias; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 3.16 Implementar e testar até verde: documentos; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 3.17 Implementar e testar até verde: assinaturas; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 3.18 Reproduzir e corrigir anomalias encontradas no módulo, registando evidência, decisão e testes de regressão; comunicar riscos e diferenças de negócio ao utilizador.
- [ ] 3.19 Executar integração com MariaDB e testes negativos de posse, escolas A/B, anos, permissões e concorrência aplicáveis; não avançar com falhas.
- [ ] 3.20 Executar testes automatizados e manuais no navegador local em pt/en, desktop/móvel, com os papéis aplicáveis; verificar persistência, erros, consola e rede e guardar evidências sintéticas.
- [ ] 3.21 Comparar todos os impressos/PDF/exportações do módulo com a origem: campos, valores, identificação da escola, assinaturas, paginação e documentos extensos; registar evidências.
- [ ] 3.22 Medir consultas e payloads dos fluxos do módulo com dados sintéticos; corrigir N+1, listas sem limite e tarefas longas; executar regressão dos módulos anteriores afectados.
- [ ] 3.23 Actualizar matriz, documentação e anomalias; executar lint, tipos, testes e build relevantes; aceitar o módulo apenas sem itens obrigatórios pendentes antes de iniciar o seguinte.

## 4. M03 — Candidaturas e ingressos

- [ ] 4.1 Ler os ficheiros, specs e testes de ``admissions`` da origem; decompor campos, formulários, regras, estados, APIs e impressos deste módulo em itens rastreáveis, confirmando hashes.
- [ ] 4.2 Escrever e aprovar docs/specs/esagrada-m03.md e deltas OpenSpec aplicáveis, com exemplos reais anonimizados/sintéticos, correspondência de modelos e critérios de aceitação.
- [ ] 4.3 Preparar migrações aditivas e backfill necessários; rever SQL e validar esquema/constraints em base vazia e base sintética com dados anteriores, mantendo testes verdes.
- [ ] 4.4 Implementar e testar até verde: Janelas por classe/secção; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 4.5 Implementar e testar até verde: candidatura pública e pela secretaria; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 4.6 Implementar e testar até verde: edição; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 4.7 Implementar e testar até verde: documentos; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 4.8 Implementar e testar até verde: taxas e isenções; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 4.9 Implementar e testar até verde: estado; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 4.10 Implementar e testar até verde: selecção; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 4.11 Implementar e testar até verde: ingresso; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 4.12 Implementar e testar até verde: ficha da candidatura; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 4.13 Reproduzir e corrigir anomalias encontradas no módulo, registando evidência, decisão e testes de regressão; comunicar riscos e diferenças de negócio ao utilizador.
- [ ] 4.14 Executar integração com MariaDB e testes negativos de posse, escolas A/B, anos, permissões e concorrência aplicáveis; não avançar com falhas.
- [ ] 4.15 Executar testes automatizados e manuais no navegador local em pt/en, desktop/móvel, com os papéis aplicáveis; verificar persistência, erros, consola e rede e guardar evidências sintéticas.
- [ ] 4.16 Comparar todos os impressos/PDF/exportações do módulo com a origem: campos, valores, identificação da escola, assinaturas, paginação e documentos extensos; registar evidências.
- [ ] 4.17 Medir consultas e payloads dos fluxos do módulo com dados sintéticos; corrigir N+1, listas sem limite e tarefas longas; executar regressão dos módulos anteriores afectados.
- [ ] 4.18 Actualizar matriz, documentação e anomalias; executar lint, tipos, testes e build relevantes; aceitar o módulo apenas sem itens obrigatórios pendentes antes de iniciar o seguinte.

## 5. M04 — Matrículas e percurso anual

- [ ] 5.1 Ler os ficheiros, specs e testes de ``academic`` da origem; decompor campos, formulários, regras, estados, APIs e impressos deste módulo em itens rastreáveis, confirmando hashes.
- [ ] 5.2 Escrever e aprovar docs/specs/esagrada-m04.md e deltas OpenSpec aplicáveis, com exemplos reais anonimizados/sintéticos, correspondência de modelos e critérios de aceitação.
- [ ] 5.3 Preparar migrações aditivas e backfill necessários; rever SQL e validar esquema/constraints em base vazia e base sintética com dados anteriores, mantendo testes verdes.
- [ ] 5.4 Implementar e testar até verde: Matrícula; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 5.5 Implementar e testar até verde: boletim; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 5.6 Implementar e testar até verde: renovação individual e em lote; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 5.7 Implementar e testar até verde: anulação com rasto; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 5.8 Implementar e testar até verde: exames; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 5.9 Implementar e testar até verde: faltas; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 5.10 Implementar e testar até verde: regras de passagem; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 5.11 Implementar e testar até verde: fecho anual; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 5.12 Implementar e testar até verde: dívida transitada; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 5.13 Implementar e testar até verde: histórico; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 5.14 Reproduzir e corrigir anomalias encontradas no módulo, registando evidência, decisão e testes de regressão; comunicar riscos e diferenças de negócio ao utilizador.
- [ ] 5.15 Executar integração com MariaDB e testes negativos de posse, escolas A/B, anos, permissões e concorrência aplicáveis; não avançar com falhas.
- [ ] 5.16 Executar testes automatizados e manuais no navegador local em pt/en, desktop/móvel, com os papéis aplicáveis; verificar persistência, erros, consola e rede e guardar evidências sintéticas.
- [ ] 5.17 Comparar todos os impressos/PDF/exportações do módulo com a origem: campos, valores, identificação da escola, assinaturas, paginação e documentos extensos; registar evidências.
- [ ] 5.18 Medir consultas e payloads dos fluxos do módulo com dados sintéticos; corrigir N+1, listas sem limite e tarefas longas; executar regressão dos módulos anteriores afectados.
- [ ] 5.19 Actualizar matriz, documentação e anomalias; executar lint, tipos, testes e build relevantes; aceitar o módulo apenas sem itens obrigatórios pendentes antes de iniciar o seguinte.

## 6. M05 — Atribuições e horários

- [ ] 6.1 Ler os ficheiros, specs e testes de ``scheduling`` da origem; decompor campos, formulários, regras, estados, APIs e impressos deste módulo em itens rastreáveis, confirmando hashes.
- [ ] 6.2 Escrever e aprovar docs/specs/esagrada-m05.md e deltas OpenSpec aplicáveis, com exemplos reais anonimizados/sintéticos, correspondência de modelos e critérios de aceitação.
- [ ] 6.3 Preparar migrações aditivas e backfill necessários; rever SQL e validar esquema/constraints em base vazia e base sintética com dados anteriores, mantendo testes verdes.
- [ ] 6.4 Implementar e testar até verde: Atribuições por docente/turma/disciplina; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 6.5 Implementar e testar até verde: derivação do horário; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 6.6 Implementar e testar até verde: tempos; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 6.7 Implementar e testar até verde: salas; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 6.8 Implementar e testar até verde: grupos paralelos; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 6.9 Implementar e testar até verde: conflitos e sobreposições autorizadas; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 6.10 Implementar e testar até verde: impressão por turma/docente; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 6.11 Reproduzir e corrigir anomalias encontradas no módulo, registando evidência, decisão e testes de regressão; comunicar riscos e diferenças de negócio ao utilizador.
- [ ] 6.12 Executar integração com MariaDB e testes negativos de posse, escolas A/B, anos, permissões e concorrência aplicáveis; não avançar com falhas.
- [ ] 6.13 Executar testes automatizados e manuais no navegador local em pt/en, desktop/móvel, com os papéis aplicáveis; verificar persistência, erros, consola e rede e guardar evidências sintéticas.
- [ ] 6.14 Comparar todos os impressos/PDF/exportações do módulo com a origem: campos, valores, identificação da escola, assinaturas, paginação e documentos extensos; registar evidências.
- [ ] 6.15 Medir consultas e payloads dos fluxos do módulo com dados sintéticos; corrigir N+1, listas sem limite e tarefas longas; executar regressão dos módulos anteriores afectados.
- [ ] 6.16 Actualizar matriz, documentação e anomalias; executar lint, tipos, testes e build relevantes; aceitar o módulo apenas sem itens obrigatórios pendentes antes de iniciar o seguinte.

## 7. M06 — Avaliação e comportamento

- [ ] 7.1 Ler os ficheiros, specs e testes de ``assessment`` da origem; decompor campos, formulários, regras, estados, APIs e impressos deste módulo em itens rastreáveis, confirmando hashes.
- [ ] 7.2 Escrever e aprovar docs/specs/esagrada-m06.md e deltas OpenSpec aplicáveis, com exemplos reais anonimizados/sintéticos, correspondência de modelos e critérios de aceitação.
- [ ] 7.3 Preparar migrações aditivas e backfill necessários; rever SQL e validar esquema/constraints em base vazia e base sintética com dados anteriores, mantendo testes verdes.
- [ ] 7.4 Implementar e testar até verde: Componentes; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 7.5 Implementar e testar até verde: planos e lançamento de notas; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 7.6 Implementar e testar até verde: dispensas; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 7.7 Implementar e testar até verde: limites; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 7.8 Implementar e testar até verde: fecho e desbloqueios; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 7.9 Implementar e testar até verde: exames; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 7.10 Implementar e testar até verde: comportamento disciplinar/trimestral/anual; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 7.11 Implementar e testar até verde: pautas trimestrais/anuais/globais; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 7.12 Implementar e testar até verde: mapas; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 7.13 Implementar e testar até verde: boletins; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 7.14 Reproduzir e corrigir anomalias encontradas no módulo, registando evidência, decisão e testes de regressão; comunicar riscos e diferenças de negócio ao utilizador.
- [ ] 7.15 Executar integração com MariaDB e testes negativos de posse, escolas A/B, anos, permissões e concorrência aplicáveis; não avançar com falhas.
- [ ] 7.16 Executar testes automatizados e manuais no navegador local em pt/en, desktop/móvel, com os papéis aplicáveis; verificar persistência, erros, consola e rede e guardar evidências sintéticas.
- [ ] 7.17 Comparar todos os impressos/PDF/exportações do módulo com a origem: campos, valores, identificação da escola, assinaturas, paginação e documentos extensos; registar evidências.
- [ ] 7.18 Medir consultas e payloads dos fluxos do módulo com dados sintéticos; corrigir N+1, listas sem limite e tarefas longas; executar regressão dos módulos anteriores afectados.
- [ ] 7.19 Actualizar matriz, documentação e anomalias; executar lint, tipos, testes e build relevantes; aceitar o módulo apenas sem itens obrigatórios pendentes antes de iniciar o seguinte.

## 8. M07 — Calendários de avaliações e exames

- [ ] 8.1 Ler os ficheiros, specs e testes de ``assessment`` da origem; decompor campos, formulários, regras, estados, APIs e impressos deste módulo em itens rastreáveis, confirmando hashes.
- [ ] 8.2 Escrever e aprovar docs/specs/esagrada-m07.md e deltas OpenSpec aplicáveis, com exemplos reais anonimizados/sintéticos, correspondência de modelos e critérios de aceitação.
- [ ] 8.3 Preparar migrações aditivas e backfill necessários; rever SQL e validar esquema/constraints em base vazia e base sintética com dados anteriores, mantendo testes verdes.
- [ ] 8.4 Implementar e testar até verde: ACS; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 8.5 Implementar e testar até verde: semanas de AT; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 8.6 Implementar e testar até verde: mapas de exames nacionais; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 8.7 Implementar e testar até verde: blocos; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 8.8 Implementar e testar até verde: disciplinas; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 8.9 Implementar e testar até verde: turmas; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 8.10 Implementar e testar até verde: vigilantes; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 8.11 Implementar e testar até verde: supervisores; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 8.12 Implementar e testar até verde: colisões; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 8.13 Implementar e testar até verde: publicação; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 8.14 Implementar e testar até verde: renomeação; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 8.15 Implementar e testar até verde: eliminação segura; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 8.16 Reproduzir e corrigir anomalias encontradas no módulo, registando evidência, decisão e testes de regressão; comunicar riscos e diferenças de negócio ao utilizador.
- [ ] 8.17 Executar integração com MariaDB e testes negativos de posse, escolas A/B, anos, permissões e concorrência aplicáveis; não avançar com falhas.
- [ ] 8.18 Executar testes automatizados e manuais no navegador local em pt/en, desktop/móvel, com os papéis aplicáveis; verificar persistência, erros, consola e rede e guardar evidências sintéticas.
- [ ] 8.19 Comparar todos os impressos/PDF/exportações do módulo com a origem: campos, valores, identificação da escola, assinaturas, paginação e documentos extensos; registar evidências.
- [ ] 8.20 Medir consultas e payloads dos fluxos do módulo com dados sintéticos; corrigir N+1, listas sem limite e tarefas longas; executar regressão dos módulos anteriores afectados.
- [ ] 8.21 Actualizar matriz, documentação e anomalias; executar lint, tipos, testes e build relevantes; aceitar o módulo apenas sem itens obrigatórios pendentes antes de iniciar o seguinte.

## 9. M08 — Diário e livro de turma

- [ ] 9.1 Ler os ficheiros, specs e testes de ``classbook`` da origem; decompor campos, formulários, regras, estados, APIs e impressos deste módulo em itens rastreáveis, confirmando hashes.
- [ ] 9.2 Escrever e aprovar docs/specs/esagrada-m08.md e deltas OpenSpec aplicáveis, com exemplos reais anonimizados/sintéticos, correspondência de modelos e critérios de aceitação.
- [ ] 9.3 Preparar migrações aditivas e backfill necessários; rever SQL e validar esquema/constraints em base vazia e base sintética com dados anteriores, mantendo testes verdes.
- [ ] 9.4 Implementar e testar até verde: Aulas do horário; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 9.5 Implementar e testar até verde: número da lição; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 9.6 Implementar e testar até verde: sumários; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 9.7 Implementar e testar até verde: presenças; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 9.8 Implementar e testar até verde: faltas e justificação; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 9.9 Implementar e testar até verde: fecho; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 9.10 Implementar e testar até verde: sumário semanal; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 9.11 Implementar e testar até verde: páginas fixas do livro de turma; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 9.12 Reproduzir e corrigir anomalias encontradas no módulo, registando evidência, decisão e testes de regressão; comunicar riscos e diferenças de negócio ao utilizador.
- [ ] 9.13 Executar integração com MariaDB e testes negativos de posse, escolas A/B, anos, permissões e concorrência aplicáveis; não avançar com falhas.
- [ ] 9.14 Executar testes automatizados e manuais no navegador local em pt/en, desktop/móvel, com os papéis aplicáveis; verificar persistência, erros, consola e rede e guardar evidências sintéticas.
- [ ] 9.15 Comparar todos os impressos/PDF/exportações do módulo com a origem: campos, valores, identificação da escola, assinaturas, paginação e documentos extensos; registar evidências.
- [ ] 9.16 Medir consultas e payloads dos fluxos do módulo com dados sintéticos; corrigir N+1, listas sem limite e tarefas longas; executar regressão dos módulos anteriores afectados.
- [ ] 9.17 Actualizar matriz, documentação e anomalias; executar lint, tipos, testes e build relevantes; aceitar o módulo apenas sem itens obrigatórios pendentes antes de iniciar o seguinte.

## 10. M09 — Planificação e materiais

- [ ] 10.1 Ler os ficheiros, specs e testes de ``classbook`` da origem; decompor campos, formulários, regras, estados, APIs e impressos deste módulo em itens rastreáveis, confirmando hashes.
- [ ] 10.2 Escrever e aprovar docs/specs/esagrada-m09.md e deltas OpenSpec aplicáveis, com exemplos reais anonimizados/sintéticos, correspondência de modelos e critérios de aceitação.
- [ ] 10.3 Preparar migrações aditivas e backfill necessários; rever SQL e validar esquema/constraints em base vazia e base sintética com dados anteriores, mantendo testes verdes.
- [ ] 10.4 Implementar e testar até verde: Plano analítico; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 10.5 Implementar e testar até verde: semanas; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 10.6 Implementar e testar até verde: plano quinzenal; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 10.7 Implementar e testar até verde: plano diário e etapas; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 10.8 Implementar e testar até verde: actas; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 10.9 Implementar e testar até verde: revisão/aprovação; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 10.10 Implementar e testar até verde: materiais; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 10.11 Implementar e testar até verde: relatórios e impressões; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 10.12 Reproduzir e corrigir anomalias encontradas no módulo, registando evidência, decisão e testes de regressão; comunicar riscos e diferenças de negócio ao utilizador.
- [ ] 10.13 Executar integração com MariaDB e testes negativos de posse, escolas A/B, anos, permissões e concorrência aplicáveis; não avançar com falhas.
- [ ] 10.14 Executar testes automatizados e manuais no navegador local em pt/en, desktop/móvel, com os papéis aplicáveis; verificar persistência, erros, consola e rede e guardar evidências sintéticas.
- [ ] 10.15 Comparar todos os impressos/PDF/exportações do módulo com a origem: campos, valores, identificação da escola, assinaturas, paginação e documentos extensos; registar evidências.
- [ ] 10.16 Medir consultas e payloads dos fluxos do módulo com dados sintéticos; corrigir N+1, listas sem limite e tarefas longas; executar regressão dos módulos anteriores afectados.
- [ ] 10.17 Actualizar matriz, documentação e anomalias; executar lint, tipos, testes e build relevantes; aceitar o módulo apenas sem itens obrigatórios pendentes antes de iniciar o seguinte.

## 11. M10 — Finanças e pagamentos online

- [ ] 11.1 Ler os ficheiros, specs e testes de ``finance,payments`` da origem; decompor campos, formulários, regras, estados, APIs e impressos deste módulo em itens rastreáveis, confirmando hashes.
- [ ] 11.2 Escrever e aprovar docs/specs/esagrada-m10.md e deltas OpenSpec aplicáveis, com exemplos reais anonimizados/sintéticos, correspondência de modelos e critérios de aceitação.
- [ ] 11.3 Preparar migrações aditivas e backfill necessários; rever SQL e validar esquema/constraints em base vazia e base sintética com dados anteriores, mantendo testes verdes.
- [ ] 11.4 Implementar e testar até verde: Taxas; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 11.5 Implementar e testar até verde: preços; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 11.6 Implementar e testar até verde: descontos; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 11.7 Implementar e testar até verde: multas; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 11.8 Implementar e testar até verde: cobranças; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 11.9 Implementar e testar até verde: pagamentos e alocações; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 11.10 Implementar e testar até verde: saldo e aplicação de crédito; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 11.11 Implementar e testar até verde: anulação/reversão; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 11.12 Implementar e testar até verde: recibos e talões; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 11.13 Implementar e testar até verde: extractos; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 11.14 Implementar e testar até verde: dívida; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 11.15 Implementar e testar até verde: pagamentos de outros anos; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 11.16 Implementar e testar até verde: operador online; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 11.17 Implementar e testar até verde: webhook; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 11.18 Reproduzir e corrigir anomalias encontradas no módulo, registando evidência, decisão e testes de regressão; comunicar riscos e diferenças de negócio ao utilizador.
- [ ] 11.19 Executar integração com MariaDB e testes negativos de posse, escolas A/B, anos, permissões e concorrência aplicáveis; não avançar com falhas.
- [ ] 11.20 Executar testes automatizados e manuais no navegador local em pt/en, desktop/móvel, com os papéis aplicáveis; verificar persistência, erros, consola e rede e guardar evidências sintéticas.
- [ ] 11.21 Comparar todos os impressos/PDF/exportações do módulo com a origem: campos, valores, identificação da escola, assinaturas, paginação e documentos extensos; registar evidências.
- [ ] 11.22 Medir consultas e payloads dos fluxos do módulo com dados sintéticos; corrigir N+1, listas sem limite e tarefas longas; executar regressão dos módulos anteriores afectados.
- [ ] 11.23 Actualizar matriz, documentação e anomalias; executar lint, tipos, testes e build relevantes; aceitar o módulo apenas sem itens obrigatórios pendentes antes de iniciar o seguinte.

## 12. M11 — Actividades extracurriculares

- [ ] 12.1 Ler os ficheiros, specs e testes de ``extracurricular`` da origem; decompor campos, formulários, regras, estados, APIs e impressos deste módulo em itens rastreáveis, confirmando hashes.
- [ ] 12.2 Escrever e aprovar docs/specs/esagrada-m11.md e deltas OpenSpec aplicáveis, com exemplos reais anonimizados/sintéticos, correspondência de modelos e critérios de aceitação.
- [ ] 12.3 Preparar migrações aditivas e backfill necessários; rever SQL e validar esquema/constraints em base vazia e base sintética com dados anteriores, mantendo testes verdes.
- [ ] 12.4 Implementar e testar até verde: Actividades; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 12.5 Implementar e testar até verde: níveis; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 12.6 Implementar e testar até verde: turmas e horários; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 12.7 Implementar e testar até verde: membros e inscrições; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 12.8 Implementar e testar até verde: presenças; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 12.9 Implementar e testar até verde: avaliações; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 12.10 Implementar e testar até verde: progressão; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 12.11 Implementar e testar até verde: propinas; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 12.12 Implementar e testar até verde: cobranças; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 12.13 Implementar e testar até verde: pagamentos; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 12.14 Implementar e testar até verde: cumulativos e relatórios; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 12.15 Reproduzir e corrigir anomalias encontradas no módulo, registando evidência, decisão e testes de regressão; comunicar riscos e diferenças de negócio ao utilizador.
- [ ] 12.16 Executar integração com MariaDB e testes negativos de posse, escolas A/B, anos, permissões e concorrência aplicáveis; não avançar com falhas.
- [ ] 12.17 Executar testes automatizados e manuais no navegador local em pt/en, desktop/móvel, com os papéis aplicáveis; verificar persistência, erros, consola e rede e guardar evidências sintéticas.
- [ ] 12.18 Comparar todos os impressos/PDF/exportações do módulo com a origem: campos, valores, identificação da escola, assinaturas, paginação e documentos extensos; registar evidências.
- [ ] 12.19 Medir consultas e payloads dos fluxos do módulo com dados sintéticos; corrigir N+1, listas sem limite e tarefas longas; executar regressão dos módulos anteriores afectados.
- [ ] 12.20 Actualizar matriz, documentação e anomalias; executar lint, tipos, testes e build relevantes; aceitar o módulo apenas sem itens obrigatórios pendentes antes de iniciar o seguinte.

## 13. M12 — Documentos e cartões

- [ ] 13.1 Ler os ficheiros, specs e testes de ``academic,identity`` da origem; decompor campos, formulários, regras, estados, APIs e impressos deste módulo em itens rastreáveis, confirmando hashes.
- [ ] 13.2 Escrever e aprovar docs/specs/esagrada-m12.md e deltas OpenSpec aplicáveis, com exemplos reais anonimizados/sintéticos, correspondência de modelos e critérios de aceitação.
- [ ] 13.3 Preparar migrações aditivas e backfill necessários; rever SQL e validar esquema/constraints em base vazia e base sintética com dados anteriores, mantendo testes verdes.
- [ ] 13.4 Implementar e testar até verde: Declarações; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 13.5 Implementar e testar até verde: certificados e verificação; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 13.6 Implementar e testar até verde: fichas; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 13.7 Implementar e testar até verde: boletins; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 13.8 Implementar e testar até verde: cartões; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 13.9 Implementar e testar até verde: QR; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 13.10 Implementar e testar até verde: credenciais; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 13.11 Implementar e testar até verde: emissão e revogação; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 13.12 Implementar e testar até verde: instantâneos; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 13.13 Implementar e testar até verde: fotografias; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 13.14 Implementar e testar até verde: anexos; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 13.15 Implementar e testar até verde: PDF e exportações; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 13.16 Reproduzir e corrigir anomalias encontradas no módulo, registando evidência, decisão e testes de regressão; comunicar riscos e diferenças de negócio ao utilizador.
- [ ] 13.17 Executar integração com MariaDB e testes negativos de posse, escolas A/B, anos, permissões e concorrência aplicáveis; não avançar com falhas.
- [ ] 13.18 Executar testes automatizados e manuais no navegador local em pt/en, desktop/móvel, com os papéis aplicáveis; verificar persistência, erros, consola e rede e guardar evidências sintéticas.
- [ ] 13.19 Comparar todos os impressos/PDF/exportações do módulo com a origem: campos, valores, identificação da escola, assinaturas, paginação e documentos extensos; registar evidências.
- [ ] 13.20 Medir consultas e payloads dos fluxos do módulo com dados sintéticos; corrigir N+1, listas sem limite e tarefas longas; executar regressão dos módulos anteriores afectados.
- [ ] 13.21 Actualizar matriz, documentação e anomalias; executar lint, tipos, testes e build relevantes; aceitar o módulo apenas sem itens obrigatórios pendentes antes de iniciar o seguinte.

## 14. M13 — Portaria e livro de ponto

- [ ] 14.1 Ler os ficheiros, specs e testes de ``gatehouse`` da origem; decompor campos, formulários, regras, estados, APIs e impressos deste módulo em itens rastreáveis, confirmando hashes.
- [ ] 14.2 Escrever e aprovar docs/specs/esagrada-m13.md e deltas OpenSpec aplicáveis, com exemplos reais anonimizados/sintéticos, correspondência de modelos e critérios de aceitação.
- [ ] 14.3 Preparar migrações aditivas e backfill necessários; rever SQL e validar esquema/constraints em base vazia e base sintética com dados anteriores, mantendo testes verdes.
- [ ] 14.4 Implementar e testar até verde: Entradas/saídas de alunos, docentes e pessoal; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 14.5 Implementar e testar até verde: cartões e leitor de mão; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 14.6 Implementar e testar até verde: modo leitor; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 14.7 Implementar e testar até verde: terminal; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 14.8 Implementar e testar até verde: aparelhos matriculados; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 14.9 Implementar e testar até verde: bloqueio; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 14.10 Implementar e testar até verde: livro de ponto; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 14.11 Implementar e testar até verde: avisos; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 14.12 Reproduzir e corrigir anomalias encontradas no módulo, registando evidência, decisão e testes de regressão; comunicar riscos e diferenças de negócio ao utilizador.
- [ ] 14.13 Executar integração com MariaDB e testes negativos de posse, escolas A/B, anos, permissões e concorrência aplicáveis; não avançar com falhas.
- [ ] 14.14 Executar testes automatizados e manuais no navegador local em pt/en, desktop/móvel, com os papéis aplicáveis; verificar persistência, erros, consola e rede e guardar evidências sintéticas.
- [ ] 14.15 Comparar todos os impressos/PDF/exportações do módulo com a origem: campos, valores, identificação da escola, assinaturas, paginação e documentos extensos; registar evidências.
- [ ] 14.16 Medir consultas e payloads dos fluxos do módulo com dados sintéticos; corrigir N+1, listas sem limite e tarefas longas; executar regressão dos módulos anteriores afectados.
- [ ] 14.17 Actualizar matriz, documentação e anomalias; executar lint, tipos, testes e build relevantes; aceitar o módulo apenas sem itens obrigatórios pendentes antes de iniciar o seguinte.

## 15. M14 — Comunicação e avisos

- [ ] 15.1 Ler os ficheiros, specs e testes de ``communication,notifications`` da origem; decompor campos, formulários, regras, estados, APIs e impressos deste módulo em itens rastreáveis, confirmando hashes.
- [ ] 15.2 Escrever e aprovar docs/specs/esagrada-m14.md e deltas OpenSpec aplicáveis, com exemplos reais anonimizados/sintéticos, correspondência de modelos e critérios de aceitação.
- [ ] 15.3 Preparar migrações aditivas e backfill necessários; rever SQL e validar esquema/constraints em base vazia e base sintética com dados anteriores, mantendo testes verdes.
- [ ] 15.4 Implementar e testar até verde: Comunicados; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 15.5 Implementar e testar até verde: destinatários; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 15.6 Implementar e testar até verde: anexos; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 15.7 Implementar e testar até verde: respostas e conversa individual; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 15.8 Implementar e testar até verde: caixa de avisos; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 15.9 Implementar e testar até verde: por ler; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 15.10 Implementar e testar até verde: push; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 15.11 Implementar e testar até verde: aparelhos; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 15.12 Implementar e testar até verde: rotina diária; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 15.13 Implementar e testar até verde: SMS/WhatsApp conforme integração; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 15.14 Reproduzir e corrigir anomalias encontradas no módulo, registando evidência, decisão e testes de regressão; comunicar riscos e diferenças de negócio ao utilizador.
- [ ] 15.15 Executar integração com MariaDB e testes negativos de posse, escolas A/B, anos, permissões e concorrência aplicáveis; não avançar com falhas.
- [ ] 15.16 Executar testes automatizados e manuais no navegador local em pt/en, desktop/móvel, com os papéis aplicáveis; verificar persistência, erros, consola e rede e guardar evidências sintéticas.
- [ ] 15.17 Comparar todos os impressos/PDF/exportações do módulo com a origem: campos, valores, identificação da escola, assinaturas, paginação e documentos extensos; registar evidências.
- [ ] 15.18 Medir consultas e payloads dos fluxos do módulo com dados sintéticos; corrigir N+1, listas sem limite e tarefas longas; executar regressão dos módulos anteriores afectados.
- [ ] 15.19 Actualizar matriz, documentação e anomalias; executar lint, tipos, testes e build relevantes; aceitar o módulo apenas sem itens obrigatórios pendentes antes de iniciar o seguinte.

## 16. M15 — Portal, painéis e relatórios

- [ ] 16.1 Ler os ficheiros, specs e testes de ``portal`` da origem; decompor campos, formulários, regras, estados, APIs e impressos deste módulo em itens rastreáveis, confirmando hashes.
- [ ] 16.2 Escrever e aprovar docs/specs/esagrada-m15.md e deltas OpenSpec aplicáveis, com exemplos reais anonimizados/sintéticos, correspondência de modelos e critérios de aceitação.
- [ ] 16.3 Preparar migrações aditivas e backfill necessários; rever SQL e validar esquema/constraints em base vazia e base sintética com dados anteriores, mantendo testes verdes.
- [ ] 16.4 Implementar e testar até verde: Percurso por ano; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 16.5 Implementar e testar até verde: notas; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 16.6 Implementar e testar até verde: boletins; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 16.7 Implementar e testar até verde: horário; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 16.8 Implementar e testar até verde: aulas; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 16.9 Implementar e testar até verde: materiais; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 16.10 Implementar e testar até verde: avaliações; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 16.11 Implementar e testar até verde: actividades; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 16.12 Implementar e testar até verde: finanças; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 16.13 Implementar e testar até verde: portaria; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 16.14 Implementar e testar até verde: faltas; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 16.15 Implementar e testar até verde: avisos; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 16.16 Implementar e testar até verde: painéis por perfil; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 16.17 Implementar e testar até verde: todos os relatórios e exportações; adaptar à escola/ano, permissões e idiomas do EduMoz e ligar ao item de paridade correspondente.
- [ ] 16.18 Reproduzir e corrigir anomalias encontradas no módulo, registando evidência, decisão e testes de regressão; comunicar riscos e diferenças de negócio ao utilizador.
- [ ] 16.19 Executar integração com MariaDB e testes negativos de posse, escolas A/B, anos, permissões e concorrência aplicáveis; não avançar com falhas.
- [ ] 16.20 Executar testes automatizados e manuais no navegador local em pt/en, desktop/móvel, com os papéis aplicáveis; verificar persistência, erros, consola e rede e guardar evidências sintéticas.
- [ ] 16.21 Comparar todos os impressos/PDF/exportações do módulo com a origem: campos, valores, identificação da escola, assinaturas, paginação e documentos extensos; registar evidências.
- [ ] 16.22 Medir consultas e payloads dos fluxos do módulo com dados sintéticos; corrigir N+1, listas sem limite e tarefas longas; executar regressão dos módulos anteriores afectados.
- [ ] 16.23 Actualizar matriz, documentação e anomalias; executar lint, tipos, testes e build relevantes; aceitar o módulo apenas sem itens obrigatórios pendentes antes de iniciar o seguinte.

## 17. Aceitação global e operação

- [ ] 17.1 Reconciliar os 792 caminhos iniciais e qualquer descoberta/deriva com itens funcionais verificados, justificando ficheiros sem funcionalidade e revendo diferenças da origem.
- [ ] 17.2 Executar percursos integrados: candidatura → ingresso → matrícula → atribuição/horário → aula/presença → nota/comportamento → pauta/boletim → fecho → renovação, com finanças, extracurriculares e portal.
- [ ] 17.3 Validar integrações de operador, correio, push/SMS/WhatsApp e dispositivos em sandbox/hardware disponível; manter bloqueios explícitos até obter evidência real.
- [ ] 17.4 Executar ensaios de acesso directo, escalada de privilégios, IDOR entre escolas, revogação, ficheiros maliciosos e callbacks repetidos/forjados, corrigindo falhas e registando riscos residuais.
- [ ] 17.5 Executar carga em build de produção local com dataset e metas do design; registar máquina, percentis, índices, queries e filas; resolver desvios.
- [ ] 17.6 Ensaiar migração de base sintética existente e recuperação com base/storage; reconciliar dados académicos e saldos antes/depois.
- [ ] 17.7 Executar suite completa, lint, tipos, build e regressão no navegador dos 15 módulos em pt/en e A/B; rever todos os documentos exportáveis.
- [ ] 17.8 Entregar documentação de arranque sem Docker, administração, backup/restore, integrações, segurança, métricas, matriz e anomalias; declarar conclusão apenas com todos os itens obrigatórios verificados.
