// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { isRetryableTransactionError, withTransactionRetry } from "./transaction-retry";
describe("bounded database transaction retry", () => {
  it.each([{ code: "P2034" }, { code: "P2010", meta: { code: "1020" } }, { meta: { driverAdapterError: { cause: { kind: "TransactionWriteConflict", originalCode: "1213" } } } }, { meta: { code: "1205" } }])("recognizes recoverable database conflicts", error => {
    expect(isRetryableTransactionError(error)).toBe(true);
  });
  it("does not retry uniqueness, validation or arbitrary failures", async () => {
    for (const error of [{ code: "P2002" }, { code: "P2003" }, Error("application failure")]) {
      const work = vi.fn().mockRejectedValue(error);
      await expect(withTransactionRetry(work)).rejects.toBe(error);
      expect(work).toHaveBeenCalledTimes(1);
    }
  });
  it("retries a rolled-back conflict and returns the eventual result", async () => {
    const work = vi.fn().mockRejectedValueOnce({ code: "P2034" }).mockResolvedValue("committed");
    expect(await withTransactionRetry(work)).toBe("committed");
    expect(work).toHaveBeenCalledTimes(2);
  });
  it("stops after three attempts", async () => {
    const error = { code: "P2034" };
    const work = vi.fn().mockRejectedValue(error);
    await expect(withTransactionRetry(work)).rejects.toBe(error);
    expect(work).toHaveBeenCalledTimes(3);
  });
});
