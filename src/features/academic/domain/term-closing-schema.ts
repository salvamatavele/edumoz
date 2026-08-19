import { z } from "zod";

export const closeTermSchema = z.object({
  termId: z.string().trim().min(1),
});

export type CloseTermInput = z.infer<typeof closeTermSchema>;

export type CloseTermActionResult =
  | { readonly status: "success"; readonly resultCount: number }
  | { readonly status: "error"; readonly message: string };
