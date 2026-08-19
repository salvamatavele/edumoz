import { z } from "zod";

import { AttendanceStatus } from "@/types";

/**
 * Payload de submissão de uma sessão de presenças — só o DELTA face a "Presente" (o
 * valor por omissão da sessão), não a lista toda. `status` continua a aceitar `PRESENT`
 * de propósito: reverter um aluno de volta a "Presente" (ex.: depois de reabrir a sessão)
 * também é uma mudança que precisa de chegar ao servidor.
 */
export const submitAttendanceSchema = z.object({
  scheduleEntryId: z.string().trim().min(1),
  date: z.coerce.date(),
  changes: z.array(
    z.object({
      enrollmentId: z.string().trim().min(1),
      status: z.enum(AttendanceStatus),
      minutesLate: z.coerce.number().int().min(0).optional(),
      note: z.string().trim().optional(),
    }),
  ),
});

export type SubmitAttendanceInput = z.infer<typeof submitAttendanceSchema>;

export type AttendanceActionResult =
  | { readonly status: "success" }
  | { readonly status: "error"; readonly message: string };
