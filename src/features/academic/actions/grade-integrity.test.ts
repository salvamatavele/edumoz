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
const { closeTerm } = await import("./close-term");
const { reopenTerm } = await import("./reopen-term");
const { recordGrades } = await import("./record-grades");
const { createAssessment } = await import("./create-assessment");
const termMutationModule = await import("@/features/academic/data/term-mutations");
const termResultsModule = await import("@/features/academic/data/term-results");
const { getPortalGrades } = await import("@/features/academic/data/student-grades");

describe("grade limits and serialized closing", () => {
  let fixture: Awaited<ReturnType<typeof createIntegrityFixture>>;
  let secondEnrollmentId: string;
  let foreignSchoolId: string;
  let foreignTermId: string;
  const ids: Record<string, string> = {};
  function session(role = "SCHOOL_MANAGER", restricted = false) {
    vi.mocked(auth).mockResolvedValue({ user: { id: ids.User }, schoolId: fixture.schoolId, role, isPlatformAdmin: false, memberships: [], permissionRoleId: restricted ? "reader" : null, permissions: restricted ? [{ resource: "term-closing", action: "view" }] : [] } as never);
  }
  const change = (score: number, enrollmentId?: string) => ({ assessmentId: ids.Assessment, changes: [{ enrollmentId: enrollmentId ?? ids.Enrollment, score, isAbsent: false }] });
  beforeAll(async () => {
    const school = await prisma.school.create({ data: { code: `INTEGRITY-GRADES-${randomUUID()}`, name: "Synthetic grades", province: "Maputo", district: "KaMpfumu" } });
    fixture = await createIntegrityFixture(school.id, 2026);
    for (const [model, row] of Object.entries(fixture.rows)) if (row.id) ids[model] = String(row.id);
    await prisma.teacher.update({ where: { id: ids.Teacher }, data: { userId: ids.User } });
    await prisma.student.update({ where: { id: ids.Student }, data: { userId: ids.User } });
    const second = await prisma.student.create({ data: { schoolId: school.id, code: "SECOND", firstName: "Second", lastName: "Synthetic", gender: "FEMALE", birthDate: new Date("2010-01-01") } });
    secondEnrollmentId = (await prisma.enrollment.create({ data: { schoolId: school.id, academicYearId: ids.AcademicYear, studyPathId: ids.StudyPath, classGroupId: ids.ClassGroup, studentId: second.id, number: "SECOND" } })).id;
    await prisma.teachingGroupMember.create({ data: { teachingGroupId: ids.TeachingGroup, enrollmentId: secondEnrollmentId } });
    foreignSchoolId = (await prisma.school.create({ data: { code: `INTEGRITY-GRADE-B-${randomUUID()}`, name: "Synthetic B", province: "Maputo", district: "KaMpfumu" } })).id;
    const foreignYear = await prisma.academicYear.create({ data: { schoolId: foreignSchoolId, year: 2026, label: "2026", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31") } });
    foreignTermId = (await prisma.term.create({ data: { schoolId: foreignSchoolId, academicYearId: foreignYear.id, sequence: 1, name: "Foreign", startDate: new Date("2026-01-01"), endDate: new Date("2026-04-30"), status: "CLOSED" } })).id;
  }, 30000);
  beforeEach(async () => {
    await prisma.term.update({ where: { id: ids.Term }, data: { status: "OPEN", revision: 0, closedAt: null, closedById: null } });
    await prisma.grade.deleteMany({ where: { schoolId: fixture.schoolId } });
    await prisma.grade.create({ data: { ...fixture.rows.Grade, score: "10" } as never });
    await prisma.termResult.deleteMany({ where: { schoolId: fixture.schoolId } });
    await prisma.auditLog.deleteMany({ where: { schoolId: fixture.schoolId } });
    session();
  });
  afterAll(async () => {
    if (fixture) {
      await prisma.term.updateMany({ where: { schoolId: fixture.schoolId }, data: { status: "OPEN" } });
      await removeIntegrityFixtures([fixture]);
    }
    if (foreignSchoolId) await prisma.school.delete({ where: { id: foreignSchoolId } });
  });
  it("rejects scores above maxScore without a grade or revision change", async () => {
    expect(await recordGrades(change(21))).toMatchObject({ status: "error", message: "gradeEntry.errors.outOfRange" });
    expect((await prisma.grade.findUnique({ where: { id: ids.Grade } }))?.score?.toString()).toBe("10");
    expect((await prisma.term.findUnique({ where: { id: ids.Term } }))?.revision).toBe(0);
    expect(await prisma.auditLog.count({ where: { schoolId: fixture.schoolId } })).toBe(0);
  });
  it("rejects the entire batch when one valid member's score is invalid", async () => {
    const payload = change(15); payload.changes.push({ enrollmentId: secondEnrollmentId, score: 999, isAbsent: false });
    expect(await recordGrades(payload)).toMatchObject({ status: "error" });
    expect(await prisma.grade.count({ where: { schoolId: fixture.schoolId } })).toBe(1);
    expect((await prisma.grade.findUnique({ where: { id: ids.Grade } }))?.score?.toString()).toBe("10");
  });
  it("rejects a score that would be rounded by persistence without changing the grade", async () => {
    expect(await recordGrades(change(10.001))).toMatchObject({ status: "error", message: "gradeEntry.errors.invalid" });
    expect((await prisma.grade.findUnique({ where: { id: ids.Grade } }))?.score?.toString()).toBe("10");
    expect(await prisma.auditLog.count({ where: { schoolId: fixture.schoolId } })).toBe(0);
  });
  it("does not let an inactive teacher profile record grades", async () => {
    await prisma.teacher.update({ where: { id: ids.Teacher }, data: { isActive: false } });
    try {
      expect(await recordGrades(change(15))).toMatchObject({ status: "error", message: "common.forbidden" });
      expect(await prisma.auditLog.count({ where: { schoolId: fixture.schoolId } })).toBe(0);
    } finally { await prisma.teacher.update({ where: { id: ids.Teacher }, data: { isActive: true } }); }
  });
  it("rejects negative scores before any write", async () => {
    expect(await recordGrades(change(-1))).toMatchObject({ status: "error" });
    expect((await prisma.term.findUnique({ where: { id: ids.Term } }))?.revision).toBe(0);
  });
  it("blocks grade and assessment mutations after closing, including direct database writes", async () => {
    expect(await closeTerm({ termId: ids.Term })).toMatchObject({ status: "success" });
    expect(await recordGrades(change(15))).toMatchObject({ status: "error", message: "gradeEntry.errors.termClosed" });
    expect(await createAssessment({ teachingGroupId: ids.TeachingGroup, termId: ids.Term, componentId: ids.AssessmentComponent, name: "Late", maxScore: 20, weight: 1, date: new Date("2026-03-02") })).toMatchObject({ status: "error", message: "gradeEntry.errors.termClosed" });
    await expect(prisma.grade.update({ where: { id: ids.Grade }, data: { score: 15 } })).rejects.toThrow(/GRADE_INTEGRITY/);
    await expect(prisma.grade.delete({ where: { id: ids.Grade } })).rejects.toThrow(/GRADE_INTEGRITY/);
    await expect(prisma.assessment.update({ where: { id: ids.Assessment }, data: { name: "Late" } })).rejects.toThrow(/GRADE_INTEGRITY/);
    expect(await prisma.auditLog.count({ where: { schoolId: fixture.schoolId, action: "grade.record" } })).toBe(0);
  });
  it("rejects direct out-of-range grades and reducing a maximum below recorded grades", async () => {
    await expect(prisma.grade.update({ where: { id: ids.Grade }, data: { score: 21 } })).rejects.toThrow(/GRADE_INTEGRITY/);
    await expect(prisma.assessment.update({ where: { id: ids.Assessment }, data: { maxScore: 5 } })).rejects.toThrow(/GRADE_INTEGRITY/);
  });
  it("requires a reason and effective edit permission to reopen", async () => {
    await closeTerm({ termId: ids.Term });
    expect(await reopenTerm({ termId: ids.Term, reason: "" })).toMatchObject({ status: "error" });
    session("SCHOOL_MANAGER", true);
    expect(await reopenTerm({ termId: ids.Term, reason: "Correct a recorded mark" })).toMatchObject({ status: "error", message: "common.forbidden" });
    session("TEACHER");
    expect(await reopenTerm({ termId: ids.Term, reason: "Correct a recorded mark" })).toMatchObject({ status: "error", message: "common.forbidden" });
    expect((await prisma.term.findUnique({ where: { id: ids.Term } }))?.status).toBe("CLOSED");
    expect(await prisma.auditLog.count({ where: { schoolId: fixture.schoolId, action: "term.reopen" } })).toBe(0);
  });
  it("preserves prior result snapshots and hides reopened report cards until reclosing", async () => {
    await closeTerm({ termId: ids.Term });
    expect(await reopenTerm({ termId: ids.Term, reason: "Correct a recorded mark" })).toMatchObject({ status: "success", resultCount: 2 });
    expect(await prisma.auditLog.count({ where: { schoolId: fixture.schoolId, action: "term.reopen.resultSnapshot" } })).toBe(2);
    expect((await getPortalGrades(fixture.schoolId, "STUDENT", ids.User)).selected?.rows).toEqual([]);
    expect(await recordGrades(change(15))).toMatchObject({ status: "success" });
    expect(await closeTerm({ termId: ids.Term })).toMatchObject({ status: "success" });
    const current = await prisma.termResult.findFirst({ where: { enrollmentId: ids.Enrollment, termId: ids.Term } });
    expect(current?.average?.toString()).toBe("15");
    const snapshot = await prisma.auditLog.findFirst({ where: { schoolId: fixture.schoolId, action: "term.reopen.resultSnapshot", entityId: current?.id } });
    expect(snapshot?.before).toMatchObject({ average: "10", schemeVersion: 1 });
    expect((await getPortalGrades(fixture.schoolId, "STUDENT", ids.User)).selected?.rows[0].average).toBe("15");
  });
  it("serializes two closings and records only one successful closing", async () => {
    const results = await Promise.all([closeTerm({ termId: ids.Term }), closeTerm({ termId: ids.Term })]);
    expect(results.filter(result => result.status === "success")).toHaveLength(1);
    expect(results.find(result => result.status === "error")).toMatchObject({ message: "termClosing.errors.alreadyClosed" });
    expect(await prisma.auditLog.count({ where: { schoolId: fixture.schoolId, action: "term.close" } })).toBe(1);
  });
  it("serializes a grade submission racing with closing", async () => {
    const [recorded, closed] = await Promise.all([recordGrades(change(15)), closeTerm({ termId: ids.Term })]);
    expect(closed.status).toBe("success");
    const result = await prisma.termResult.findFirst({ where: { enrollmentId: ids.Enrollment, termId: ids.Term } });
    expect(result?.average?.toString()).toBe(recorded.status === "success" ? "15" : "10");
    expect((await prisma.term.findUnique({ where: { id: ids.Term } }))?.status).toBe("CLOSED");
  });
  it("rejects a submission queued behind a closing that already holds the term lock", async () => {
    let entered!: () => void, release!: () => void;
    const ready = new Promise<void>(resolve => { entered = resolve; });
    const proceed = new Promise<void>(resolve => { release = resolve; });
    const original = termResultsModule.getTermClosingPlan;
    const spy = vi.spyOn(termResultsModule, "getTermClosingPlan").mockImplementation(async (...args) => { entered(); await proceed; return original(...args); });
    try {
      const closing = closeTerm({ termId: ids.Term });
      await ready;
      const writing = recordGrades(change(15));
      release();
      expect((await closing).status).toBe("success");
      expect(await writing).toMatchObject({ status: "error", message: "gradeEntry.errors.termClosed" });
      expect((await prisma.termResult.findFirst({ where: { enrollmentId: ids.Enrollment, termId: ids.Term } }))?.average?.toString()).toBe("10");
    } finally { release(); spy.mockRestore(); }
  });
  it("includes a submission committed while closing waits for the same term lock", async () => {
    let entered!: () => void, release!: () => void;
    const ready = new Promise<void>(resolve => { entered = resolve; });
    const proceed = new Promise<void>(resolve => { release = resolve; });
    const original = termMutationModule.requireTermState;
    let claims = 0;
    const spy = vi.spyOn(termMutationModule, "requireTermState").mockImplementation(async (...args) => {
      const first = ++claims === 1;
      await original(...args);
      if (first) { entered(); await proceed; }
    });
    try {
      const writing = recordGrades(change(15));
      await ready;
      const closing = closeTerm({ termId: ids.Term });
      release();
      expect((await writing).status).toBe("success");
      expect((await closing).status).toBe("success");
      expect((await prisma.termResult.findFirst({ where: { enrollmentId: ids.Enrollment, termId: ids.Term } }))?.average?.toString()).toBe("15");
    } finally { release(); spy.mockRestore(); }
  });
  it("refuses reopening another school's term and handles duplicate reopening", async () => {
    expect(await reopenTerm({ termId: foreignTermId, reason: "Correct a recorded mark" })).toMatchObject({ status: "error", message: "termClosing.errors.notFound" });
    await closeTerm({ termId: ids.Term });
    const results = await Promise.all([reopenTerm({ termId: ids.Term, reason: "Correct a recorded mark" }), reopenTerm({ termId: ids.Term, reason: "Correct a recorded mark" })]);
    expect(results.filter(result => result.status === "success")).toHaveLength(1);
    expect(results.find(result => result.status === "error")).toMatchObject({ message: "termClosing.errors.alreadyOpen" });
    expect(await prisma.auditLog.count({ where: { schoolId: fixture.schoolId, action: "term.reopen" } })).toBe(1);
  });
});
