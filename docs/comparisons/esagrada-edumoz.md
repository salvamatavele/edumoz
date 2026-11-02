# Comparação funcional esagrada-next → EduMoz

Data: 2026-10-28. A pedido do utilizador, o trabalho passa a ter comparação directa da origem em execução como evidência de aceitação. Testes técnicos verdes do destino não demonstram paridade funcional. As 12 tarefas concluídas pertencem à fundação; nenhum módulo M01–M15 foi aceite como equivalente.

## Ambientes

- Origem: working tree local de esagrada-next, commit-base 941061c, com alterações locais existentes. Snapshot construído pelo Dockerfile da própria origem, sem alterar os seus ficheiros. Pilha dedicada `edumoz-esagrada-comparison`, MariaDB 11.4 e storage novos; aplicação em localhost:3002. Não reutiliza .env, base, volumes ou credenciais da escola, nem configura envio de mensagens, IA ou operadores reais.
- Destino: mesmo código EduMoz, build de produção, sem Docker, em localhost:3011; base separada edumoz_test com duas escolas sintéticas e gestor autorizado. A aplicação normal em localhost:3000 continua separada.
- Configuração e segredos locais ignorados em `.local/esagrada-comparison/`; dados do gestor sintético do destino em `.local/comparison-edumoz-fixture.json`. Não publicar estes ficheiros nem palavras-passe.

## Primeiras diferenças confirmadas

| Área | Origem | EduMoz actual | Implicação |
|---|---|---|---|
| Ficha de aluno | Catálogo de 48 campos, sete secções: Aluno, Endereço, Família, Escolar, Documentos, Transporte, Saúde e outros. Visibilidade/obrigatoriedade configuráveis | Modal com seis campos fixos: código, nome próprio, apelido, nascimento, sexo e telefone | Ainda não equivale à ficha usada pela secretaria |
| Inscrição e turma | Ficha inclui turma, número, dados escolares e acções de estado; integra encarregado já registado | Cadastro básico e matrícula em operação separada | Mapear sequência real e regras antes de adaptar |
| Família | Dados de pai/mãe/encarregado, procura de encarregado por código e consentimento para avisos; partilha entre irmãos | Não presentes no modal de criação observado | Necessita fluxo e validação próprios por escola |
| Anexos | Ficha liga fotografias e documentos; ficheiros privados por APIs | Não presentes no formulário observado | Ausência funcional, não apenas diferença visual |
| Finanças | Conta corrente com taxas, descontos, multas, saldo a favor, alocações e anulações; geração com previsão e alvos | Tabelas/rubricas, factura e pagamentos simples | Integridade dos pagamentos básicos não significa paridade da tesouraria |
| Pautas | Ecrãs distintos por disciplina, global, anual, aproveitamento e mapas; cabeçalho, assinaturas, impressão e Excel | Pauta por turma/disciplina/trimestre | Comparar todos os tipos e os respectivos documentos |

## Evidência e limites

- O catálogo de campos e os fluxos descritos acima foram lidos directamente no código da origem: `academic/domain/record-fields.ts`, `academic/presentation/student-record-dialog.tsx`, `academic/application/required-fields.ts`, `finance/presentation/student-forms.tsx`, `app/(app)/financas/aluno/[id]/page.tsx`, `app/(app)/financas/gerar/page.tsx` e `app/(app)/pautas/global/page.tsx`.
- Formulário actual EduMoz confirmado no navegador em português com gestor de acesso completo; screenshot `.local/evidence/comparison-edumoz-student-form.png`.
- Contagem de campos é do catálogo da origem, não de campos obrigatórios: uma escola pode esconder ou exigir campos. Não confundir com os seis controlos de criação do destino.
- Não foram importados dados reais nem ensaiadas integrações externas. A configuração sintética inicial não reproduz todas as escolhas da escola em produção.

## Critério de continuidade

Por fluxo: observar na origem, registar campos/acções/estados/validações e documento; executar equivalente no destino com o mesmo cenário sintético; listar divergências; só aceitar depois de verificar regras, persistência, escola/ano, papéis e idiomas. Manter layout, cores e temas EduMoz. O comportamento da origem pode ser reproduzido sem copiar falhas de segurança ou decisões exclusivas de uma escola.

## Observação no navegador

- Login sintético de pessoal concluído; painel mostra 55 permissões activas. Confirmadas 96 tabelas e 70 migrações concluídas no MariaDB da pilha exclusiva.
- Novo aluno abre sete secções. O ecrã informa que nome e turma bastam para registar e que a conta é criada com o registo; o destino exige código, nascimento e sexo no seu formulário básico. A criação de conta na origem foi observada como informação de interface, não foi executada neste ensaio.
- Família: preencher nome/telefone do pai e escolher «O pai» preenche nome/telefone/relação do encarregado. Confirmado no estado acessível, sem guardar o rascunho. Há também código de encarregado existente e consentimento explícito para avisos. Fotografias e anexos foram identificados no código; não foi executado upload nesta comparação.
- Menu Pautas e Documentos confirma Pauta Trimestral, Global, Anual, Aproveitamento, Cadernetas, Boletins e Declarações. A geração/impressão de cada documento ainda requer cenário sintético completo; não foi validada por abrir o menu.
- Gerar cobranças apresentou o impedimento «Falta dizer como se cobra neste ano»: exige meses e vencimento nas Definições. Não modificar a configuração sintética para aparentar equivalência com escolhas reais desconhecidas. Previsão, conta corrente e regras financeiras completas continuam por ensaiar.
- Evidências: `.local/evidence/comparison-source-student-form.png`, `comparison-source-family.png`, `comparison-source-family.ax.txt`, `comparison-source-finance-configuration.png`, `comparison-source-login-default-password.png` e `comparison-edumoz-student-form.png`.
- No login da origem, a mensagem de palavra-passe inicial derivada do código confirma A09 na interface. O seed de comparação usa segredo aleatório próprio. Não transportar credenciais previsíveis para EduMoz.
- `npm audit --omit=dev --json` da origem reportou 29 entradas de pacotes (2 low, 7 moderate, 17 high, 3 critical). Entradas críticas reportadas: better-auth, next e proxy-addr. São alertas de scanner que exigem verificar versões, caminhos e aplicabilidade; não constituem prova de exploração. Relatório local `esagrada-production-dependency-audit.json`; nenhum pacote foi actualizado. A versão Next também é usada pelo destino e a triagem deve abranger os dois.

## Reutilizar a comparação

A pilha e os dados sintéticos ficam disponíveis para continuar a observação; não são dados da escola. Comandos a partir de edumoz:

```bash
docker compose -f .local/esagrada-comparison/compose.yaml up -d
docker compose -f .local/esagrada-comparison/compose.yaml ps
```

O snapshot de código só muda ao reconstruir a imagem. EduMoz de comparação: `node --import tsx .local/comparison-edumoz.mjs serve`. Arranque normal EduMoz em 3000 mantém-se sem Docker. As contas de comparação têm segredos aleatórios nos ficheiros locais ignorados; não usar estas contas ou configurações em produção.
