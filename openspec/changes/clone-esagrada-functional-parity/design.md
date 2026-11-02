## Context

O destino usa Next.js 16.3.1, React 19, Auth.js, next-intl, Prisma 7/MariaDB e módulos `features/{identity,academic,finance}`. A origem usa a mesma geração de Next/Prisma mas Better Auth, módulos com camadas próprias, pressupostos de uma escola, integrações externas e ficheiros escolares. O inventário inicial tem 792 caminhos com hash; a matriz agrupa o trabalho em 15 entregas. Trata-se de uma proposta de programa: o detalhe de cada formulário e regra é obrigatório antes de implementar o módulo, não está alegadamente todo especificado neste documento.

Há trabalho financeiro não versionado no destino. A origem fica apenas para leitura. A leitura dos repositórios não valida fluxos em execução, documentos ou segurança operacional.

## Goals / Non-Goals

**Goals:** paridade funcional integral verificável; preservar o EduMoz visual e os dois idiomas; multi-escolas em todas as funcionalidades; execução local sem Docker; corrigir anomalias em vez de reproduzi-las; aceitação sequencial, com evidências e documentação durável.

**Non-Goals:** copiar bases ou segredos da escola; publicar em produção; prometer segurança absoluta; trocar frameworks sem necessidade; considerar um simulador como integração real; remover capacidades existentes para simplificar a migração.

## Decisions

### 1. Paridade por comportamento e evidência

Usar `parity-matrix.md` como lista de cobertura e `source-inventory.md` como referência datada. A origem combina specs, código, testes e utilização: divergências entre eles são investigadas e registadas. Por exemplo, o README OpenSpec afirma que comunicação e fecho anual estão por construir, mas existem módulos, rotas e specs correspondentes. Não usar o README como inventário final.

Alternativa rejeitada: copiar pastas integralmente, pois perderia o contrato multi-escolas, o design e o multilinguismo e importaria defeitos.

### 2. Monólito modular, migração incremental

Manter `features/<context>/{domain,data,actions,ui}` e acrescentar contextos quando delimitarem regras próprias (admissions, scheduling, assessment, classbook, extracurricular, documents, gatehouse, communication, notifications). `domain` permanece puro; casos de uso complexos podem ganhar uma camada `application` quando a orquestração justificar. Evitar mover todo o código existente antes de entregar valor. Ler a documentação local do Next e as skills pertinentes antes de escrever aplicação.

Preservar Auth.js; importar comportamentos de administração, recuperação e credenciais através de casos de uso próprios. Trocar o motor de autenticação exigiria uma decisão separada e migração de sessões/contas. Mapear entidades semanticamente: `StudentEnrolment` para matrícula anual, `Assignment` para atribuição docente, `Charge/PaymentAllocation` para cobranças e alocações; não presumir equivalência com `Invoice/Payment` do destino. Documentar essa correspondência antes de migrar.

### 3. Fronteira comum de autorização e escola

Resolver no servidor um contexto efectivo por pedido: utilizador activo, sessão válida, membership activa na escola, papéis e permissões actuais. Memoização limitada ao pedido; alterações de privilégios reflectidas no pedido seguinte. Negar por omissão; distinguir ler, criar/alterar, aprovar, emitir, exportar, reabrir e anular conforme o catálogo. Cada leitura protegida, action, API, exportação, ficheiro e job valida permissão e posse. Proxy e menus são auxiliares de UX.

`getTenantDb` continua útil mas não equivale a integridade relacional. Validar escola e ano de todas as referências e operações aninhadas; preferir restrições compostas de base de dados onde possíveis. Proteger modelos de junção pelo pai; não aceitar `schoolId` do cliente como autoridade. Incluir a escola em cache, storage, códigos, configurações, jobs, webhooks e canais. Cobrir tentativas de mudança de `schoolId` em updates e upserts.

Alternativa rejeitada: confiar nas opções do select ou no filtro da entidade principal. Isso não protege pedidos directos nem relações indevidas.

### 4. Integridade académica e financeira

Nota deve respeitar a escala e `maxScore` no servidor. Distinguir ausente, dispensado e não lançado. Fecho impede mutações e usa dados consistentes; reabertura/desbloqueio exige permissão, motivo e auditoria. Guardar fórmula e versão, resultados e decisões anuais; alterações futuras não reescrevem histórico silenciosamente. Regras específicas da Sagrada tornam-se configuração por escola, sem as apresentar como legislação nacional.

Dinheiro e cálculos usam Decimal e transportes em string. Cobranças, alocações, descontos, multas, crédito e reversões ficam transaccionais e auditáveis. Usar chaves de idempotência estáveis para uma intenção, unicidade de negócio e serialização por agregado financeiro, com bloqueios/isolamento suportados pelo driver e retries limitados. Transições de estado com comparação do estado persistido. Não manter transacções abertas durante chamadas externas.

Operadores por porta; timeout limitado, reconciliação de tentativas sem resposta, webhook autenticado sobre corpo original, validação de valor/moeda/referência e deduplicação. Falhas transitórias não podem receber confirmação definitiva que perca o evento. A configuração de cada escola selecciona credenciais próprias e callbacks validáveis.

### 5. Identidade visual e documentos

O código actual do EduMoz e `docs/specs/design-system.md` orientam a adaptação; resolver a contradição com `design-system/edumoz/MASTER.md` antes de criar UI. Usar as skills de UI exigidas pelo projecto na implementação. Preservar temas e componentes; não copiar textos fixos nem branding Sagrada. Mensagens pt-MZ/en, datas Africa/Maputo, formatos locais e moeda explícita. Regras académicas não dependem da língua da página.

Para cada ficha, pauta e impressão preservar campos, ordem semântica, cálculos, assinaturas e finalidade. O ecrã segue EduMoz; impressos oficiais mantêm a estrutura funcional necessária, com dados da escola activa. Separar locale da interface e língua do documento; impressos institucionais podem manter português quando especificado. Verificar pré-visualização de impressão e PDF, paginação, margens, cabeçalhos repetidos, nomes longos, tabelas extensas e totais. Uma screenshot do ecrã não valida o documento.

### 6. Segurança de contas, ficheiros e serviços

Activação por token aleatório de curta duração, de uso único; não gerar palavra-passe a partir do código público. Recuperação sem enumeração, limites de tentativas, hashes robustos e revogação de sessões. QR/cartões não substituem autenticação em operações sensíveis. Aparelhos da portaria têm credenciais restritas, revogáveis e ligadas à escola.

Ficheiros privados fora do directório público, nomes internos aleatórios, prevenção de traversal, tipos e assinaturas validados, tamanhos limitados coerentes com o Next; downloads autorizados, cabeçalhos seguros e tratamento de conteúdo activo. Não renderizar HTML não confiável. CSP e restantes cabeçalhos compatíveis com Next e serviços necessários; validar origem/CSRF, redirects internos e SSRF em URLs externas. Limitar corpos, listas e operações em lote. Segredos nunca entram no cliente, inventário ou logs; auditoria redigida com retenção e acesso definidos. Backup encriptado e recuperação ensaiada cobrem base e storage.

### 7. Desempenho demonstrável

Medir primeiro em build de produção local, separado de `next dev`. Dataset sintético: duas escolas, 5.000 alunos e três anos por escola, 100.000 cobranças por escola. Registar máquina, contagens, planos SQL, queries por pedido, payloads e percentis. Metas iniciais: p95 <= 1 s para leituras paginadas e <= 2 s para mutações comuns, após aquecimento e com 10 sessões concorrentes; excluem serviços externos e tarefas longas. Não são medições já obtidas; alterações das metas exigem justificação registada.

Paginação/filtros no servidor, índices por escola/ano/estado, selects explícitos, eliminação de N+1. Exportações e fechos grandes usam lotes/jobs recuperáveis com progresso e cancelamento seguro. Jobs e avisos persistidos/idempotentes evitam duplicação. Cache privada por contexto, invalidada depois de mutações. Medir também bundles e usabilidade móvel/rede lenta; nenhuma optimização pode retirar verificações de autorização.

### 8. Aceitação sequencial e execução local

Base local de desenvolvimento e base local de testes distintas, ambas sem Docker. Fixtures sintéticas A/B e contas por papel. Sem execução contra a base da origem. Antes de cada entrega: detalhe da matriz e spec em `docs/specs/esagrada-<module>.md` com deltas OpenSpec necessárias, aprovação segundo regras do projecto, implementação, testes até verde, navegador e impressão. Não avançar ao módulo seguinte com falhas da entrega corrente. Aprovação global não substitui decisões de negócio críticas ainda desconhecidas.

Validação combina domínio, componentes, integração MariaDB, concorrência e E2E. Automatizar os percursos e observar o navegador real. Registar rota, papel, escola, idioma, entradas, resultados, consola/rede, screenshots e documentos sem dados pessoais reais. Credenciais, hardware ou provedores ausentes ficam como bloqueios explícitos; continuar trabalho independente sem declarar conclusão falsa.

## Risks / Trade-offs

- [Âmbito extenso e em evolução] → inventário com hashes, cobertura verificável e sequência de entregas; reconciliar deriva da origem antes de aceitar cada módulo.
- [Regras válidas para uma escola mas não para todas] → parametrização por tenant e aprovação de ambiguidades pedagógicas, sem inventar equivalência legal.
- [Schema de finanças muito diferente] → tabela de correspondência, migração aditiva, reconciliação de saldos e testes de concorrência antes de substituir fluxos.
- [Dados ou ficheiros existentes no EduMoz] → preservar alterações locais, backup verificado e nenhuma operação de reset automática.
- [Integrações e dispositivos indisponíveis] → testes contratuais com simuladores identificados, sandbox e evidências reais pendentes.
- [Segurança absoluta impossível de demonstrar] → critérios verificáveis, registo de riscos residuais e revisão contínua.

## Migration Plan

1. Registar estado do destino sem sobrescrever trabalho local; recolher baseline de testes e navegador com dados sintéticos.
2. Criar e testar backup/restore local da base e storage; separar ambiente de teste antes de testes com escrita.
3. Implementar a fundação de autorização/tenancy e migrar os pontos existentes; executar regressão antes de novas capacidades.
4. Por módulo, definir correspondência de entidades/campos, gerar e rever SQL, validar em base vazia e cópia sintética com dados anteriores; verificar esquema e constraints efectivas.
5. Aplicar mudanças aditivas, backfill idempotente e reconciliação de contagens, relações, notas e dinheiro. Evitar duas fontes de verdade activas.
6. Habilitar a funcionalidade por escola apenas após aceitação; alterações destrutivas só depois de validação de dados e autorização específica.
7. Recuperação: desactivar funcionalidade, reverter aplicação para versão compatível; se a migração não for reversível sem perda, restaurar backup ensaiado e reconciliar operações posteriores. Não presumir que reverter código reverte a base.

## Open Questions

- Credenciais sandbox de pagamentos, correio e avisos, dispositivos/câmara e amostras de impressos para comparação operacional serão necessários nas respectivas entregas.
- A referência é a working tree local inventariada; confirmar divergências funcionais quando a origem mudar ou as specs discordarem do comportamento observado.
- Importação de dados reais da Sagrada não foi solicitada: implementar ferramentas com pré-visualização sintética; eventual execução requer âmbito próprio.
- O registo inicial de anomalias está em `anomalies.md`; hipóteses só passam a defeitos reproduzidos com evidência.
