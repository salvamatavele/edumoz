import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { createSchoolUserSchema } from "./create-school-user";
const input = () => ({ requestId: randomUUID(), name: "Synthetic account", roles: ["STUDENT"] });
it("accepts an account without email or telephone", () => {
  expect(createSchoolUserSchema.parse(input())).toMatchObject({ email: "", phone: "", teacherCode: "" });
});
it("normalizes Mozambican numbers without changing the public profile code", () => {
  expect(createSchoolUserSchema.parse({ ...input(), phone: "841234567" }).phone).toBe("+258841234567");
});
it.each([
  { roles: [] }, { roles: ["PLATFORM_ADMIN"] }, { roles: ["TEACHER", "TEACHER"] },
  { name: "A" }, { phone: "123" }, { email: "not-an-email" }, { requestId: "arbitrary" },
  { teacherCode: "T001", roles: ["GUARDIAN"] },
])("refuses invalid roles, contacts, replay identity or links", patch => {
  expect(createSchoolUserSchema.safeParse({ ...input(), ...patch }).success).toBe(false);
});
