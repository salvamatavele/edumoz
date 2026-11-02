import { expect, it } from "vitest";
import { resourcePermissionLevel, setResourcePermissionLevel } from "./permission-level";
const entries = [{ id: "view", action: "view" as const }, { id: "edit", action: "edit" as const }, { id: "create", action: "create" as const }];
it("distinguishes none, read, write and fine-grained combinations without upgrading them", () => {
  expect(resourcePermissionLevel(entries, new Set())).toBe("none");
  expect(resourcePermissionLevel(entries, new Set(["view"]))).toBe("read");
  expect(resourcePermissionLevel(entries, new Set(["edit"]))).toBe("custom");
  expect(resourcePermissionLevel(entries, new Set(["view", "edit", "create"]))).toBe("write");
  expect(resourcePermissionLevel(entries.slice(0, 1), new Set(["view"]))).toBe("read");
});
it("changes only the selected resource while retaining grants from others", () => {
  const selected = new Set(["edit", "unrelated"]);
  expect([...setResourcePermissionLevel(entries, selected, "read")].sort()).toEqual(["unrelated", "view"]);
  expect([...setResourcePermissionLevel(entries, selected, "write")].sort()).toEqual(["create", "edit", "unrelated", "view"]);
  expect([...setResourcePermissionLevel(entries, selected, "none")]).toEqual(["unrelated"]);
  expect([...selected]).toEqual(["edit", "unrelated"]);
});
