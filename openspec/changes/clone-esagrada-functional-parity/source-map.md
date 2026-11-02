# Reconciliação inicial da origem

Mapeamento por caminho e dependências, não aceitação funcional. Cada módulo deve decompor os itens antes da implementação. `source-inventory.md` contém hashes de referência; nenhuma origem foi alterada.

| Caminho | Entregas candidatas | Estado |
|---|---|---|
| `src/app/(app)/admin/auditoria/loading.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/app/(app)/admin/auditoria/page.tsx` | M01, M12 | Inventariado; por verificar |
| `src/app/(app)/admin/permissoes/loading.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/app/(app)/admin/permissoes/page.tsx` | M01, M12 | Inventariado; por verificar |
| `src/app/(app)/admin/utilizadores/loading.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/app/(app)/admin/utilizadores/page.tsx` | M01, M12 | Inventariado; por verificar |
| `src/app/(app)/alunos/[id]/page.tsx` | M01, M02, M04, M12 | Inventariado; por verificar |
| `src/app/(app)/alunos/loading.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/app/(app)/alunos/page.tsx` | M01, M02, M04, M12 | Inventariado; por verificar |
| `src/app/(app)/atribuicoes/page.tsx` | M01, M05, M12 | Inventariado; por verificar |
| `src/app/(app)/cadernetas/boletins/page.tsx` | M01, M02, M04, M06, M07, M12 | Inventariado; por verificar |
| `src/app/(app)/cadernetas/disciplina/page.tsx` | M01, M02, M04, M06, M07, M12 | Inventariado; por verificar |
| `src/app/(app)/cadernetas/loading.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/app/(app)/cadernetas/page.tsx` | M01, M02, M04, M06, M07, M10, M12 | Inventariado; por verificar |
| `src/app/(app)/calendario/ats/[id]/page.tsx` | M06, M07 | Inventariado; por verificar |
| `src/app/(app)/calendario/ats/page.tsx` | M01, M06, M07, M12 | Inventariado; por verificar |
| `src/app/(app)/calendario/exames/[id]/page.tsx` | M06, M07 | Inventariado; por verificar |
| `src/app/(app)/calendario/exames/page.tsx` | M01, M06, M07, M12 | Inventariado; por verificar |
| `src/app/(app)/calendario/page.tsx` | M01, M02, M04, M06, M07, M12 | Inventariado; por verificar |
| `src/app/(app)/candidaturas-escola/[id]/page.tsx` | M01, M03, M10, M12 | Inventariado; por verificar |
| `src/app/(app)/candidaturas-escola/ingressos/page.tsx` | M01, M03, M12 | Inventariado; por verificar |
| `src/app/(app)/candidaturas-escola/janelas/page.tsx` | M01, M03, M12 | Inventariado; por verificar |
| `src/app/(app)/candidaturas-escola/page.tsx` | M01, M03, M12 | Inventariado; por verificar |
| `src/app/(app)/cartoes/page.tsx` | M01, M12, M13 | Inventariado; por verificar |
| `src/app/(app)/comportamento/page.tsx` | M01, M02, M04, M06, M07, M12 | Inventariado; por verificar |
| `src/app/(app)/comunicados/[id]/conversa/[destinatarioId]/page.tsx` | M01, M12, M14 | Inventariado; por verificar |
| `src/app/(app)/comunicados/[id]/page.tsx` | M01, M12, M14 | Inventariado; por verificar |
| `src/app/(app)/comunicados/novo/page.tsx` | M01, M12, M14 | Inventariado; por verificar |
| `src/app/(app)/comunicados/page.tsx` | M01, M12, M14 | Inventariado; por verificar |
| `src/app/(app)/credenciais/page.tsx` | M01, M12 | Inventariado; por verificar |
| `src/app/(app)/declaracoes/[id]/page.tsx` | M01, M02, M04, M12 | Inventariado; por verificar |
| `src/app/(app)/declaracoes/page.tsx` | M01, M02, M04, M12 | Inventariado; por verificar |
| `src/app/(app)/definicoes/loading.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/app/(app)/definicoes/page.tsx` | M01, M02, M04, M06, M07, M10, M12, M14 | Inventariado; por verificar |
| `src/app/(app)/diario/page.tsx` | M01, M08, M09, M12 | Inventariado; por verificar |
| `src/app/(app)/disciplinas/loading.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/app/(app)/disciplinas/page.tsx` | M01, M02, M04, M06, M07, M12 | Inventariado; por verificar |
| `src/app/(app)/docentes/[id]/page.tsx` | M01, M02, M04, M12 | Inventariado; por verificar |
| `src/app/(app)/docentes/loading.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/app/(app)/docentes/page.tsx` | M01, M02, M04, M12 | Inventariado; por verificar |
| `src/app/(app)/error.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/app/(app)/extracurriculares/avaliacoes/page.tsx` | M01, M02, M04, M11, M12 | Inventariado; por verificar |
| `src/app/(app)/extracurriculares/inscritos/page.tsx` | M01, M11, M12 | Inventariado; por verificar |
| `src/app/(app)/extracurriculares/page.tsx` | M01, M11, M12 | Inventariado; por verificar |
| `src/app/(app)/extracurriculares/presencas/page.tsx` | M01, M11, M12 | Inventariado; por verificar |
| `src/app/(app)/extracurriculares/propinas/page.tsx` | M01, M10, M11, M12 | Inventariado; por verificar |
| `src/app/(app)/extracurriculares/turmas/page.tsx` | M01, M11, M12 | Inventariado; por verificar |
| `src/app/(app)/financas/aluno/[id]/page.tsx` | M01, M10, M12 | Inventariado; por verificar |
| `src/app/(app)/financas/gerar/page.tsx` | M01, M10, M12 | Inventariado; por verificar |
| `src/app/(app)/financas/page.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/app/(app)/financas/recibo/[id]/page.tsx` | M01, M02, M04, M10, M12 | Inventariado; por verificar |
| `src/app/(app)/financas/taxas/page.tsx` | M01, M10, M12 | Inventariado; por verificar |
| `src/app/(app)/forbidden.tsx` | M01, M12 | Inventariado; por verificar |
| `src/app/(app)/horarios/docente/page.tsx` | M01, M02, M04, M05, M12 | Inventariado; por verificar |
| `src/app/(app)/horarios/loading.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/app/(app)/horarios/page.tsx` | M01, M02, M04, M05, M12 | Inventariado; por verificar |
| `src/app/(app)/layout.tsx` | M01, M02, M04, M12, M13, M14 | Inventariado; por verificar |
| `src/app/(app)/livro-de-turma/page.tsx` | M01, M02, M04, M08, M09, M12 | Inventariado; por verificar |
| `src/app/(app)/matriculas/exame/page.tsx` | M01, M02, M04, M12 | Inventariado; por verificar |
| `src/app/(app)/matriculas/fecho/page.tsx` | M01, M02, M04, M12 | Inventariado; por verificar |
| `src/app/(app)/matriculas/renovacao/page.tsx` | M01, M02, M04, M12 | Inventariado; por verificar |
| `src/app/(app)/not-found.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/app/(app)/painel/loading.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/app/(app)/painel/page.tsx` | M01, M02, M04, M12, M15 | Inventariado; por verificar |
| `src/app/(app)/pautas/anual/page.tsx` | M01, M02, M04, M06, M07, M12 | Inventariado; por verificar |
| `src/app/(app)/pautas/aproveitamento/page.tsx` | M01, M02, M04, M06, M07, M12 | Inventariado; por verificar |
| `src/app/(app)/pautas/global/loading.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/app/(app)/pautas/global/page.tsx` | M01, M02, M04, M06, M07, M12 | Inventariado; por verificar |
| `src/app/(app)/pautas/loading.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/app/(app)/pautas/mapa/page.tsx` | M01, M02, M04, M06, M07, M12 | Inventariado; por verificar |
| `src/app/(app)/pautas/page.tsx` | M01, M02, M04, M06, M07, M10, M12 | Inventariado; por verificar |
| `src/app/(app)/percurso/actividades/page.tsx` | M10, M11, M15 | Inventariado; por verificar |
| `src/app/(app)/percurso/aulas/page.tsx` | M15 | Inventariado; por verificar |
| `src/app/(app)/percurso/avaliacoes/page.tsx` | M15 | Inventariado; por verificar |
| `src/app/(app)/percurso/avisos/page.tsx` | M14, M15 | Inventariado; por verificar |
| `src/app/(app)/percurso/faltas/page.tsx` | M15 | Inventariado; por verificar |
| `src/app/(app)/percurso/financas/page.tsx` | M10, M15 | Inventariado; por verificar |
| `src/app/(app)/percurso/horario/page.tsx` | M05, M15 | Inventariado; por verificar |
| `src/app/(app)/percurso/layout.tsx` | M01, M12, M15 | Inventariado; por verificar |
| `src/app/(app)/percurso/material/page.tsx` | M15 | Inventariado; por verificar |
| `src/app/(app)/percurso/notas/page.tsx` | M02, M04, M06, M07, M10, M12, M15 | Inventariado; por verificar |
| `src/app/(app)/percurso/page.tsx` | M01, M10, M11, M12, M14, M15 | Inventariado; por verificar |
| `src/app/(app)/percurso/portaria/page.tsx` | M14, M15 | Inventariado; por verificar |
| `src/app/(app)/perfil/page.tsx` | M01, M12, M14 | Inventariado; por verificar |
| `src/app/(app)/pessoal/[id]/page.tsx` | M01, M02, M04, M12 | Inventariado; por verificar |
| `src/app/(app)/pessoal/page.tsx` | M01, M02, M04, M12 | Inventariado; por verificar |
| `src/app/(app)/planificacao/acta/page.tsx` | M01, M02, M04, M08, M09, M12 | Inventariado; por verificar |
| `src/app/(app)/planificacao/diario/imprimir/page.tsx` | M01, M02, M04, M08, M09, M12 | Inventariado; por verificar |
| `src/app/(app)/planificacao/diario/page.tsx` | M01, M02, M04, M08, M09, M12 | Inventariado; por verificar |
| `src/app/(app)/planificacao/imprimir/page.tsx` | M01, M02, M04, M08, M09, M12 | Inventariado; por verificar |
| `src/app/(app)/planificacao/loading.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/app/(app)/planificacao/material/page.tsx` | M01, M02, M04, M08, M09, M12 | Inventariado; por verificar |
| `src/app/(app)/planificacao/page.tsx` | M01, M02, M04, M08, M09, M12 | Inventariado; por verificar |
| `src/app/(app)/planificacao/quinzenal/imprimir/page.tsx` | M01, M02, M04, M08, M09, M12 | Inventariado; por verificar |
| `src/app/(app)/planificacao/quinzenal/page.tsx` | M01, M02, M04, M08, M09, M12 | Inventariado; por verificar |
| `src/app/(app)/portaria/livro/page.tsx` | M01, M02, M04, M12, M13 | Inventariado; por verificar |
| `src/app/(app)/portaria/page.tsx` | M01, M12, M13 | Inventariado; por verificar |
| `src/app/(app)/presencas/loading.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/app/(app)/presencas/page.tsx` | M01, M02, M04, M08, M09, M12 | Inventariado; por verificar |
| `src/app/(app)/relatorios/alunos/page.tsx` | M01, M02, M04, M10, M12 | Inventariado; por verificar |
| `src/app/(app)/relatorios/assiduidade/page.tsx` | M01, M02, M04, M08, M09, M12 | Inventariado; por verificar |
| `src/app/(app)/relatorios/avisos/page.tsx` | M01, M10, M12, M14 | Inventariado; por verificar |
| `src/app/(app)/relatorios/candidaturas/page.tsx` | M01, M03, M10, M12 | Inventariado; por verificar |
| `src/app/(app)/relatorios/devedores/page.tsx` | M01, M10, M12 | Inventariado; por verificar |
| `src/app/(app)/relatorios/extracurriculares/page.tsx` | M01, M10, M11, M12 | Inventariado; por verificar |
| `src/app/(app)/relatorios/extratos/page.tsx` | M01, M10, M12 | Inventariado; por verificar |
| `src/app/(app)/relatorios/fichas/page.tsx` | M01, M02, M04, M10, M12 | Inventariado; por verificar |
| `src/app/(app)/relatorios/financeiro/page.tsx` | M01, M02, M04, M10, M12 | Inventariado; por verificar |
| `src/app/(app)/relatorios/pagamentos/page.tsx` | M01, M10, M12 | Inventariado; por verificar |
| `src/app/(app)/relatorios/planificacao/page.tsx` | M01, M08, M09, M10, M12 | Inventariado; por verificar |
| `src/app/(app)/relatorios/renovacao/page.tsx` | M01, M02, M04, M10, M12 | Inventariado; por verificar |
| `src/app/(app)/turmas/loading.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/app/(app)/turmas/page.tsx` | M01, M02, M04, M12 | Inventariado; por verificar |
| `src/app/(auth)/e/page.tsx` | M01, M12 | Inventariado; por verificar |
| `src/app/(auth)/entrar/qr/page.tsx` | M01, M12 | Inventariado; por verificar |
| `src/app/(auth)/login/page.tsx` | M01, M12, M13 | Inventariado; por verificar |
| `src/app/(auth)/recuperar/page.tsx` | M01, M12 | Inventariado; por verificar |
| `src/app/(auth)/redefinir/page.tsx` | M01, M12 | Inventariado; por verificar |
| `src/app/(publico)/candidaturas/[code]/page.tsx` | M03, M10 | Inventariado; por verificar |
| `src/app/(publico)/candidaturas/[code]/sucesso/page.tsx` | M03 | Inventariado; por verificar |
| `src/app/(publico)/candidaturas/page.tsx` | M02, M03, M04, M10, M12 | Inventariado; por verificar |
| `src/app/(publico)/layout.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/app/(terminal)/layout.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/app/(terminal)/terminal/page.tsx` | M13 | Inventariado; por verificar |
| `src/app/api/anexo-comunicado/[id]/route.ts` | M14 | Inventariado; por verificar |
| `src/app/api/auth/[...all]/route.ts` | M01, M12 | Inventariado; por verificar |
| `src/app/api/avisos/por-ler/route.ts` | M01, M12, M14 | Inventariado; por verificar |
| `src/app/api/boletim/[id]/route.ts` | M02, M04, M12 | Inventariado; por verificar |
| `src/app/api/candidatura/[code]/ficha/route.ts` | M03 | Inventariado; por verificar |
| `src/app/api/documento/[id]/route.ts` | M02, M04, M12 | Inventariado; por verificar |
| `src/app/api/documento-candidatura/[id]/route.ts` | M01, M03, M12 | Inventariado; por verificar |
| `src/app/api/exportar/alunos/route.ts` | M06, M07 | Inventariado; por verificar |
| `src/app/api/exportar/auditoria/route.ts` | M06, M07 | Inventariado; por verificar |
| `src/app/api/exportar/ficha/[titular]/[id]/route.ts` | M02, M04, M12 | Inventariado; por verificar |
| `src/app/api/exportar/financas/route.ts` | M10 | Inventariado; por verificar |
| `src/app/api/exportar/pauta/route.ts` | M06, M07 | Inventariado; por verificar |
| `src/app/api/ficha-renovacao/[id]/route.ts` | M02, M04, M12 | Inventariado; por verificar |
| `src/app/api/foto/[titular]/[id]/route.ts` | M13 | Inventariado; por verificar |
| `src/app/api/logotipo/route.ts` | M02, M04, M12 | Inventariado; por verificar |
| `src/app/api/material/[id]/route.ts` | M08, M09 | Inventariado; por verificar |
| `src/app/api/pagamentos/webhook/route.ts` | M10 | Inventariado; por verificar |
| `src/app/api/saude/route.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/app/api/tarefas/avisos/route.ts` | M14 | Inventariado; por verificar |
| `src/app/error.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/app/forbidden.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/app/global-error.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/app/globals.css` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/app/layout.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/app/manifest.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/app/not-found.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/app/page.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/app/sem-ligacao/page.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/modules/academic/application/boletim-pdf.ts` | M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/application/boletim.ts` | M01, M02, M04, M10, M12 | Inventariado; por verificar |
| `src/modules/academic/application/current-trimester.ts` | M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/application/dashboard.ts` | M01, M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/application/directory-crud.ts` | M01, M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/application/directory.ts` | M01, M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/application/documents.ts` | M01, M02, M04, M06, M07, M10, M12 | Inventariado; por verificar |
| `src/modules/academic/application/fecho.ts` | M01, M02, M04, M06, M07, M10, M12 | Inventariado; por verificar |
| `src/modules/academic/application/o-que-lecciono.ts` | M01, M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/application/record-documents.ts` | M01, M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/application/record-sheet.ts` | M01, M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/application/regras-aprovacao.ts` | M01, M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/application/relatorio-alunos.ts` | M01, M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/application/relatorio-fichas.ts` | M01, M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/application/renovacao.ts` | M01, M02, M04, M10, M12 | Inventariado; por verificar |
| `src/modules/academic/application/required-fields.ts` | M01, M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/application/school-logo.ts` | M01, M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/application/sheet-pdf.ts` | M02, M04, M12, M13 | Inventariado; por verificar |
| `src/modules/academic/application/student-status.ts` | M01, M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/application/year-settings.ts` | M01, M02, M04, M06, M07, M12, M14 | Inventariado; por verificar |
| `src/modules/academic/domain/boletim.ts` | M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/domain/current-trimester.ts` | M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/domain/directory-codes.ts` | M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/domain/fecho.ts` | M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/domain/ficha.ts` | M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/domain/guardian-matching.ts` | M01, M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/domain/record-fields.ts` | M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/domain/renovacao.ts` | M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/domain/student-status.ts` | M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/presentation/ano-actions.ts` | M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/presentation/component-form.tsx` | M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/presentation/directory-actions.ts` | M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/presentation/directory-forms.tsx` | M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/presentation/document-actions.ts` | M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/presentation/document-record-actions.ts` | M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/presentation/documents-panel.tsx` | M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/presentation/encarregado-do-aluno.tsx` | M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/presentation/exame-form.tsx` | M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/presentation/fecho-actions.ts` | M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/presentation/fecho-form.tsx` | M02, M04, M10, M12 | Inventariado; por verificar |
| `src/modules/academic/presentation/ficha-view.tsx` | M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/presentation/issue-dialog.tsx` | M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/presentation/logo-form.tsx` | M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/presentation/record-form.tsx` | M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/presentation/regras-aprovacao-form.tsx` | M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/presentation/renovacao-actions.ts` | M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/presentation/renovacao-form.tsx` | M02, M04, M10, M12 | Inventariado; por verificar |
| `src/modules/academic/presentation/required-field-actions.ts` | M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/presentation/required-fields-form.tsx` | M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/presentation/school-form.tsx` | M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/presentation/seccoes-da-ficha.ts` | M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/presentation/settings-actions.ts` | M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/presentation/staff-actions.ts` | M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/presentation/staff-buttons.tsx` | M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/presentation/staff-dialog.tsx` | M02, M04, M12, M13 | Inventariado; por verificar |
| `src/modules/academic/presentation/student-record-dialog.tsx` | M02, M04, M12, M13 | Inventariado; por verificar |
| `src/modules/academic/presentation/student-status-actions.ts` | M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/presentation/student-status-dialog.tsx` | M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/presentation/term-record-cells.tsx` | M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/presentation/trimester-actions.tsx` | M02, M04, M12 | Inventariado; por verificar |
| `src/modules/academic/presentation/year-forms.tsx` | M02, M04, M12 | Inventariado; por verificar |
| `src/modules/admissions/application/candidaturas.ts` | M01, M02, M03, M04, M10, M12 | Inventariado; por verificar |
| `src/modules/admissions/application/documentos.ts` | M01, M03, M12 | Inventariado; por verificar |
| `src/modules/admissions/application/ficha-do-candidato.ts` | M02, M03, M04, M12 | Inventariado; por verificar |
| `src/modules/admissions/application/janelas.ts` | M01, M03, M10, M12 | Inventariado; por verificar |
| `src/modules/admissions/application/matricular.ts` | M01, M02, M03, M04, M10, M12 | Inventariado; por verificar |
| `src/modules/admissions/application/relatorio.ts` | M01, M03, M10, M12 | Inventariado; por verificar |
| `src/modules/admissions/domain/campos-para-o-aluno.ts` | M02, M03, M04, M12 | Inventariado; por verificar |
| `src/modules/admissions/domain/candidaturas.ts` | M03 | Inventariado; por verificar |
| `src/modules/admissions/domain/seccoes.ts` | M03 | Inventariado; por verificar |
| `src/modules/admissions/domain/turmas-automaticas.ts` | M03 | Inventariado; por verificar |
| `src/modules/admissions/presentation/acompanhar.tsx` | M03, M10 | Inventariado; por verificar |
| `src/modules/admissions/presentation/campos-da-candidatura.tsx` | M03 | Inventariado; por verificar |
| `src/modules/admissions/presentation/candidatura-actions.ts` | M03 | Inventariado; por verificar |
| `src/modules/admissions/presentation/corrigir-candidatura.tsx` | M03 | Inventariado; por verificar |
| `src/modules/admissions/presentation/ficha-candidatura.tsx` | M03, M10 | Inventariado; por verificar |
| `src/modules/admissions/presentation/fila-secretaria.tsx` | M03, M10 | Inventariado; por verificar |
| `src/modules/admissions/presentation/formulario-publico.tsx` | M03 | Inventariado; por verificar |
| `src/modules/admissions/presentation/ingressos-form.tsx` | M03 | Inventariado; por verificar |
| `src/modules/admissions/presentation/janelas-form.tsx` | M03 | Inventariado; por verificar |
| `src/modules/admissions/presentation/secretaria-actions.ts` | M03 | Inventariado; por verificar |
| `src/modules/admissions/presentation/sucesso.tsx` | M03, M10 | Inventariado; por verificar |
| `src/modules/assessment/application/annual-report.ts` | M01, M05, M06, M07, M12 | Inventariado; por verificar |
| `src/modules/assessment/application/boletim.ts` | M01, M06, M07, M12 | Inventariado; por verificar |
| `src/modules/assessment/application/calendario-regras.ts` | M01, M06, M07, M12 | Inventariado; por verificar |
| `src/modules/assessment/application/calendario.ts` | M01, M06, M07, M12, M14 | Inventariado; por verificar |
| `src/modules/assessment/application/class-report.ts` | M01, M05, M06, M07, M12 | Inventariado; por verificar |
| `src/modules/assessment/application/comportamento.ts` | M01, M05, M06, M07, M12 | Inventariado; por verificar |
| `src/modules/assessment/application/evaluation-plan.ts` | M01, M06, M07, M12 | Inventariado; por verificar |
| `src/modules/assessment/application/exports.ts` | M01, M06, M07, M12 | Inventariado; por verificar |
| `src/modules/assessment/application/grade-unlock.ts` | M01, M06, M07, M12 | Inventariado; por verificar |
| `src/modules/assessment/application/gradebook.ts` | M01, M02, M04, M05, M06, M07, M12 | Inventariado; por verificar |
| `src/modules/assessment/application/official-maps.ts` | M01, M05, M06, M07, M12 | Inventariado; por verificar |
| `src/modules/assessment/application/record-book-import.ts` | M01, M06, M07, M12 | Inventariado; por verificar |
| `src/modules/assessment/application/report-card.ts` | M01, M06, M07, M12 | Inventariado; por verificar |
| `src/modules/assessment/application/semana-de-ats.ts` | M01, M02, M04, M06, M07, M12 | Inventariado; por verificar |
| `src/modules/assessment/application/subject-settings.ts` | M01, M06, M07, M12 | Inventariado; por verificar |
| `src/modules/assessment/domain/annual-average.ts` | M06, M07 | Inventariado; por verificar |
| `src/modules/assessment/domain/boletim.ts` | M06, M07 | Inventariado; por verificar |
| `src/modules/assessment/domain/calendario.ts` | M06, M07 | Inventariado; por verificar |
| `src/modules/assessment/domain/comportamento.ts` | M06, M07 | Inventariado; por verificar |
| `src/modules/assessment/domain/detalhe-para-familias.ts` | M06, M07 | Inventariado; por verificar |
| `src/modules/assessment/domain/overall-average.ts` | M06, M07 | Inventariado; por verificar |
| `src/modules/assessment/domain/record-book-import.ts` | M06, M07 | Inventariado; por verificar |
| `src/modules/assessment/domain/subject-order.ts` | M06, M07 | Inventariado; por verificar |
| `src/modules/assessment/domain/trimester-average.ts` | M06, M07 | Inventariado; por verificar |
| `src/modules/assessment/domain/vigilancia.ts` | M06, M07 | Inventariado; por verificar |
| `src/modules/assessment/infrastructure/xlsx-sheet.ts` | M06, M07 | Inventariado; por verificar |
| `src/modules/assessment/presentation/acoes-da-semana.tsx` | M06, M07 | Inventariado; por verificar |
| `src/modules/assessment/presentation/actions.ts` | M06, M07 | Inventariado; por verificar |
| `src/modules/assessment/presentation/boletim-print.tsx` | M06, M07 | Inventariado; por verificar |
| `src/modules/assessment/presentation/calendario-actions.ts` | M06, M07 | Inventariado; por verificar |
| `src/modules/assessment/presentation/celula-do-calendario.tsx` | M06, M07 | Inventariado; por verificar |
| `src/modules/assessment/presentation/comportamento-actions.ts` | M06, M07 | Inventariado; por verificar |
| `src/modules/assessment/presentation/comportamento-table.tsx` | M06, M07 | Inventariado; por verificar |
| `src/modules/assessment/presentation/detalhes-do-mapa.tsx` | M06, M07 | Inventariado; por verificar |
| `src/modules/assessment/presentation/ecra-do-mapa.tsx` | M01, M02, M04, M06, M07, M12 | Inventariado; por verificar |
| `src/modules/assessment/presentation/grade-input.tsx` | M06, M07 | Inventariado; por verificar |
| `src/modules/assessment/presentation/mapa-de-ats.tsx` | M06, M07 | Inventariado; por verificar |
| `src/modules/assessment/presentation/mencao-select.tsx` | M06, M07 | Inventariado; por verificar |
| `src/modules/assessment/presentation/nova-semana.tsx` | M06, M07 | Inventariado; por verificar |
| `src/modules/assessment/presentation/novo-bloco.tsx` | M06, M07 | Inventariado; por verificar |
| `src/modules/assessment/presentation/official-map-header.tsx` | M06, M07 | Inventariado; por verificar |
| `src/modules/assessment/presentation/pauta-cards.tsx` | M06, M07 | Inventariado; por verificar |
| `src/modules/assessment/presentation/plan-actions.ts` | M06, M07 | Inventariado; por verificar |
| `src/modules/assessment/presentation/plan-dialog.tsx` | M06, M07 | Inventariado; por verificar |
| `src/modules/assessment/presentation/publicar-calendario.tsx` | M06, M07 | Inventariado; por verificar |
| `src/modules/assessment/presentation/record-book-actions.ts` | M06, M07 | Inventariado; por verificar |
| `src/modules/assessment/presentation/record-book-import-dialog.tsx` | M06, M07 | Inventariado; por verificar |
| `src/modules/assessment/presentation/regras-do-calendario.tsx` | M06, M07 | Inventariado; por verificar |
| `src/modules/assessment/presentation/semana-actions.ts` | M06, M07 | Inventariado; por verificar |
| `src/modules/assessment/presentation/subject-settings-actions.ts` | M06, M07 | Inventariado; por verificar |
| `src/modules/assessment/presentation/subject-settings-forms.tsx` | M06, M07 | Inventariado; por verificar |
| `src/modules/assessment/presentation/unlock-actions.ts` | M06, M07 | Inventariado; por verificar |
| `src/modules/assessment/presentation/unlock-banner.tsx` | M06, M07 | Inventariado; por verificar |
| `src/modules/classbook/application/attendance-book.ts` | M01, M08, M09, M12 | Inventariado; por verificar |
| `src/modules/classbook/application/classbook.ts` | M01, M05, M08, M09, M12, M14 | Inventariado; por verificar |
| `src/modules/classbook/application/daily-plan.ts` | M01, M08, M09, M12 | Inventariado; por verificar |
| `src/modules/classbook/application/fortnight-minutes.ts` | M01, M08, M09, M12 | Inventariado; por verificar |
| `src/modules/classbook/application/fortnight.ts` | M01, M08, M09, M12 | Inventariado; por verificar |
| `src/modules/classbook/application/materials.ts` | M01, M08, M09, M12 | Inventariado; por verificar |
| `src/modules/classbook/application/ownership.ts` | M01, M08, M09, M12 | Inventariado; por verificar |
| `src/modules/classbook/application/planned-topic.ts` | M08, M09 | Inventariado; por verificar |
| `src/modules/classbook/application/relatorio-de-assiduidade.ts` | M01, M02, M04, M08, M09, M12 | Inventariado; por verificar |
| `src/modules/classbook/application/relatorio-planificacao.ts` | M01, M08, M09, M12 | Inventariado; por verificar |
| `src/modules/classbook/application/sumario-semanal.ts` | M01, M08, M09, M12 | Inventariado; por verificar |
| `src/modules/classbook/application/syllabus.ts` | M01, M02, M04, M08, M09, M12 | Inventariado; por verificar |
| `src/modules/classbook/domain/attendance.ts` | M08, M09 | Inventariado; por verificar |
| `src/modules/classbook/domain/english-lesson-templates.ts` | M08, M09 | Inventariado; por verificar |
| `src/modules/classbook/domain/folha-semanal.ts` | M08, M09 | Inventariado; por verificar |
| `src/modules/classbook/domain/fortnight-rows.ts` | M08, M09 | Inventariado; por verificar |
| `src/modules/classbook/domain/lesson-number.ts` | M08, M09 | Inventariado; por verificar |
| `src/modules/classbook/domain/lesson-templates.ts` | M08, M09 | Inventariado; por verificar |
| `src/modules/classbook/domain/materials.ts` | M05, M08, M09 | Inventariado; por verificar |
| `src/modules/classbook/domain/minutes-templates.ts` | M08, M09 | Inventariado; por verificar |
| `src/modules/classbook/domain/pe-lesson-templates.ts` | M08, M09 | Inventariado; por verificar |
| `src/modules/classbook/domain/planning.ts` | M08, M09 | Inventariado; por verificar |
| `src/modules/classbook/domain/syllabus-import.ts` | M08, M09 | Inventariado; por verificar |
| `src/modules/classbook/infrastructure/docx-table.ts` | M08, M09 | Inventariado; por verificar |
| `src/modules/classbook/infrastructure/plan-ai.ts` | M08, M09 | Inventariado; por verificar |
| `src/modules/classbook/presentation/actions.ts` | M08, M09 | Inventariado; por verificar |
| `src/modules/classbook/presentation/attendance-actions.ts` | M08, M09 | Inventariado; por verificar |
| `src/modules/classbook/presentation/daily-plan-actions.ts` | M08, M09 | Inventariado; por verificar |
| `src/modules/classbook/presentation/daily-plan-card.tsx` | M08, M09 | Inventariado; por verificar |
| `src/modules/classbook/presentation/folha-semanal.tsx` | M08, M09 | Inventariado; por verificar |
| `src/modules/classbook/presentation/fortnight-actions.ts` | M08, M09 | Inventariado; por verificar |
| `src/modules/classbook/presentation/fortnight-card.tsx` | M08, M09 | Inventariado; por verificar |
| `src/modules/classbook/presentation/generate-plans-bar.tsx` | M08, M09 | Inventariado; por verificar |
| `src/modules/classbook/presentation/justify-button.tsx` | M08, M09 | Inventariado; por verificar |
| `src/modules/classbook/presentation/lesson-form.tsx` | M08, M09 | Inventariado; por verificar |
| `src/modules/classbook/presentation/livro-actions.ts` | M08, M09 | Inventariado; por verificar |
| `src/modules/classbook/presentation/materials-actions.ts` | M08, M09 | Inventariado; por verificar |
| `src/modules/classbook/presentation/materials-panel.tsx` | M05, M08, M09 | Inventariado; por verificar |
| `src/modules/classbook/presentation/minutes-actions.ts` | M08, M09 | Inventariado; por verificar |
| `src/modules/classbook/presentation/minutes-form.tsx` | M08, M09 | Inventariado; por verificar |
| `src/modules/classbook/presentation/navegacao-da-semana.tsx` | M08, M09 | Inventariado; por verificar |
| `src/modules/classbook/presentation/observacoes-da-folha.tsx` | M08, M09 | Inventariado; por verificar |
| `src/modules/classbook/presentation/paginas-do-livro.tsx` | M02, M04, M08, M09, M12 | Inventariado; por verificar |
| `src/modules/classbook/presentation/plan-actions.ts` | M08, M09 | Inventariado; por verificar |
| `src/modules/classbook/presentation/plan-print.tsx` | M08, M09 | Inventariado; por verificar |
| `src/modules/classbook/presentation/syllabus-toolbar.tsx` | M08, M09 | Inventariado; por verificar |
| `src/modules/classbook/presentation/syllabus-week-card.tsx` | M08, M09 | Inventariado; por verificar |
| `src/modules/communication/application/anexos.ts` | M01, M12, M14 | Inventariado; por verificar |
| `src/modules/communication/application/caixa.ts` | M01, M12, M14 | Inventariado; por verificar |
| `src/modules/communication/application/comunicados.ts` | M01, M12, M14 | Inventariado; por verificar |
| `src/modules/communication/application/respostas.ts` | M01, M12, M14 | Inventariado; por verificar |
| `src/modules/communication/domain/alvo.ts` | M14 | Inventariado; por verificar |
| `src/modules/communication/domain/limites.ts` | M14 | Inventariado; por verificar |
| `src/modules/communication/domain/resposta.ts` | M14 | Inventariado; por verificar |
| `src/modules/communication/presentation/comunicado-actions.ts` | M14 | Inventariado; por verificar |
| `src/modules/communication/presentation/conversa.tsx` | M14 | Inventariado; por verificar |
| `src/modules/communication/presentation/escrever-form.tsx` | M14 | Inventariado; por verificar |
| `src/modules/communication/presentation/resposta-actions.ts` | M14 | Inventariado; por verificar |
| `src/modules/extracurricular/application/actividades.ts` | M01, M11, M12 | Inventariado; por verificar |
| `src/modules/extracurricular/application/avaliacoes.ts` | M01, M11, M12 | Inventariado; por verificar |
| `src/modules/extracurricular/application/inscritos.ts` | M01, M11, M12 | Inventariado; por verificar |
| `src/modules/extracurricular/application/percurso.ts` | M10, M11, M15 | Inventariado; por verificar |
| `src/modules/extracurricular/application/presencas.ts` | M01, M08, M09, M11, M12 | Inventariado; por verificar |
| `src/modules/extracurricular/application/propinas.ts` | M01, M10, M11, M12 | Inventariado; por verificar |
| `src/modules/extracurricular/application/relatorio.ts` | M01, M10, M11, M12 | Inventariado; por verificar |
| `src/modules/extracurricular/application/turmas.ts` | M01, M11, M12 | Inventariado; por verificar |
| `src/modules/extracurricular/domain/actividades.ts` | M10, M11 | Inventariado; por verificar |
| `src/modules/extracurricular/presentation/actividade-forms.tsx` | M10, M11 | Inventariado; por verificar |
| `src/modules/extracurricular/presentation/avaliacao-forms.tsx` | M10, M11 | Inventariado; por verificar |
| `src/modules/extracurricular/presentation/extracurricular-actions.ts` | M08, M09, M10, M11 | Inventariado; por verificar |
| `src/modules/extracurricular/presentation/inscrito-forms.tsx` | M10, M11 | Inventariado; por verificar |
| `src/modules/extracurricular/presentation/presenca-forms.tsx` | M08, M09, M10, M11 | Inventariado; por verificar |
| `src/modules/extracurricular/presentation/propina-forms.tsx` | M10, M11 | Inventariado; por verificar |
| `src/modules/extracurricular/presentation/turma-forms.tsx` | M10, M11 | Inventariado; por verificar |
| `src/modules/finance/application/charges.ts` | M01, M10, M12 | Inventariado; por verificar |
| `src/modules/finance/application/discounts.ts` | M01, M10, M12 | Inventariado; por verificar |
| `src/modules/finance/application/exports.ts` | M10 | Inventariado; por verificar |
| `src/modules/finance/application/fee-types.ts` | M01, M10, M12 | Inventariado; por verificar |
| `src/modules/finance/application/ledger.ts` | M01, M10, M12 | Inventariado; por verificar |
| `src/modules/finance/application/payments.ts` | M01, M10, M12, M14 | Inventariado; por verificar |
| `src/modules/finance/application/pdf-exports.ts` | M02, M04, M10, M12 | Inventariado; por verificar |
| `src/modules/finance/application/receipt.ts` | M10 | Inventariado; por verificar |
| `src/modules/finance/application/reports.ts` | M01, M10, M12 | Inventariado; por verificar |
| `src/modules/finance/application/settings.ts` | M01, M10, M12 | Inventariado; por verificar |
| `src/modules/finance/application/standing.ts` | M01, M10, M12 | Inventariado; por verificar |
| `src/modules/finance/domain/allocation.ts` | M10 | Inventariado; por verificar |
| `src/modules/finance/domain/billing-months.ts` | M10 | Inventariado; por verificar |
| `src/modules/finance/domain/discount.ts` | M10 | Inventariado; por verificar |
| `src/modules/finance/domain/late-fee.ts` | M10 | Inventariado; por verificar |
| `src/modules/finance/domain/money.ts` | M10 | Inventariado; por verificar |
| `src/modules/finance/domain/recurrence.ts` | M10 | Inventariado; por verificar |
| `src/modules/finance/domain/target.ts` | M10 | Inventariado; por verificar |
| `src/modules/finance/presentation/catalogue-forms.tsx` | M10 | Inventariado; por verificar |
| `src/modules/finance/presentation/debt-banner.tsx` | M01, M10, M12 | Inventariado; por verificar |
| `src/modules/finance/presentation/export-buttons.tsx` | M10 | Inventariado; por verificar |
| `src/modules/finance/presentation/fee-forms.tsx` | M10 | Inventariado; por verificar |
| `src/modules/finance/presentation/finance-actions.ts` | M10 | Inventariado; por verificar |
| `src/modules/finance/presentation/generate-form.tsx` | M10 | Inventariado; por verificar |
| `src/modules/finance/presentation/grade-block.tsx` | M10 | Inventariado; por verificar |
| `src/modules/finance/presentation/payment-form.tsx` | M10 | Inventariado; por verificar |
| `src/modules/finance/presentation/relatorios-nav.tsx` | M10 | Inventariado; por verificar |
| `src/modules/finance/presentation/report-filters.tsx` | M10 | Inventariado; por verificar |
| `src/modules/finance/presentation/student-forms.tsx` | M10 | Inventariado; por verificar |
| `src/modules/finance/presentation/undo-forms.tsx` | M10 | Inventariado; por verificar |
| `src/modules/finance/presentation/void-charges-form.tsx` | M10 | Inventariado; por verificar |
| `src/modules/gatehouse/application/access.ts` | M01, M12, M13, M14 | Inventariado; por verificar |
| `src/modules/gatehouse/application/cards.ts` | M01, M12, M13 | Inventariado; por verificar |
| `src/modules/gatehouse/application/devices.ts` | M01, M12, M13 | Inventariado; por verificar |
| `src/modules/gatehouse/application/livro-de-ponto.ts` | M01, M12, M13 | Inventariado; por verificar |
| `src/modules/gatehouse/application/photos.ts` | M01, M12, M13 | Inventariado; por verificar |
| `src/modules/gatehouse/domain/access.ts` | M01, M12, M13 | Inventariado; por verificar |
| `src/modules/gatehouse/domain/guardian-notice.ts` | M13 | Inventariado; por verificar |
| `src/modules/gatehouse/domain/leitor.ts` | M13 | Inventariado; por verificar |
| `src/modules/gatehouse/domain/livro-de-ponto.ts` | M13 | Inventariado; por verificar |
| `src/modules/gatehouse/presentation/access-actions.ts` | M13 | Inventariado; por verificar |
| `src/modules/gatehouse/presentation/access-faixa.tsx` | M13 | Inventariado; por verificar |
| `src/modules/gatehouse/presentation/apito.ts` | M13 | Inventariado; por verificar |
| `src/modules/gatehouse/presentation/boas-vindas-do-leitor.tsx` | M13 | Inventariado; por verificar |
| `src/modules/gatehouse/presentation/card-sheet.tsx` | M01, M12, M13 | Inventariado; por verificar |
| `src/modules/gatehouse/presentation/device-actions.ts` | M13 | Inventariado; por verificar |
| `src/modules/gatehouse/presentation/device-forms.tsx` | M13 | Inventariado; por verificar |
| `src/modules/gatehouse/presentation/gate-console.tsx` | M13 | Inventariado; por verificar |
| `src/modules/gatehouse/presentation/gate-lock-store.ts` | M13 | Inventariado; por verificar |
| `src/modules/gatehouse/presentation/gate-lock.tsx` | M13 | Inventariado; por verificar |
| `src/modules/gatehouse/presentation/gatekeeper-mount.tsx` | M13 | Inventariado; por verificar |
| `src/modules/gatehouse/presentation/gatekeeper-overlay.tsx` | M13 | Inventariado; por verificar |
| `src/modules/gatehouse/presentation/id-card.tsx` | M13 | Inventariado; por verificar |
| `src/modules/gatehouse/presentation/leitor-de-mao.tsx` | M13 | Inventariado; por verificar |
| `src/modules/gatehouse/presentation/livro-tabela.tsx` | M13 | Inventariado; por verificar |
| `src/modules/gatehouse/presentation/modo-leitor-store.ts` | M13 | Inventariado; por verificar |
| `src/modules/gatehouse/presentation/navegacao-do-livro.tsx` | M13 | Inventariado; por verificar |
| `src/modules/gatehouse/presentation/notice-button.tsx` | M13 | Inventariado; por verificar |
| `src/modules/gatehouse/presentation/photo-actions.ts` | M13 | Inventariado; por verificar |
| `src/modules/gatehouse/presentation/photo-upload.tsx` | M13 | Inventariado; por verificar |
| `src/modules/identity/application/administration.ts` | M01, M12 | Inventariado; por verificar |
| `src/modules/identity/application/audit-log.ts` | M01, M12 | Inventariado; por verificar |
| `src/modules/identity/application/authorization.ts` | M01, M12 | Inventariado; por verificar |
| `src/modules/identity/application/can-open.ts` | M01, M12 | Inventariado; por verificar |
| `src/modules/identity/application/credential-emails.ts` | M01, M12 | Inventariado; por verificar |
| `src/modules/identity/application/credentials.ts` | M01, M12 | Inventariado; por verificar |
| `src/modules/identity/application/login-resolution.ts` | M01, M12 | Inventariado; por verificar |
| `src/modules/identity/application/profile.ts` | M01, M12 | Inventariado; por verificar |
| `src/modules/identity/application/qr-credentials.ts` | M01, M12 | Inventariado; por verificar |
| `src/modules/identity/application/school-accounts.ts` | M01, M12 | Inventariado; por verificar |
| `src/modules/identity/domain/access-level.ts` | M01, M12 | Inventariado; por verificar |
| `src/modules/identity/domain/account-identity.ts` | M01, M12 | Inventariado; por verificar |
| `src/modules/identity/domain/effective-permissions.ts` | M01, M12 | Inventariado; por verificar |
| `src/modules/identity/domain/navigation.ts` | M01, M12 | Inventariado; por verificar |
| `src/modules/identity/domain/permission-catalogue.ts` | M01, M12 | Inventariado; por verificar |
| `src/modules/identity/domain/qr-token.ts` | M01, M12 | Inventariado; por verificar |
| `src/modules/identity/domain/rasto.ts` | M01, M12 | Inventariado; por verificar |
| `src/modules/identity/domain/role-catalogue.ts` | M01, M12 | Inventariado; por verificar |
| `src/modules/identity/domain/route-permissions.ts` | M01, M12 | Inventariado; por verificar |
| `src/modules/identity/infrastructure/auth-client.ts` | M01, M12 | Inventariado; por verificar |
| `src/modules/identity/infrastructure/auth.ts` | M01, M12 | Inventariado; por verificar |
| `src/modules/identity/infrastructure/qr-login-plugin.ts` | M01, M12 | Inventariado; por verificar |
| `src/modules/identity/infrastructure/qr-token.ts` | M01, M12 | Inventariado; por verificar |
| `src/modules/identity/presentation/admin-actions.ts` | M01, M12 | Inventariado; por verificar |
| `src/modules/identity/presentation/app-sidebar.tsx` | M01, M12 | Inventariado; por verificar |
| `src/modules/identity/presentation/auth-actions.ts` | M01, M12, M13 | Inventariado; por verificar |
| `src/modules/identity/presentation/card-login.tsx` | M01, M12, M13 | Inventariado; por verificar |
| `src/modules/identity/presentation/categoria-ponto-form.tsx` | M01, M12 | Inventariado; por verificar |
| `src/modules/identity/presentation/credential-actions.ts` | M01, M12 | Inventariado; por verificar |
| `src/modules/identity/presentation/credential-forms.tsx` | M01, M12 | Inventariado; por verificar |
| `src/modules/identity/presentation/level-select.tsx` | M01, M12 | Inventariado; por verificar |
| `src/modules/identity/presentation/link-permitido.tsx` | M01, M12 | Inventariado; por verificar |
| `src/modules/identity/presentation/login-form.tsx` | M01, M12 | Inventariado; por verificar |
| `src/modules/identity/presentation/mobile-nav.tsx` | M01, M12 | Inventariado; por verificar |
| `src/modules/identity/presentation/my-qr.tsx` | M01, M12 | Inventariado; por verificar |
| `src/modules/identity/presentation/password-form.tsx` | M01, M12 | Inventariado; por verificar |
| `src/modules/identity/presentation/profile-actions.ts` | M01, M12 | Inventariado; por verificar |
| `src/modules/identity/presentation/qr-actions.ts` | M01, M12 | Inventariado; por verificar |
| `src/modules/identity/presentation/qr-entry.tsx` | M01, M12 | Inventariado; por verificar |
| `src/modules/identity/presentation/qr-forms.tsx` | M01, M12 | Inventariado; por verificar |
| `src/modules/identity/presentation/recuperar-actions.ts` | M01, M12 | Inventariado; por verificar |
| `src/modules/identity/presentation/recuperar-forms.tsx` | M01, M12 | Inventariado; por verificar |
| `src/modules/identity/presentation/role-dialogs.tsx` | M01, M12 | Inventariado; por verificar |
| `src/modules/identity/presentation/user-dialogs.tsx` | M01, M12 | Inventariado; por verificar |
| `src/modules/identity/presentation/user-menu.tsx` | M01, M12 | Inventariado; por verificar |
| `src/modules/notifications/application/avisar.ts` | M14 | Inventariado; por verificar |
| `src/modules/notifications/application/caixa.ts` | M01, M12, M14 | Inventariado; por verificar |
| `src/modules/notifications/application/mensagens.ts` | M10, M14 | Inventariado; por verificar |
| `src/modules/notifications/application/push.ts` | M01, M12, M14 | Inventariado; por verificar |
| `src/modules/notifications/application/relatorio-alcance.ts` | M01, M12, M14 | Inventariado; por verificar |
| `src/modules/notifications/application/rotina.ts` | M10, M14 | Inventariado; por verificar |
| `src/modules/notifications/domain/aviso.ts` | M14 | Inventariado; por verificar |
| `src/modules/notifications/domain/canais.ts` | M14 | Inventariado; por verificar |
| `src/modules/notifications/presentation/avisos-neste-aparelho.tsx` | M14 | Inventariado; por verificar |
| `src/modules/notifications/presentation/canais-actions.ts` | M01, M12, M14 | Inventariado; por verificar |
| `src/modules/notifications/presentation/canais-form.tsx` | M14 | Inventariado; por verificar |
| `src/modules/notifications/presentation/convite-de-avisos.tsx` | M14 | Inventariado; por verificar |
| `src/modules/notifications/presentation/push-actions.ts` | M01, M12, M14 | Inventariado; por verificar |
| `src/modules/notifications/presentation/sininho-actions.ts` | M14 | Inventariado; por verificar |
| `src/modules/notifications/presentation/sininho.tsx` | M14 | Inventariado; por verificar |
| `src/modules/notifications/presentation/usar-avisos.ts` | M14 | Inventariado; por verificar |
| `src/modules/notifications/presentation/vigia-de-avisos.tsx` | M14 | Inventariado; por verificar |
| `src/modules/payments/application/conta-corrente.ts` | M01, M10, M12 | Inventariado; por verificar |
| `src/modules/payments/application/pagar.ts` | M10 | Inventariado; por verificar |
| `src/modules/payments/application/silenciadores.ts` | M10 | Inventariado; por verificar |
| `src/modules/payments/application/webhook.ts` | M03, M10 | Inventariado; por verificar |
| `src/modules/payments/domain/forma-online.ts` | M10 | Inventariado; por verificar |
| `src/modules/payments/domain/pagamento-online.ts` | M10 | Inventariado; por verificar |
| `src/modules/payments/presentation/campo-de-numero.tsx` | M10 | Inventariado; por verificar |
| `src/modules/payments/presentation/pagar-actions.ts` | M10 | Inventariado; por verificar |
| `src/modules/payments/presentation/pagar-divida.tsx` | M10 | Inventariado; por verificar |
| `src/modules/payments/presentation/pagar-online.tsx` | M10 | Inventariado; por verificar |
| `src/modules/portal/application/my-sections.ts` | M01, M02, M04, M05, M06, M07, M08, M09, M12, M13, M15 | Inventariado; por verificar |
| `src/modules/portal/application/teacher-desk.ts` | M01, M02, M04, M12, M13, M15 | Inventariado; por verificar |
| `src/modules/portal/presentation/manter-fresco.tsx` | M15 | Inventariado; por verificar |
| `src/modules/portal/presentation/percurso-nav.tsx` | M15 | Inventariado; por verificar |
| `src/modules/portal/presentation/portaria-hoje.tsx` | M15 | Inventariado; por verificar |
| `src/modules/portal/presentation/resolver-aluno.ts` | M15 | Inventariado; por verificar |
| `src/modules/portal/presentation/sem-aluno.tsx` | M15 | Inventariado; por verificar |
| `src/modules/portal/presentation/student-header.tsx` | M02, M04, M12, M15 | Inventariado; por verificar |
| `src/modules/portal/presentation/teacher-desk.tsx` | M01, M12, M15 | Inventariado; por verificar |
| `src/modules/portal/presentation/ward-picker.tsx` | M15 | Inventariado; por verificar |
| `src/modules/scheduling/application/assignments.ts` | M01, M05, M12 | Inventariado; por verificar |
| `src/modules/scheduling/application/period-structure.ts` | M01, M05, M12 | Inventariado; por verificar |
| `src/modules/scheduling/application/timetable.ts` | M01, M05, M12 | Inventariado; por verificar |
| `src/modules/scheduling/domain/assignment-rules.ts` | M05 | Inventariado; por verificar |
| `src/modules/scheduling/domain/gaps.ts` | M05 | Inventariado; por verificar |
| `src/modules/scheduling/domain/grupos.ts` | M05 | Inventariado; por verificar |
| `src/modules/scheduling/domain/timetable-conflict.ts` | M05 | Inventariado; por verificar |
| `src/modules/scheduling/domain/weekday.ts` | M05 | Inventariado; por verificar |
| `src/modules/scheduling/presentation/actions.ts` | M05 | Inventariado; por verificar |
| `src/modules/scheduling/presentation/assignment-actions.ts` | M05 | Inventariado; por verificar |
| `src/modules/scheduling/presentation/assignment-form.tsx` | M05 | Inventariado; por verificar |
| `src/modules/scheduling/presentation/horarios-nav.tsx` | M05 | Inventariado; por verificar |
| `src/modules/scheduling/presentation/slot-editor.tsx` | M05 | Inventariado; por verificar |
| `src/modules/scheduling/presentation/timetable-grid.tsx` | M05 | Inventariado; por verificar |
| `src/modules/scheduling/presentation/timetable-week.tsx` | M05 | Inventariado; por verificar |
| `src/shared/application/ano-lectivo.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/application/audit.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/application/build-info.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/application/filter-memory.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/application/nao-encontrado.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/domain/ano-lectivo.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/domain/cargo.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/domain/content-key.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/domain/data-por-extenso.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/domain/encarregado.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/domain/ficheiro.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/domain/o-que-e-meu.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/domain/result.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/domain/semana.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/domain/sexo.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/domain/silenciador.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/infrastructure/archive.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/infrastructure/env.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/infrastructure/mailer.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/infrastructure/orion.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/infrastructure/pdf-document.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/infrastructure/request-origin.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/infrastructure/sealed-box.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/presentation/filter-memory-actions.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/aviso-da-palavra-passe.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/aviso-terreno-alheio.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/brand-mark.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/coming-soon.tsx` | M01, M12 | Inventariado; por verificar |
| `src/shared/ui/components/alert.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/components/avatar.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/components/badge.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/components/button.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/components/card.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/components/checkbox.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/components/command.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/components/dialog.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/components/dropdown-menu.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/components/input-group.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/components/input.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/components/label.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/components/popover.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/components/select.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/components/separator.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/components/sheet.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/components/sidebar.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/components/skeleton.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/components/sonner.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/components/table.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/components/tabs.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/components/textarea.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/components/tooltip.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/encolher-fotografia.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/filter-select.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/grade.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/hooks/use-mobile.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/impedimento.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/instalacao.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/lib/utils.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/nome-editavel.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/offline-banner.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/page-header.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/print-button.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/print-header.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/qr-code.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/qr-scanner.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/rasto.tsx` | M01, M12 | Inventariado; por verificar |
| `src/shared/ui/search-field.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/selector-de-ano.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/skeletons.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/theme-provider.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/toast-de-resultado.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `src/shared/ui/version-tag.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `openspec/specs/atribuicoes.md` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `openspec/specs/autenticacao-e-permissoes.md` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `openspec/specs/avaliacao-comportamento.md` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `openspec/specs/avisos.md` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `openspec/specs/calendario-de-avaliacoes.md` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `openspec/specs/candidaturas.md` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `openspec/specs/comunicacao.md` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `openspec/specs/diario-de-aula.md` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `openspec/specs/estrutura-do-ano.md` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `openspec/specs/extracurriculares.md` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `openspec/specs/financas.md` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `openspec/specs/horarios.md` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `openspec/specs/pagamentos-online.md` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `openspec/specs/paineis-por-perfil.md` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `openspec/specs/percurso-do-aluno.md` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `openspec/specs/planificacao.md` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `openspec/specs/portaria.md` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `tests/componentes/actividade-dialogo.test.tsx` | M10, M11 | Inventariado; por verificar |
| `tests/componentes/apagar-o-mapa.test.tsx` | M06, M07 | Inventariado; por verificar |
| `tests/componentes/aviso-da-palavra-passe.test.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `tests/componentes/bloco-sem-turmas.test.tsx` | M06, M07 | Inventariado; por verificar |
| `tests/componentes/convite-de-avisos.test.tsx` | M14 | Inventariado; por verificar |
| `tests/componentes/encarregado-do-aluno.test.tsx` | M02, M04, M12 | Inventariado; por verificar |
| `tests/componentes/escada-no-formulario.test.tsx` | M02, M04, M12 | Inventariado; por verificar |
| `tests/componentes/escolher-pessoas.test.tsx` | M14 | Inventariado; por verificar |
| `tests/componentes/estado-depois-de-gravar.test.tsx` | M10, M11 | Inventariado; por verificar |
| `tests/componentes/folha-semanal.test.tsx` | M08, M09 | Inventariado; por verificar |
| `tests/componentes/navegacao-da-semana.test.tsx` | M08, M09 | Inventariado; por verificar |
| `tests/componentes/navegacao-do-livro.test.tsx` | M13 | Inventariado; por verificar |
| `tests/componentes/o-ecra-nao-vai-ao-papel.test.tsx` | M06, M07 | Inventariado; por verificar |
| `tests/componentes/paginas-do-livro.test.tsx` | M02, M04, M08, M09, M12 | Inventariado; por verificar |
| `tests/componentes/percurso-nav.test.tsx` | M15 | Inventariado; por verificar |
| `tests/componentes/rasto.test.tsx` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `tests/componentes/renovacao-ecra.test.tsx` | M02, M04, M12 | Inventariado; por verificar |
| `tests/componentes/setup.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `tests/componentes/sininho.test.tsx` | M14 | Inventariado; por verificar |
| `tests/componentes/turma-dialogo.test.tsx` | M10, M11 | Inventariado; por verificar |
| `tests/componentes/vigia-de-avisos.test.tsx` | M14 | Inventariado; por verificar |
| `tests/integration/ano-em-vista-db.test.ts` | M01, M02, M04, M06, M07, M12 | Inventariado; por verificar |
| `tests/integration/apagar-aluno-db.test.ts` | M01, M02, M04, M12 | Inventariado; por verificar |
| `tests/integration/aparelho-portaria-db.test.ts` | M01, M12, M13 | Inventariado; por verificar |
| `tests/integration/avisos-faltas-db.test.ts` | M01, M08, M09, M12 | Inventariado; por verificar |
| `tests/integration/avisos-gatilho-db.test.ts` | M01, M02, M04, M10, M12 | Inventariado; por verificar |
| `tests/integration/avisos-push-db.test.ts` | M14 | Inventariado; por verificar |
| `tests/integration/boletim-db.test.ts` | M01, M02, M04, M12 | Inventariado; por verificar |
| `tests/integration/caixa-avisos-db.test.ts` | M01, M12, M14 | Inventariado; por verificar |
| `tests/integration/calendario-db.test.ts` | M01, M06, M07, M12, M15 | Inventariado; por verificar |
| `tests/integration/calendario-regras-db.test.ts` | M01, M06, M07, M12 | Inventariado; por verificar |
| `tests/integration/candidaturas-db.test.ts` | M01, M02, M03, M04, M12 | Inventariado; por verificar |
| `tests/integration/cartoes-db.test.ts` | M01, M12, M13 | Inventariado; por verificar |
| `tests/integration/comunicados-db.test.ts` | M01, M12, M14 | Inventariado; por verificar |
| `tests/integration/conta-dupla-db.test.ts` | M01, M12, M13 | Inventariado; por verificar |
| `tests/integration/credenciais-partilhadas-db.test.ts` | M01, M12 | Inventariado; por verificar |
| `tests/integration/diario-datas-db.test.ts` | M01, M08, M09, M12 | Inventariado; por verificar |
| `tests/integration/diario-db.test.ts` | M01, M08, M09, M12 | Inventariado; por verificar |
| `tests/integration/diario-educacao-fisica-db.test.ts` | M01, M08, M09, M12 | Inventariado; por verificar |
| `tests/integration/extracurricular-avaliacoes-db.test.ts` | M01, M11, M12 | Inventariado; por verificar |
| `tests/integration/extracurricular-db.test.ts` | M01, M11, M12 | Inventariado; por verificar |
| `tests/integration/extracurricular-percurso-db.test.ts` | M01, M10, M11, M12, M15 | Inventariado; por verificar |
| `tests/integration/extracurricular-presencas-db.test.ts` | M01, M11, M12 | Inventariado; por verificar |
| `tests/integration/extracurricular-propinas-db.test.ts` | M01, M11, M12 | Inventariado; por verificar |
| `tests/integration/fecho-db.test.ts` | M01, M02, M04, M08, M09, M12 | Inventariado; por verificar |
| `tests/integration/ficha-db.test.ts` | M01, M02, M04, M12 | Inventariado; por verificar |
| `tests/integration/finance-db.test.ts` | M10 | Inventariado; por verificar |
| `tests/integration/gerar-sem-regras-db.test.ts` | M01, M10, M12 | Inventariado; por verificar |
| `tests/integration/ingles-db.test.ts` | M01, M08, M09, M12 | Inventariado; por verificar |
| `tests/integration/livro-de-turma-db.test.ts` | M01, M08, M09, M12 | Inventariado; por verificar |
| `tests/integration/livro-ponto-db.test.ts` | M01, M12, M13 | Inventariado; por verificar |
| `tests/integration/materiais-db.test.ts` | M01, M08, M09, M12 | Inventariado; por verificar |
| `tests/integration/mensagens-db.test.ts` | M10, M14 | Inventariado; por verificar |
| `tests/integration/notas-do-aluno-db.test.ts` | M01, M12, M15 | Inventariado; por verificar |
| `tests/integration/ordem-na-caderneta-db.test.ts` | M01, M06, M07, M12 | Inventariado; por verificar |
| `tests/integration/ordem-pautas-db.test.ts` | M01, M06, M07, M12 | Inventariado; por verificar |
| `tests/integration/pagamento-online-db.test.ts` | M01, M10, M12 | Inventariado; por verificar |
| `tests/integration/pagar-outro-ano-db.test.ts` | M01, M10, M12 | Inventariado; por verificar |
| `tests/integration/pauta-global-db.test.ts` | M01, M06, M07, M12 | Inventariado; por verificar |
| `tests/integration/pautas-grupos-db.test.ts` | M01, M06, M07, M12 | Inventariado; por verificar |
| `tests/integration/percurso-alheio-db.test.ts` | M01, M12, M15 | Inventariado; por verificar |
| `tests/integration/percurso-grupos-db.test.ts` | M01, M05, M12, M15 | Inventariado; por verificar |
| `tests/integration/perfis-db.test.ts` | M01, M12 | Inventariado; por verificar |
| `tests/integration/permissions-db.test.ts` | M01, M12 | Inventariado; por verificar |
| `tests/integration/pessoal-portaria-db.test.ts` | M01, M12, M13 | Inventariado; por verificar |
| `tests/integration/portaria-avisa-db.test.ts` | M01, M12, M13 | Inventariado; por verificar |
| `tests/integration/portaria-inteligente-db.test.ts` | M01, M12, M13 | Inventariado; por verificar |
| `tests/integration/posse-docente-db.test.ts` | M01, M06, M07, M08, M09, M12 | Inventariado; por verificar |
| `tests/integration/quem-assina-db.test.ts` | M01, M02, M04, M12 | Inventariado; por verificar |
| `tests/integration/quinzenal-db.test.ts` | M01, M08, M09, M12 | Inventariado; por verificar |
| `tests/integration/relatorios-alunos-extra-db.test.ts` | M01, M02, M04, M11, M12 | Inventariado; por verificar |
| `tests/integration/relatorios-novos-db.test.ts` | M01, M02, M04, M08, M09, M12, M14 | Inventariado; por verificar |
| `tests/integration/renovacao-db.test.ts` | M01, M02, M04, M12 | Inventariado; por verificar |
| `tests/integration/rotina-avisos-db.test.ts` | M10, M14 | Inventariado; por verificar |
| `tests/integration/saldo-e-anulacao-db.test.ts` | M10 | Inventariado; por verificar |
| `tests/integration/semana-de-ats-db.test.ts` | M01, M02, M04, M06, M07, M12, M15 | Inventariado; por verificar |
| `tests/integration/sumario-db.test.ts` | M01, M08, M09, M12 | Inventariado; por verificar |
| `tests/unit/access.test.ts` | M13 | Inventariado; por verificar |
| `tests/unit/account-identity.test.ts` | M01, M12 | Inventariado; por verificar |
| `tests/unit/actividades.test.ts` | M11 | Inventariado; por verificar |
| `tests/unit/alvo-de-comunicado.test.ts` | M14 | Inventariado; por verificar |
| `tests/unit/ano-lectivo.test.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `tests/unit/apito.test.ts` | M13 | Inventariado; por verificar |
| `tests/unit/assignment-rules.test.ts` | M05 | Inventariado; por verificar |
| `tests/unit/aula-dupla.test.ts` | M08, M09 | Inventariado; por verificar |
| `tests/unit/aviso-push.test.ts` | M13, M14 | Inventariado; por verificar |
| `tests/unit/avisos-financas.test.ts` | M10, M14 | Inventariado; por verificar |
| `tests/unit/boletim.test.ts` | M02, M04, M12 | Inventariado; por verificar |
| `tests/unit/calendario.test.ts` | M06, M07 | Inventariado; por verificar |
| `tests/unit/campo-de-numero.test.ts` | M10 | Inventariado; por verificar |
| `tests/unit/campos-para-o-aluno.test.ts` | M02, M03, M04, M12 | Inventariado; por verificar |
| `tests/unit/canais.test.ts` | M14 | Inventariado; por verificar |
| `tests/unit/candidaturas.test.ts` | M03 | Inventariado; por verificar |
| `tests/unit/cargo.test.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `tests/unit/comportamento.test.ts` | M06, M07 | Inventariado; por verificar |
| `tests/unit/conflitos-assumiveis.test.ts` | M05 | Inventariado; por verificar |
| `tests/unit/content-key.test.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `tests/unit/current-trimester.test.ts` | M02, M04, M12 | Inventariado; por verificar |
| `tests/unit/data-por-extenso.test.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `tests/unit/detalhe-para-familias.test.ts` | M06, M07 | Inventariado; por verificar |
| `tests/unit/directory-codes.test.ts` | M02, M04, M12 | Inventariado; por verificar |
| `tests/unit/effective-permissions.test.ts` | M01, M12 | Inventariado; por verificar |
| `tests/unit/encarregado.test.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `tests/unit/english-lesson-templates.test.ts` | M08, M09 | Inventariado; por verificar |
| `tests/unit/env-opcional.test.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `tests/unit/escada-da-escola.test.ts` | M02, M04, M12 | Inventariado; por verificar |
| `tests/unit/faltas-na-folha.test.ts` | M08, M09 | Inventariado; por verificar |
| `tests/unit/fecho.test.ts` | M02, M04, M12 | Inventariado; por verificar |
| `tests/unit/ficha-do-candidato.test.ts` | M02, M04, M12 | Inventariado; por verificar |
| `tests/unit/ficha.test.ts` | M02, M04, M12 | Inventariado; por verificar |
| `tests/unit/ficheiro.test.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `tests/unit/finance-allocation.test.ts` | M10 | Inventariado; por verificar |
| `tests/unit/finance-billing-months.test.ts` | M10 | Inventariado; por verificar |
| `tests/unit/finance-discount.test.ts` | M10 | Inventariado; por verificar |
| `tests/unit/finance-late-fee.test.ts` | M10 | Inventariado; por verificar |
| `tests/unit/finance-money.test.ts` | M10 | Inventariado; por verificar |
| `tests/unit/finance-pdf.test.ts` | M10 | Inventariado; por verificar |
| `tests/unit/folha-de-papel.test.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `tests/unit/formularios-aninhados.test.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `tests/unit/fortnight-rows.test.ts` | M08, M09 | Inventariado; por verificar |
| `tests/unit/fuso-da-escola.test.ts` | M13 | Inventariado; por verificar |
| `tests/unit/gaps.test.ts` | M05 | Inventariado; por verificar |
| `tests/unit/grade.test.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `tests/unit/grupos.test.ts` | M05 | Inventariado; por verificar |
| `tests/unit/guardian-matching.test.ts` | M02, M04, M12 | Inventariado; por verificar |
| `tests/unit/guardian-notice.test.ts` | M13 | Inventariado; por verificar |
| `tests/unit/icone-dos-avisos.test.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `tests/unit/leitor-cartoes.test.ts` | M13 | Inventariado; por verificar |
| `tests/unit/leitor.test.ts` | M13 | Inventariado; por verificar |
| `tests/unit/lesson-number.test.ts` | M08, M09 | Inventariado; por verificar |
| `tests/unit/lesson-templates.test.ts` | M08, M09 | Inventariado; por verificar |
| `tests/unit/livro-de-ponto.test.ts` | M13 | Inventariado; por verificar |
| `tests/unit/mapas-em-paisagem.test.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `tests/unit/materials.test.ts` | M08, M09 | Inventariado; por verificar |
| `tests/unit/media-anual.test.ts` | M06, M07 | Inventariado; por verificar |
| `tests/unit/minutes-templates.test.ts` | M08, M09 | Inventariado; por verificar |
| `tests/unit/navegacao-avaliacao.test.ts` | M01, M12 | Inventariado; por verificar |
| `tests/unit/navigation-active.test.ts` | M01, M12 | Inventariado; por verificar |
| `tests/unit/o-que-e-meu.test.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `tests/unit/ordem-das-disciplinas.test.ts` | M06, M07 | Inventariado; por verificar |
| `tests/unit/overall-average.test.ts` | M06, M07 | Inventariado; por verificar |
| `tests/unit/pagamento-online.test.ts` | M10 | Inventariado; por verificar |
| `tests/unit/page-guard.test.ts` | M01, M12 | Inventariado; por verificar |
| `tests/unit/pe-lesson-templates.test.ts` | M08, M09 | Inventariado; por verificar |
| `tests/unit/permission-catalogue.test.ts` | M01, M12 | Inventariado; por verificar |
| `tests/unit/planning.test.ts` | M08, M09 | Inventariado; por verificar |
| `tests/unit/proxy-ano.test.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `tests/unit/qr-origin.test.ts` | M01, M12 | Inventariado; por verificar |
| `tests/unit/qr-token.test.ts` | M01, M12 | Inventariado; por verificar |
| `tests/unit/rasto.test.ts` | M01, M12 | Inventariado; por verificar |
| `tests/unit/record-book-import.test.ts` | M06, M07 | Inventariado; por verificar |
| `tests/unit/record-fields.test.ts` | M02, M04, M12 | Inventariado; por verificar |
| `tests/unit/renovacao.test.ts` | M02, M04, M12 | Inventariado; por verificar |
| `tests/unit/resposta-privada.test.ts` | M14 | Inventariado; por verificar |
| `tests/unit/rota-tarefas.test.ts` | M14 | Inventariado; por verificar |
| `tests/unit/route-permissions.test.ts` | M01, M12 | Inventariado; por verificar |
| `tests/unit/sair-da-portaria.test.ts` | M01, M12, M13 | Inventariado; por verificar |
| `tests/unit/sealed-box.test.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `tests/unit/seccoes-da-candidatura.test.ts` | M03 | Inventariado; por verificar |
| `tests/unit/seccoes-da-ficha.test.ts` | M02, M04, M12 | Inventariado; por verificar |
| `tests/unit/service-worker-avisos.test.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `tests/unit/sexo.test.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `tests/unit/silenciador.test.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `tests/unit/student-status.test.ts` | M02, M04, M12 | Inventariado; por verificar |
| `tests/unit/syllabus-import.test.ts` | M08, M09 | Inventariado; por verificar |
| `tests/unit/timetable-conflict.test.ts` | M05 | Inventariado; por verificar |
| `tests/unit/trimester-average.test.ts` | M06, M07 | Inventariado; por verificar |
| `tests/unit/turmas-automaticas.test.ts` | M03 | Inventariado; por verificar |
| `tests/unit/vigilancia.test.ts` | M06, M07 | Inventariado; por verificar |
| `tests/unit/visto-analitico.test.ts` | M08, M09 | Inventariado; por verificar |
| `scripts/_amostra.mts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `scripts/aluno-sem-financas.mts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `scripts/backup.sh` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `scripts/candidatura-sem-taxa.mts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `scripts/corrigir-sexo.mts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `scripts/create-user.mts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `scripts/import-anagraphic.mts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `scripts/import-legacy-data.mts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `scripts/restaurar.sh` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `scripts/seed-sample-timetable.mts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `scripts/set-superadmin-password.mts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `scripts/sync-permissions.mts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `prisma/schema.prisma` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `package.json` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |
| `next.config.ts` | Transversal / decompor no módulo consumidor | Inventariado; por verificar |

## Deriva desde a proposta

Sem divergências nos ficheiros inventariados.

## Estado do destino no início

HEAD `dace519`; apenas artefactos desta proposta não versionados. O inventário em ficheiros de domínio é preliminar e não constitui prova de paridade.
