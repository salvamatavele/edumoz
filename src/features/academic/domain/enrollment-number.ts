/**
 * Sugestão de número de matrícula: `{ano}/{sequência}`, a mesma convenção usada em
 * `prisma/seed.ts`. É só uma sugestão — o formulário deixa o número editável, e um
 * choque com outra matrícula é apanhado pelo índice único em `enroll-student.ts`, não
 * aqui. Pura de propósito: não faz sentido depender da base de dados só para formatar uma
 * string.
 */
export function suggestEnrollmentNumber(academicYear: number, existingCount: number): string {
  const sequence = String(existingCount + 1).padStart(3, "0");
  return `${academicYear}/${sequence}`;
}
