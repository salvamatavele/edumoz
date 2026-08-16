# Spec — Identidade digital

- **Estado:** Por aprovar
- **Depende de:** [`domain-foundation.md`](./domain-foundation.md), [`pending-fixes.md`](./pending-fixes.md), [`assessment-module.md`](./assessment-module.md)
- **Âmbito:** cartão de estudante com QR e emissão de certificados e declarações.

---

## 1. Contexto

O modelo existe: `StudentCard` e `IssuedDocument`. Depende do módulo de avaliação porque um
certificado de conclusão precisa das pautas fechadas.

Este módulo produz **documentos que valem fora da escola** — uma declaração de matrícula
apresentada num banco, um certificado apresentado numa universidade. Isso muda o que conta
como correcto: não basta o documento estar certo hoje, tem de continuar a poder ser
verificado e reemitido igual daqui a cinco anos.

---

## 2. Requisitos

| ID | Requisito |
|----|-----------|
| RF-01 | Cartão de estudante com fotografia, número, turma, validade e QR |
| RF-02 | O QR aponta para uma página pública de verificação |
| RF-03 | Revogar um cartão invalida o QR imediatamente |
| RF-04 | Emissão de declaração de matrícula e de frequência |
| RF-05 | Emissão de certificado de conclusão e de certidão de transferência |
| RF-06 | Cada documento tem código de verificação único e página pública |
| RF-07 | Exportação em PDF |
| RF-08 | Impressão de cartões em lote, por turma |

### Não funcionais

| ID | Requisito |
|----|-----------|
| RNF-01 | O QR **não** codifica identificadores internos |
| RNF-02 | A página de verificação não revela dados pessoais desnecessários |
| RNF-03 | Reemitir um documento anos depois devolve o mesmo conteúdo |
| RNF-04 | PDF legível a preto e branco, em impressora comum |

---

## 3. Desenho

### 3.1 O QR não leva o id do aluno

`StudentCard.qrToken` é aleatório e único, e é isso que o QR codifica. Duas razões:

1. Um cartão perdido não deve revelar identificadores internos.
2. Tokens sequenciais permitiriam **enumerar** os alunos da escola a partir de um único
   cartão fotografado.

Revogar é marcar `status: REVOKED` — o token deixa de resolver. Reemitir gera token novo e
incrementa `version`, o que invalida o cartão anterior mesmo que continue em circulação.

### 3.2 A página de verificação mostra o mínimo

`/verificar/[token]` é **pública** — quem a consulta é um segurança à porta, um funcionário
de banco, alguém sem sessão. Mostra apenas:

```
✅ Cartão válido
Nome, fotografia, turma, ano lectivo, validade
```

Não mostra data de nascimento, documento de identificação, morada, notas nem situação de
propinas. Um cartão perdido não pode ser uma fuga de dados.

Para um cartão revogado ou expirado, mostra apenas "não válido" — sem dizer de quem era.

### 3.3 Instantâneo, não consulta viva

`IssuedDocument.payload` guarda os dados **no momento da emissão**. Um certificado emitido
em 2026 tem de continuar a dizer o que dizia em 2026, mesmo que o aluno mude de nome, a
escola mude de morada, ou a pauta seja corrigida.

Reemitir o mesmo documento renderiza o `payload` guardado, não uma consulta nova. É a
diferença entre uma segunda via e um documento novo com o mesmo número.

### 3.4 Geração de PDF

`react-pdf` (`@react-pdf/renderer`), no servidor.

**Nota de expectativa:** o `react-pdf` não usa Tailwind — tem o seu próprio sistema de
estilos. Os tokens da Fase 1 têm de ser traduzidos para uma folha de estilos própria, em
`features/identity/ui/pdf/tokens.ts`, importando os mesmos valores hexadecimais para não
haver duas paletas. Não é possível reaproveitar os componentes de UI existentes.

A geração corre num route handler e não numa Server Action: devolve um ficheiro binário,
que não é o que as Server Actions servem.

### 3.5 Fotografias

`Student.photoUrl` existe mas não há carregamento de ficheiros no projecto. Este módulo
precisa de decidir o armazenamento — e essa decisão tem implicações de custo e de
privacidade que devem ser tomadas explicitamente. Fica assinalado como **por decidir**, não
assumido.

---

## 4. Critérios de aceitação

- [ ] O QR de um cartão não contém o id do aluno nem da matrícula
- [ ] Dois cartões emitidos seguidos têm tokens sem relação entre si
- [ ] A página de verificação não mostra data de nascimento nem morada
- [ ] Um cartão revogado deixa de validar imediatamente
- [ ] Reemitir invalida o cartão anterior
- [ ] Uma declaração reemitida um ano depois tem conteúdo idêntico
- [ ] O certificado de conclusão só é emitido com as pautas fechadas
- [ ] O PDF é legível a preto e branco
- [ ] Impressão em lote produz um PDF por turma
- [ ] `pnpm build`, `lint` e `test` verdes

---

## 5. Fora de âmbito

Assinatura digital com valor legal, integração com o sistema nacional de certificação, e
cartões com NFC ou código de barras.

---

## 6. Decisões pendentes

1. **Armazenamento das fotografias** — sistema de ficheiros, S3 compatível, ou base de
   dados. Afecta custo, cópias de segurança e privacidade.
2. **Quem pode emitir** cada tipo de documento. Uma declaração de matrícula é rotina; um
   certificado de conclusão provavelmente não deve sair sem a direcção.
3. **Prazo de validade** do cartão — ano lectivo ou ciclo.
