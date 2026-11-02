import { describe, expect, it } from "vitest";
import { changePasswordSchema } from "./change-password";

const input = { currentPassword: "existing", newPassword: " A long phrase with spaces ", confirmPassword: " A long phrase with spaces " };
describe("own password policy", () => {
  it("preserves spaces and existing short passwords for verification", () => {
    expect(changePasswordSchema.parse(input)).toEqual(input);
  });
  it.each([
    { newPassword: "short", confirmPassword: "short" },
    { newPassword: "x".repeat(129), confirmPassword: "x".repeat(129) },
    { confirmPassword: "a different phrase" },
    { currentPassword: "" },
    { currentPassword: "x".repeat(1025) },
  ])("refuses invalid input without truncation", patch => {
    expect(changePasswordSchema.safeParse({ ...input, ...patch }).success).toBe(false);
  });
});
