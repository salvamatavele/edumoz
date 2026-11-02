## ADDED Requirements

### Requirement: Rastreabilidade integral da origem
O programa SHALL associar todas as capacidades funcionais do inventário da origem a itens verificáveis da matriz, incluindo campos, validações, estados, permissões, APIs, ficheiros, impressos e integrações. Novas descobertas MUST ampliar a matriz; nenhuma capacidade pode ser omitida sem decisão explícita do utilizador.

#### Scenario: Descoberta de funcionalidade adicional
- **WHEN** a análise de um módulo encontra uma acção ou impressão não listada
- **THEN** é criado um item com origem, destino, requisito e evidência exigida antes de aceitar o módulo.

#### Scenario: Conclusão global
- **WHEN** se solicita o fecho da clonagem
- **THEN** todos os itens funcionais estão verificados e os bloqueios ou diferenças pendentes impedem declarar paridade integral.

### Requirement: Preservação da experiência EduMoz
Todas as capacidades SHALL usar o layout, cores, tipografia, temas e componentes do EduMoz, com catálogos pt-MZ e en, navegação por papel e escola e comportamento responsivo. Impressos MUST preservar o conteúdo funcional da origem com identificação da escola activa.

#### Scenario: Troca de idioma e escola
- **WHEN** um utilizador alterna pt/en e escolas A/B numa funcionalidade migrada
- **THEN** rótulos, formatos, contexto e documentos correspondem ao idioma e escola seleccionados sem expor dados do outro tenant.

### Requirement: M01 — Identidade e administração
O EduMoz SHALL oferecer paridade funcional de identidade e administração, cobrindo: Sessões; utilizadores; papéis; permissões de leitura/escrita e excepções; recuperação; perfil; credenciais QR; auditoria; painéis por perfil. O detalhamento MUST ligar cada formulário, campo, regra e saída às fontes e aos testes antes da implementação. As permissões, posse, escola e ano aplicam-se em cada ponto de entrada.

#### Scenario: Fluxo funcional de identidade e administração
- **WHEN** um utilizador autorizado executa um percurso completo desta área com fixtures sintéticas equivalentes às da origem
- **THEN** os dados persistidos, cálculos, estados, validações e saídas correspondem ao contrato detalhado na matriz; os testes positivos e negativos passam.

#### Scenario: Recusa de acesso em M01
- **WHEN** uma conta sem permissão ou da escola B tenta ler, alterar, exportar ou imprimir um recurso de A por pedido directo
- **THEN** o servidor recusa sem revelar dados e sem produzir efeitos.

### Requirement: M02 — Estrutura académica e fichas
O EduMoz SHALL oferecer paridade funcional de estrutura académica e fichas, cobrindo: Ano em vista; anos e trimestres; classes; secções; turmas; disciplinas; docentes; pessoal; alunos; encarregados; campos obrigatórios; fotografias; documentos; assinaturas. O detalhamento MUST ligar cada formulário, campo, regra e saída às fontes e aos testes antes da implementação. As permissões, posse, escola e ano aplicam-se em cada ponto de entrada.

#### Scenario: Fluxo funcional de estrutura académica e fichas
- **WHEN** um utilizador autorizado executa um percurso completo desta área com fixtures sintéticas equivalentes às da origem
- **THEN** os dados persistidos, cálculos, estados, validações e saídas correspondem ao contrato detalhado na matriz; os testes positivos e negativos passam.

#### Scenario: Recusa de acesso em M02
- **WHEN** uma conta sem permissão ou da escola B tenta ler, alterar, exportar ou imprimir um recurso de A por pedido directo
- **THEN** o servidor recusa sem revelar dados e sem produzir efeitos.

### Requirement: M03 — Candidaturas e ingressos
O EduMoz SHALL oferecer paridade funcional de candidaturas e ingressos, cobrindo: Janelas por classe/secção; candidatura pública e pela secretaria; edição; documentos; taxas e isenções; estado; selecção; ingresso; ficha da candidatura. O detalhamento MUST ligar cada formulário, campo, regra e saída às fontes e aos testes antes da implementação. As permissões, posse, escola e ano aplicam-se em cada ponto de entrada.

#### Scenario: Fluxo funcional de candidaturas e ingressos
- **WHEN** um utilizador autorizado executa um percurso completo desta área com fixtures sintéticas equivalentes às da origem
- **THEN** os dados persistidos, cálculos, estados, validações e saídas correspondem ao contrato detalhado na matriz; os testes positivos e negativos passam.

#### Scenario: Recusa de acesso em M03
- **WHEN** uma conta sem permissão ou da escola B tenta ler, alterar, exportar ou imprimir um recurso de A por pedido directo
- **THEN** o servidor recusa sem revelar dados e sem produzir efeitos.

### Requirement: M04 — Matrículas e percurso anual
O EduMoz SHALL oferecer paridade funcional de matrículas e percurso anual, cobrindo: Matrícula; boletim; renovação individual e em lote; anulação com rasto; exames; faltas; regras de passagem; fecho anual; dívida transitada; histórico. O detalhamento MUST ligar cada formulário, campo, regra e saída às fontes e aos testes antes da implementação. As permissões, posse, escola e ano aplicam-se em cada ponto de entrada.

#### Scenario: Fluxo funcional de matrículas e percurso anual
- **WHEN** um utilizador autorizado executa um percurso completo desta área com fixtures sintéticas equivalentes às da origem
- **THEN** os dados persistidos, cálculos, estados, validações e saídas correspondem ao contrato detalhado na matriz; os testes positivos e negativos passam.

#### Scenario: Recusa de acesso em M04
- **WHEN** uma conta sem permissão ou da escola B tenta ler, alterar, exportar ou imprimir um recurso de A por pedido directo
- **THEN** o servidor recusa sem revelar dados e sem produzir efeitos.

### Requirement: M05 — Atribuições e horários
O EduMoz SHALL oferecer paridade funcional de atribuições e horários, cobrindo: Atribuições por docente/turma/disciplina; derivação do horário; tempos; salas; grupos paralelos; conflitos e sobreposições autorizadas; impressão por turma/docente. O detalhamento MUST ligar cada formulário, campo, regra e saída às fontes e aos testes antes da implementação. As permissões, posse, escola e ano aplicam-se em cada ponto de entrada.

#### Scenario: Fluxo funcional de atribuições e horários
- **WHEN** um utilizador autorizado executa um percurso completo desta área com fixtures sintéticas equivalentes às da origem
- **THEN** os dados persistidos, cálculos, estados, validações e saídas correspondem ao contrato detalhado na matriz; os testes positivos e negativos passam.

#### Scenario: Recusa de acesso em M05
- **WHEN** uma conta sem permissão ou da escola B tenta ler, alterar, exportar ou imprimir um recurso de A por pedido directo
- **THEN** o servidor recusa sem revelar dados e sem produzir efeitos.

### Requirement: M06 — Avaliação e comportamento
O EduMoz SHALL oferecer paridade funcional de avaliação e comportamento, cobrindo: Componentes; planos e lançamento de notas; dispensas; limites; fecho e desbloqueios; exames; comportamento disciplinar/trimestral/anual; pautas trimestrais/anuais/globais; mapas; boletins. O detalhamento MUST ligar cada formulário, campo, regra e saída às fontes e aos testes antes da implementação. As permissões, posse, escola e ano aplicam-se em cada ponto de entrada.

#### Scenario: Fluxo funcional de avaliação e comportamento
- **WHEN** um utilizador autorizado executa um percurso completo desta área com fixtures sintéticas equivalentes às da origem
- **THEN** os dados persistidos, cálculos, estados, validações e saídas correspondem ao contrato detalhado na matriz; os testes positivos e negativos passam.

#### Scenario: Recusa de acesso em M06
- **WHEN** uma conta sem permissão ou da escola B tenta ler, alterar, exportar ou imprimir um recurso de A por pedido directo
- **THEN** o servidor recusa sem revelar dados e sem produzir efeitos.

### Requirement: M07 — Calendários de avaliações e exames
O EduMoz SHALL oferecer paridade funcional de calendários de avaliações e exames, cobrindo: ACS; semanas de AT; mapas de exames nacionais; blocos; disciplinas; turmas; vigilantes; supervisores; colisões; publicação; renomeação; eliminação segura. O detalhamento MUST ligar cada formulário, campo, regra e saída às fontes e aos testes antes da implementação. As permissões, posse, escola e ano aplicam-se em cada ponto de entrada.

#### Scenario: Fluxo funcional de calendários de avaliações e exames
- **WHEN** um utilizador autorizado executa um percurso completo desta área com fixtures sintéticas equivalentes às da origem
- **THEN** os dados persistidos, cálculos, estados, validações e saídas correspondem ao contrato detalhado na matriz; os testes positivos e negativos passam.

#### Scenario: Recusa de acesso em M07
- **WHEN** uma conta sem permissão ou da escola B tenta ler, alterar, exportar ou imprimir um recurso de A por pedido directo
- **THEN** o servidor recusa sem revelar dados e sem produzir efeitos.

### Requirement: M08 — Diário e livro de turma
O EduMoz SHALL oferecer paridade funcional de diário e livro de turma, cobrindo: Aulas do horário; número da lição; sumários; presenças; faltas e justificação; fecho; sumário semanal; páginas fixas do livro de turma. O detalhamento MUST ligar cada formulário, campo, regra e saída às fontes e aos testes antes da implementação. As permissões, posse, escola e ano aplicam-se em cada ponto de entrada.

#### Scenario: Fluxo funcional de diário e livro de turma
- **WHEN** um utilizador autorizado executa um percurso completo desta área com fixtures sintéticas equivalentes às da origem
- **THEN** os dados persistidos, cálculos, estados, validações e saídas correspondem ao contrato detalhado na matriz; os testes positivos e negativos passam.

#### Scenario: Recusa de acesso em M08
- **WHEN** uma conta sem permissão ou da escola B tenta ler, alterar, exportar ou imprimir um recurso de A por pedido directo
- **THEN** o servidor recusa sem revelar dados e sem produzir efeitos.

### Requirement: M09 — Planificação e materiais
O EduMoz SHALL oferecer paridade funcional de planificação e materiais, cobrindo: Plano analítico; semanas; plano quinzenal; plano diário e etapas; actas; revisão/aprovação; materiais; relatórios e impressões. O detalhamento MUST ligar cada formulário, campo, regra e saída às fontes e aos testes antes da implementação. As permissões, posse, escola e ano aplicam-se em cada ponto de entrada.

#### Scenario: Fluxo funcional de planificação e materiais
- **WHEN** um utilizador autorizado executa um percurso completo desta área com fixtures sintéticas equivalentes às da origem
- **THEN** os dados persistidos, cálculos, estados, validações e saídas correspondem ao contrato detalhado na matriz; os testes positivos e negativos passam.

#### Scenario: Recusa de acesso em M09
- **WHEN** uma conta sem permissão ou da escola B tenta ler, alterar, exportar ou imprimir um recurso de A por pedido directo
- **THEN** o servidor recusa sem revelar dados e sem produzir efeitos.

### Requirement: M10 — Finanças e pagamentos online
O EduMoz SHALL oferecer paridade funcional de finanças e pagamentos online, cobrindo: Taxas; preços; descontos; multas; cobranças; pagamentos e alocações; saldo e aplicação de crédito; anulação/reversão; recibos e talões; extractos; dívida; pagamentos de outros anos; operador online; webhook. O detalhamento MUST ligar cada formulário, campo, regra e saída às fontes e aos testes antes da implementação. As permissões, posse, escola e ano aplicam-se em cada ponto de entrada.

#### Scenario: Fluxo funcional de finanças e pagamentos online
- **WHEN** um utilizador autorizado executa um percurso completo desta área com fixtures sintéticas equivalentes às da origem
- **THEN** os dados persistidos, cálculos, estados, validações e saídas correspondem ao contrato detalhado na matriz; os testes positivos e negativos passam.

#### Scenario: Recusa de acesso em M10
- **WHEN** uma conta sem permissão ou da escola B tenta ler, alterar, exportar ou imprimir um recurso de A por pedido directo
- **THEN** o servidor recusa sem revelar dados e sem produzir efeitos.

### Requirement: M11 — Actividades extracurriculares
O EduMoz SHALL oferecer paridade funcional de actividades extracurriculares, cobrindo: Actividades; níveis; turmas e horários; membros e inscrições; presenças; avaliações; progressão; propinas; cobranças; pagamentos; cumulativos e relatórios. O detalhamento MUST ligar cada formulário, campo, regra e saída às fontes e aos testes antes da implementação. As permissões, posse, escola e ano aplicam-se em cada ponto de entrada.

#### Scenario: Fluxo funcional de actividades extracurriculares
- **WHEN** um utilizador autorizado executa um percurso completo desta área com fixtures sintéticas equivalentes às da origem
- **THEN** os dados persistidos, cálculos, estados, validações e saídas correspondem ao contrato detalhado na matriz; os testes positivos e negativos passam.

#### Scenario: Recusa de acesso em M11
- **WHEN** uma conta sem permissão ou da escola B tenta ler, alterar, exportar ou imprimir um recurso de A por pedido directo
- **THEN** o servidor recusa sem revelar dados e sem produzir efeitos.

### Requirement: M12 — Documentos e cartões
O EduMoz SHALL oferecer paridade funcional de documentos e cartões, cobrindo: Declarações; certificados e verificação; fichas; boletins; cartões; QR; credenciais; emissão e revogação; instantâneos; fotografias; anexos; PDF e exportações. O detalhamento MUST ligar cada formulário, campo, regra e saída às fontes e aos testes antes da implementação. As permissões, posse, escola e ano aplicam-se em cada ponto de entrada.

#### Scenario: Fluxo funcional de documentos e cartões
- **WHEN** um utilizador autorizado executa um percurso completo desta área com fixtures sintéticas equivalentes às da origem
- **THEN** os dados persistidos, cálculos, estados, validações e saídas correspondem ao contrato detalhado na matriz; os testes positivos e negativos passam.

#### Scenario: Recusa de acesso em M12
- **WHEN** uma conta sem permissão ou da escola B tenta ler, alterar, exportar ou imprimir um recurso de A por pedido directo
- **THEN** o servidor recusa sem revelar dados e sem produzir efeitos.

### Requirement: M13 — Portaria e livro de ponto
O EduMoz SHALL oferecer paridade funcional de portaria e livro de ponto, cobrindo: Entradas/saídas de alunos, docentes e pessoal; cartões e leitor de mão; modo leitor; terminal; aparelhos matriculados; bloqueio; livro de ponto; avisos. O detalhamento MUST ligar cada formulário, campo, regra e saída às fontes e aos testes antes da implementação. As permissões, posse, escola e ano aplicam-se em cada ponto de entrada.

#### Scenario: Fluxo funcional de portaria e livro de ponto
- **WHEN** um utilizador autorizado executa um percurso completo desta área com fixtures sintéticas equivalentes às da origem
- **THEN** os dados persistidos, cálculos, estados, validações e saídas correspondem ao contrato detalhado na matriz; os testes positivos e negativos passam.

#### Scenario: Recusa de acesso em M13
- **WHEN** uma conta sem permissão ou da escola B tenta ler, alterar, exportar ou imprimir um recurso de A por pedido directo
- **THEN** o servidor recusa sem revelar dados e sem produzir efeitos.

### Requirement: M14 — Comunicação e avisos
O EduMoz SHALL oferecer paridade funcional de comunicação e avisos, cobrindo: Comunicados; destinatários; anexos; respostas e conversa individual; caixa de avisos; por ler; push; aparelhos; rotina diária; SMS/WhatsApp conforme integração. O detalhamento MUST ligar cada formulário, campo, regra e saída às fontes e aos testes antes da implementação. As permissões, posse, escola e ano aplicam-se em cada ponto de entrada.

#### Scenario: Fluxo funcional de comunicação e avisos
- **WHEN** um utilizador autorizado executa um percurso completo desta área com fixtures sintéticas equivalentes às da origem
- **THEN** os dados persistidos, cálculos, estados, validações e saídas correspondem ao contrato detalhado na matriz; os testes positivos e negativos passam.

#### Scenario: Recusa de acesso em M14
- **WHEN** uma conta sem permissão ou da escola B tenta ler, alterar, exportar ou imprimir um recurso de A por pedido directo
- **THEN** o servidor recusa sem revelar dados e sem produzir efeitos.

### Requirement: M15 — Portal, painéis e relatórios
O EduMoz SHALL oferecer paridade funcional de portal, painéis e relatórios, cobrindo: Percurso por ano; notas; boletins; horário; aulas; materiais; avaliações; actividades; finanças; portaria; faltas; avisos; painéis por perfil; todos os relatórios e exportações. O detalhamento MUST ligar cada formulário, campo, regra e saída às fontes e aos testes antes da implementação. As permissões, posse, escola e ano aplicam-se em cada ponto de entrada.

#### Scenario: Fluxo funcional de portal, painéis e relatórios
- **WHEN** um utilizador autorizado executa um percurso completo desta área com fixtures sintéticas equivalentes às da origem
- **THEN** os dados persistidos, cálculos, estados, validações e saídas correspondem ao contrato detalhado na matriz; os testes positivos e negativos passam.

#### Scenario: Recusa de acesso em M15
- **WHEN** uma conta sem permissão ou da escola B tenta ler, alterar, exportar ou imprimir um recurso de A por pedido directo
- **THEN** o servidor recusa sem revelar dados e sem produzir efeitos.

### Requirement: Fidelidade de fichas e impressos
O sistema SHALL reproduzir todos os campos e validações de fichas/formulários e todas as saídas da origem, incluindo pautas, mapas, boletins, recibos, talões, declarações, cartões e planos. Cada saída MUST ter comparação funcional e visual, identificação correcta da escola, assinaturas, totais, margens e paginação verificados.

#### Scenario: Documento extenso
- **WHEN** é gerado um impresso com nomes longos, várias páginas e tabelas extensas
- **THEN** não há campos, totais ou assinaturas cortados; cabeçalhos e quebras são legíveis e o PDF corresponde à pré-visualização aprovada.

### Requirement: Compatibilidade e evolução das specs
As capacidades existentes SHALL continuar a cumprir as specs actuais. Antes de alterar um requisito existente, o módulo MUST incluir a delta OpenSpec completa e uma spec detalhada em docs/specs com requisitos, desenho e aceitação aprovada.

#### Scenario: Regra existente afectada
- **WHEN** um módulo necessita alterar uma regra de matrículas ou avaliação já especificada
- **THEN** a delta identifica a regra completa e a migração antes de qualquer implementação dessa mudança.
