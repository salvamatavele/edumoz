import { z } from "zod";

import { Gender } from "@/types";

/**
 * Regras de criação de um aluno.
 *
 * O mesmo esquema valida dos dois lados — `FormModal` no cliente (`zodResolver`) e
 * `create-student` no servidor (`safeParse`) — para as regras nunca divergirem entre os
 * dois. Cobre só os campos que o `create-student` (o molde dos módulos seguintes) precisa
 * para demonstrar o padrão; os restantes campos opcionais do modelo `Student` ficam para
 * quando um ecrã de edição os precisar.
 */
export const createStudentSchema = z.object({
  code: z.string().trim().min(1),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  birthDate: z.coerce.date(),
  gender: z.enum(Gender),
  phone: z.string().trim().optional().or(z.literal("")),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
