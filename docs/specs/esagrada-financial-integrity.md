# Spec — Concorrência e idempotência financeira

Estado: tarefa 1.12 da proposta aprovada. Não constitui integração de operador real nem aceitação de M10.

## Requisitos

- FI-01: geração concorrente da mesma tabela/matrícula/período produz uma factura. Guardar generationKey única e imutável, calculada de IDs canónicos e período; detectar duplicados/ambiguidade históricos antes de backfill, sem apagar ou fundir cobranças.
- FI-02: alocar referências por contador atómico da escola, nunca por count. Inicializar acima dos sufixos numéricos existentes. Referências não são reutilizadas; falhas podem consumir números e criar lacunas documentadas. Preservar o formato ano/mês-sequência. Não impor regra fiscal ou renumeração de documentos existentes.
- FI-03: criar pagamento manual ou tentativa móvel exige chave UUID estável da intenção. A mesma chave com os mesmos parâmetros não duplica; reutilização com outros parâmetros é conflito. Derivar chave persistida por escola/tipo para isolar tenants. A interface mantém a chave após erro/retry e gera outra só após sucesso.
- FI-04: toda a alteração de pagamentos/saldo obtém primeiro bloqueio da factura e relê estado/transição na transacção. Saldo soma exactamente os pagamentos CONFIRMED; confirmação atrasada nunca ressuscita REVERSED. A auditoria da transição ocorre uma vez.
- FI-05: contacto com operador fora de transacção. Tentativa INITIATED e auditoria persistem antes do contacto. Repetir tentativa ainda sem referência usa a mesma chave; o adaptador deve respeitar idempotência. Impedir segunda intenção móvel enquanto outra está INITIATED/PENDING na mesma factura. Operador indisponível não confirma dinheiro.
- FI-06: alterações concorrentes respeitam escola, existência, moeda e estado actual da factura. Manter a política existente de sobrepagamento (saldo pago pode exceder total); alocação de crédito é trabalho de M10, não inventar estorno de dinheiro recebido.

- FI-07: vencimento mensal com dia superior ao número de dias do mês usa o último dia desse mês; não transitar silenciosamente para o período seguinte. Mantém Janeiro para o período anual existente.

## Desenho

Invoice.revision para bloqueio de linha via incremento atómico; transacções RepeatableRead após esse bloqueio. Resolver transições e recalcular saldo dentro da mesma transacção, com tentativas limitadas para conflitos transaccionais recuperáveis. Chave de geração SHA-256 de campos com comprimento UTF-8 prefixado, reproduzível em SQL; backfill apenas de facturas anuais/mensais de uma única tabela identificável pelas linhas. Migration preflight recusa duplicados e casos ambíguos.

School.invoiceSequence é metadado técnico, alocado numa DAL estreita em lib/db que só incrementa esse campo na escola validada. Não abrir edição global de School no cliente de escola. Consumo do número é independente da transacção de emissão, para nunca o reutilizar após rollback; unicidade de referência e generationKey continuam impostas no MariaDB.

Pagamento usa chave hash por escola/tipo/UUID. Campos financeiros do intento são comparados ao registo existente. Estado/valor/moeda da factura relidos sob bloqueio; saldo e auditoria são gravados com a transição. Respostas cruas do operador não entram na auditoria resumida. O simulado passa a respeitar idempotencyKey e recusa referências desconhecidas; continua explicitamente sem valor como prova de integração real e sem persistência de operador entre reinícios.

## Aceitação

- Geração simultânea para mesma/diferentes tabelas; chaves únicas, referências únicas e contagens correctas de created/skipped. Backfill preserva referências/valores e recusa histórico duplicado sem o corrigir.
- Dois pagamentos distintos confirmados em paralelo somam exactamente; repetição da mesma intenção cria um pagamento e um evento. Mesma chave com valor/factura/método diferentes recusa sem efeitos.
- Confirmação repetida, reversão simultânea e resposta atrasada produzem estado legal e saldo reconciliado. Teste determinístico de resposta do gateway enquanto a reversão confirma, sem sleeps.
- Tentativas móveis repetidas reutilizam intenção/referência; falhas externas não mantêm locks e não perdem a tentativa. Referência desconhecida do simulado não confirma dinheiro.
- Testes reais em MariaDB isolada, UI pt/en com intenções sintéticas, lint/tipos/build e regressão verdes antes de 1.13.
