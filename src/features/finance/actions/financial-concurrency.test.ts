// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
vi.mock("@/i18n/navigation", () => ({ getPathname: ({ href }: { href: string }) => href }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
const { auth } = await import("@/lib/auth/config");
const { prisma } = await import("@/lib/db/client");
const { createIntegrityFixture, removeIntegrityFixtures } = await import("@/lib/db/tenant-integrity-fixtures");
const { allocateInvoiceReference } = await import("@/lib/db/invoice-reference");
const { generateInvoices } = await import("./generate-invoices");
const { recordManualPayment } = await import("./record-manual-payment");
const { initiateMobileMoneyPayment } = await import("./initiate-mobile-money-payment");
const { confirmPayment } = await import("./confirm-payment");
const { reversePayment } = await import("./reverse-payment");
const { SimulatedGateway } = await import("../data/gateways/simulated-gateway");
const { MobileMoneyGatewayError } = await import("../domain/ports/mobile-money-gateway");
const { paymentIntentKey, invoiceGenerationKey } = await import("../data/financial-keys");

describe("financial concurrency and payment intentions", () => {
  let fixture: Awaited<ReturnType<typeof createIntegrityFixture>>;
  const ids: Record<string, string> = {};
  beforeAll(async () => {
    const school = await prisma.school.create({ data: { code: `INTEGRITY-FINANCE-${randomUUID()}`, name: "Synthetic finance", province: "Maputo", district: "KaMpfumu" } });
    fixture = await createIntegrityFixture(school.id, 2026);
    for (const [model, row] of Object.entries(fixture.rows)) if (row.id) ids[model] = String(row.id);
  }, 30000);
  beforeEach(async () => {
    vi.restoreAllMocks();
    await prisma.payment.deleteMany({ where: { schoolId: fixture.schoolId } });
    await prisma.invoice.deleteMany({ where: { schoolId: fixture.schoolId, id: { not: ids.Invoice } } });
    await prisma.invoice.update({ where: { id: ids.Invoice }, data: { paidAmount: "0", status: "PENDING", cancelledAt: null, revision: 0, currency: "MZN" } });
    await prisma.auditLog.deleteMany({ where: { schoolId: fixture.schoolId } });
    vi.mocked(auth).mockResolvedValue({ user: { id: ids.User }, schoolId: fixture.schoolId, role: "SCHOOL_MANAGER", isPlatformAdmin: false, memberships: [] } as never);
  });
  afterAll(async () => { if (fixture) await removeIntegrityFixtures([fixture]); });
  const manual = (amount: number, key = randomUUID()) => ({ invoiceId: ids.Invoice, amount, method: "CASH" as const, idempotencyKey: key });
  const mobile = (key = randomUUID(), payerPhone = "+258849876543") => ({ invoiceId: ids.Invoice, provider: "MPESA" as const, payerPhone, idempotencyKey: key });
  async function paidAmount() { return (await prisma.invoice.findUniqueOrThrow({ where: { id: ids.Invoice } })).paidAmount.toString(); }
  async function createPending() {
    const request = mobile();
    expect((await initiateMobileMoneyPayment(request)).status).toBe("success");
    return prisma.payment.findUniqueOrThrow({ where: { idempotencyKey: paymentIntentKey(fixture.schoolId, "mobile", request.idempotencyKey) } });
  }
  it("issues a concurrent generation once with one successful audit", async () => {
    const payload = { feeScheduleId: ids.FeeSchedule, periodYear: 2026, periodMonth: 9 };
    const results = await Promise.all([generateInvoices(payload), generateInvoices(payload)]);
    expect(results.every(result => result.status === "success")).toBe(true);
    expect(results.reduce((sum, result) => sum + (result.created ?? 0), 0)).toBe(1);
    expect(results.reduce((sum, result) => sum + (result.skipped ?? 0), 0)).toBe(1);
    const generationKey = invoiceGenerationKey(fixture.schoolId, ids.FeeSchedule, ids.Enrollment, 2026, 9);
    expect(await prisma.invoice.count({ where: { generationKey } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { schoolId: fixture.schoolId, action: "invoice.generate" } })).toBe(1);
    expect((await generateInvoices(payload)).skipped).toBe(1);
  });
  it("allocates distinct numeric references atomically under contention", async () => {
    const references = await Promise.all(Array.from({ length: 24 }, () => allocateInvoiceReference(fixture.schoolId, 2026, 9)));
    expect(new Set(references).size).toBe(24);
    expect(references.every(reference => /^202609-\d{4,}$/.test(reference))).toBe(true);
  });
  it("generates different schedules concurrently without reference collisions", async () => {
    const schedule = await prisma.feeSchedule.create({ data: { schoolId: fixture.schoolId, academicYearId: ids.AcademicYear, name: randomUUID() } });
    await prisma.feeItem.create({ data: { schoolId: fixture.schoolId, feeScheduleId: schedule.id, code: "OTHER", name: "Other fee", amount: "50", recurrence: "MONTHLY" } });
    const results = await Promise.all([generateInvoices({ feeScheduleId: ids.FeeSchedule, periodYear: 2026, periodMonth: 8 }), generateInvoices({ feeScheduleId: schedule.id, periodYear: 2026, periodMonth: 8 })]);
    expect(results.every(result => result.created === 1)).toBe(true);
    const invoices = await prisma.invoice.findMany({ where: { schoolId: fixture.schoolId, periodMonth: 8 } });
    expect(new Set(invoices.map(invoice => invoice.reference)).size).toBe(2);
  });
  it("repeats the same manual intent once and rejects changed parameters", async () => {
    const payload = manual(40);
    expect((await Promise.all([recordManualPayment(payload), recordManualPayment(payload)])).every(result => result.status === "success")).toBe(true);
    expect(await prisma.payment.count({ where: { invoiceId: ids.Invoice } })).toBe(1);
    expect(await paidAmount()).toBe("40");
    expect(await prisma.auditLog.count({ where: { schoolId: fixture.schoolId, action: "payment.recordManual" } })).toBe(1);
    expect(await recordManualPayment({ ...payload, amount: 41 })).toMatchObject({ status: "error", message: "finance.payments.errors.intentConflict" });
    expect(await recordManualPayment({ ...payload, method: "BANK_TRANSFER" })).toMatchObject({ status: "error" });
    expect(await paidAmount()).toBe("40");
  });
  it("arbitrates a reused key racing across two invoices without duplicate money", async () => {
    const other = await prisma.invoice.create({ data: { schoolId: fixture.schoolId, enrollmentId: ids.Enrollment, reference: randomUUID(), total: "100", dueDate: new Date("2026-09-10") } });
    const payload = manual(40);
    const results = await Promise.all([recordManualPayment(payload), recordManualPayment({ ...payload, invoiceId: other.id })]);
    expect(results.filter(result => result.status === "success")).toHaveLength(1);
    expect(results.find(result => result.status === "error")).toMatchObject({ message: "finance.payments.errors.intentConflict" });
    expect(await prisma.payment.count({ where: { schoolId: fixture.schoolId } })).toBe(1);
    const invoices = await prisma.invoice.findMany({ where: { id: { in: [ids.Invoice, other.id] } }, select: { paidAmount: true } });
    expect(invoices.reduce((sum, invoice) => sum + Number(invoice.paidAmount.toString()), 0)).toBe(40);
  });
  it("rejects missing intent keys and amounts below stored precision", async () => {
    expect((await recordManualPayment({ invoiceId: ids.Invoice, amount: 40, method: "CASH" } as never)).status).toBe("error");
    expect((await recordManualPayment(manual(0.001))).status).toBe("error");
    expect((await initiateMobileMoneyPayment({ invoiceId: ids.Invoice, provider: "MPESA", payerPhone: "+258849876543" } as never)).status).toBe("error");
    expect(await prisma.payment.count({ where: { invoiceId: ids.Invoice } })).toBe(0);
  });
  it("sums distinct manual payments without a lost balance update", async () => {
    const results = await Promise.all([recordManualPayment(manual(40)), recordManualPayment(manual(60))]);
    expect(results.every(result => result.status === "success")).toBe(true);
    expect(await paidAmount()).toBe("100");
    expect((await prisma.invoice.findUniqueOrThrow({ where: { id: ids.Invoice } })).status).toBe("PAID");
  });
  it("keeps an operator call outside the invoice lock and reuses its intent/reference", async () => {
    const original = SimulatedGateway.prototype.initiate;
    let entered!: () => void, release!: () => void;
    const ready = new Promise<void>(resolve => { entered = resolve; });
    const proceed = new Promise<void>(resolve => { release = resolve; });
    const spy = vi.spyOn(SimulatedGateway.prototype, "initiate").mockImplementation(async function (this: InstanceType<typeof SimulatedGateway>, request) { entered(); await proceed; return original.call(this, request); });
    const payload = mobile();
    try {
      const first = initiateMobileMoneyPayment(payload);
      await ready;
      // This must commit while the gateway is held, proving no transaction spans the call.
      expect((await recordManualPayment(manual(10))).status).toBe("success");
      const second = initiateMobileMoneyPayment(payload);
      release();
      expect((await first).status).toBe("success");
      expect((await second).status).toBe("success");
      expect(await prisma.payment.count({ where: { invoiceId: ids.Invoice, method: "MOBILE_MONEY" } })).toBe(1);
      const payment = await prisma.payment.findFirstOrThrow({ where: { invoiceId: ids.Invoice, method: "MOBILE_MONEY" } });
      expect(payment.amount.toString()).toBe("100");
      expect(payment.providerReference).toMatch(/^SIM-/);
      expect(await initiateMobileMoneyPayment({ ...payload, payerPhone: "+258849999999" })).toMatchObject({ status: "error", message: "finance.payments.errors.intentConflict" });
      expect(await initiateMobileMoneyPayment(mobile())).toMatchObject({ status: "error", message: "finance.payments.errors.paymentInProgress" });
    } finally { release(); spy.mockRestore(); }
  });
  it("retains an INITIATED attempt after gateway failure and resumes it with the same key", async () => {
    const payload = mobile();
    const spy = vi.spyOn(SimulatedGateway.prototype, "initiate").mockRejectedValueOnce(new MobileMoneyGatewayError("MPESA", "Synthetic outage"));
    expect((await initiateMobileMoneyPayment(payload)).status).toBe("error");
    expect((await prisma.payment.findFirstOrThrow({ where: { invoiceId: ids.Invoice } })).status).toBe("INITIATED");
    expect((await initiateMobileMoneyPayment(payload)).status).toBe("success");
    expect(await prisma.payment.count({ where: { invoiceId: ids.Invoice } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { schoolId: fixture.schoolId, action: "payment.mobileAttempt" } })).toBe(1);
    spy.mockRestore();
  });
  it("confirms a payment once under concurrent repeated operator responses", async () => {
    const payment = await createPending();
    vi.spyOn(SimulatedGateway.prototype, "getStatus").mockResolvedValue({ status: "CONFIRMED", providerReference: payment.providerReference!, confirmedAt: new Date(), failureReason: null, rawPayload: {} });
    const results = await Promise.all([confirmPayment({ paymentId: payment.id }), confirmPayment({ paymentId: payment.id })]);
    expect(results.every(result => result.status === "success")).toBe(true);
    expect(await paidAmount()).toBe("100");
    expect(await prisma.auditLog.count({ where: { schoolId: fixture.schoolId, action: "payment.confirm" } })).toBe(1);
  });
  it("sums two distinct legacy pending payments confirmed together", async () => {
    const payments = await Promise.all([40, 60].map(amount => prisma.payment.create({ data: { schoolId: fixture.schoolId, invoiceId: ids.Invoice, amount, currency: "MZN", method: "MOBILE_MONEY", provider: "MPESA", providerReference: `SIM-${randomUUID()}`, status: "PENDING", idempotencyKey: randomUUID() } })));
    vi.spyOn(SimulatedGateway.prototype, "getStatus").mockImplementation(async reference => ({ status: "CONFIRMED", providerReference: reference, confirmedAt: new Date(), failureReason: null, rawPayload: {} }));
    expect((await Promise.all(payments.map(payment => confirmPayment({ paymentId: payment.id })))).every(result => result.status === "success")).toBe(true);
    expect(await paidAmount()).toBe("100");
    expect(await prisma.auditLog.count({ where: { schoolId: fixture.schoolId, action: "payment.confirm" } })).toBe(2);
  });
  it("reverses one payment only once when requests race", async () => {
    const payload = manual(40);
    await recordManualPayment(payload);
    const payment = await prisma.payment.findFirstOrThrow({ where: { invoiceId: ids.Invoice } });
    const requests = await Promise.all([reversePayment({ paymentId: payment.id, reason: "Synthetic correction" }), reversePayment({ paymentId: payment.id, reason: "Synthetic correction" })]);
    expect(requests.filter(result => result.status === "success")).toHaveLength(1);
    expect(await prisma.auditLog.count({ where: { schoolId: fixture.schoolId, action: "payment.reverse" } })).toBe(1);
    expect((await recordManualPayment(payload)).status).toBe("success");
    expect(await paidAmount()).toBe("0");
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe("REVERSED");
    expect(await prisma.payment.count({ where: { invoiceId: ids.Invoice } })).toBe(1);
  });
  it("never revives a reversed payment when an older confirmation response arrives", async () => {
    const payment = await createPending();
    let entered!: () => void, release!: () => void;
    const ready = new Promise<void>(resolve => { entered = resolve; });
    const proceed = new Promise<void>(resolve => { release = resolve; });
    const response = { status: "CONFIRMED" as const, providerReference: payment.providerReference!, confirmedAt: new Date(), failureReason: null, rawPayload: {} };
    let calls = 0;
    const spy = vi.spyOn(SimulatedGateway.prototype, "getStatus").mockImplementation(async () => { if (++calls === 1) { entered(); await proceed; } return response; });
    try {
      const stale = confirmPayment({ paymentId: payment.id });
      await ready;
      expect((await confirmPayment({ paymentId: payment.id })).status).toBe("success");
      expect((await reversePayment({ paymentId: payment.id, reason: "Synthetic reversal" })).status).toBe("success");
      release();
      expect(await stale).toMatchObject({ status: "success", paymentStatus: "REVERSED" });
      expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe("REVERSED");
      expect(await paidAmount()).toBe("0");
      expect(await prisma.auditLog.count({ where: { schoolId: fixture.schoolId, action: "payment.confirm" } })).toBe(1);
      expect(await prisma.auditLog.count({ where: { schoolId: fixture.schoolId, action: "payment.reverse" } })).toBe(1);
    } finally { release(); spy.mockRestore(); }
  });
  it("reverses two distinct confirmed payments without losing the balance", async () => {
    await Promise.all([recordManualPayment(manual(40)), recordManualPayment(manual(60))]);
    const payments = await prisma.payment.findMany({ where: { invoiceId: ids.Invoice } });
    expect((await Promise.all(payments.map(payment => reversePayment({ paymentId: payment.id, reason: "Synthetic correction" })))).every(result => result.status === "success")).toBe(true);
    expect(await paidAmount()).toBe("0");
    await expect(prisma.payment.update({ where: { id: payments[0].id }, data: { status: "CONFIRMED" } })).rejects.toThrow(/FINANCIAL_INTEGRITY/);
    await expect(prisma.payment.update({ where: { id: payments[0].id }, data: { amount: "41" } })).rejects.toThrow(/FINANCIAL_INTEGRITY/);
  });
  it("isolates intention keys by school and operation", () => {
    const key = randomUUID();
    expect(paymentIntentKey(fixture.schoolId, "manual", key)).not.toBe(paymentIntentKey("another-school", "manual", key));
    expect(paymentIntentKey(fixture.schoolId, "manual", key)).not.toBe(paymentIntentKey(fixture.schoolId, "mobile", key));
  });
});
