import { z } from "zod";

export const closeTermSchema = z.object({
  termId: z.string().trim().min(1),
});

export type CloseTermInput = z.infer<typeof closeTermSchema>;

export type CloseTermActionResult =
  | { readonly status: "success"; readonly resultCount: number }
  | { readonly status: "error"; readonly message: string };

export const reopenTermSchema = z.object({ termId: z.string().trim().min(1), reason: z.string().trim().min(10).max(1000) });
export type ReopenTermInput = z.infer<typeof reopenTermSchema>;
