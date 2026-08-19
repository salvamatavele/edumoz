import { z } from "zod";

/**
 * Regras de matrícula de um aluno já existente na escola.
 *
 * `studentId` não é um campo que o utilizador preenche — vem do botão "Matricular" na
 * linha do aluno, tal como `schoolId` nunca vem do cliente em `create-student`. Continua
 * no esquema porque a Server Action é um ponto de entrada público independente da UI que a
 * chama, e tem de validar sozinha.
 */
export const enrollStudentSchema = z.object({
  studentId: z.string().trim().min(1),
  classGroupId: z.string().trim().min(1),
  studyPathId: z.string().trim().min(1),
  number: z.string().trim().min(1),
});

export type EnrollStudentInput = z.infer<typeof enrollStudentSchema>;
