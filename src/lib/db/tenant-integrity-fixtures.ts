import { randomUUID } from "node:crypto";
import { prisma } from "./client";
import { getTenantDb } from "./tenant";

type Data = Record<string, unknown>;
export interface IntegrityFixture { schoolId: string; rows: Record<string, Data>; }
interface Creator { create(args: { data: Data }): Promise<Data>; }
export async function createIntegrityFixture(schoolId: string, year: number): Promise<IntegrityFixture> {
  return prisma.$transaction(async (client) => {
    const rows: Record<string, Data> = {};
    const tag = randomUUID();
    async function create(model: string, data: Data): Promise<string> {
      const delegate = model[0].toLowerCase() + model.slice(1);
      const id = randomUUID();
      const input = ["StudentGuardian", "RolePermission", "MembershipPermissionRole"].includes(model) ? data : { id, ...data };
      rows[model] = input;
      await (client as unknown as Record<string, Creator>)[delegate].create({ data: input });
      return id;
    }
    const academicYearId = await create("AcademicYear", { schoolId, year, label: String(year), startDate: new Date(`${year}-01-01`), endDate: new Date(`${year}-12-15`) });
    const gradeLevelId = await create("GradeLevel", { schoolId, code: tag, name: "Synthetic level", order: 10, cycle: "SECONDARY_FIRST_CYCLE" });
    const sectionId = await create("Section", { schoolId, code: tag, name: "Synthetic section" });
    const subjectId = await create("Subject", { schoolId, code: tag, name: "Synthetic subject" });
    const roomId = await create("Room", { schoolId, code: tag, name: "Synthetic room" });
    await create("Staff", { schoolId, code: tag, name: "Synthetic employee", jobTitle: "Secretary" });
    const teacherId = await create("Teacher", { schoolId, code: tag, firstName: "Synthetic", lastName: "Teacher" });
    const studentId = await create("Student", { schoolId, code: tag, firstName: "Synthetic", lastName: "Student", birthDate: new Date("2010-01-01"), gender: "FEMALE" });
    const guardianId = await create("Guardian", { schoolId, firstName: "Synthetic", lastName: "Guardian", phone: "840000000" });
    await create("StudentGuardian", { studentId, guardianId, relationship: "MOTHER" });
    const studyPathId = await create("StudyPath", { schoolId, academicYearId, gradeLevelId, sectionId, code: tag, name: "Synthetic path" });
    await create("CurriculumSubject", { schoolId, studyPathId, subjectId, weeklyHours: 2, scope: "CORE" });
    const classGroupId = await create("ClassGroup", { schoolId, academicYearId, homeRoomId: roomId, headTeacherId: teacherId, name: tag, shift: "MORNING" });
    const enrollmentId = await create("Enrollment", { schoolId, studentId, academicYearId, studyPathId, classGroupId, number: tag });
    const teachingGroupId = await create("TeachingGroup", { schoolId, academicYearId, subjectId, teacherId, classGroupId, name: tag, scope: "CORE" });
    await create("TeachingGroupMember", { teachingGroupId, enrollmentId });
    const schemeId = await create("AssessmentScheme", { schoolId, academicYearId, gradeLevelId, subjectId, name: tag });
    const componentId = await create("AssessmentComponent", { schemeId, code: tag, name: "Test", weight: "1" });
    const termId = await create("Term", { schoolId, academicYearId, name: "Term 1", sequence: 1, startDate: new Date(`${year}-01-01`), endDate: new Date(`${year}-04-30`) });
    const assessmentId = await create("Assessment", { schoolId, teachingGroupId, termId, componentId, name: tag, date: new Date(`${year}-03-01`) });
    await create("Grade", { schoolId, assessmentId, enrollmentId, score: "10" });
    await create("TermResult", { schoolId, enrollmentId, subjectId, termId, schemeId, schemeVersion: 1, componentAverages: {} });
    const timeSlotId = await create("TimeSlot", { schoolId, academicYearId, dayOfWeek: "MONDAY", startTime: "07:00", endTime: "07:45", shift: "MORNING" });
    const scheduleEntryId = await create("ScheduleEntry", { schoolId, academicYearId, teachingGroupId, teacherId, roomId, timeSlotId });
    const sessionId = await create("AttendanceSession", { schoolId, teachingGroupId, scheduleEntryId, timeSlotId, date: new Date(`${year}-03-01`) });
    await create("AttendanceRecord", { sessionId, enrollmentId });
    const feeScheduleId = await create("FeeSchedule", { schoolId, academicYearId, gradeLevelId, studyPathId, name: tag });
    const feeItemId = await create("FeeItem", { schoolId, feeScheduleId, code: tag, name: "Fee", amount: "100", recurrence: "MONTHLY" });
    const invoiceId = await create("Invoice", { schoolId, enrollmentId, termId, reference: tag, dueDate: new Date(`${year}-03-10`), subtotal: "100", total: "100" });
    await create("InvoiceLine", { invoiceId, feeItemId, description: "Fee", unitAmount: "100", amount: "100" });
    await create("Payment", { schoolId, invoiceId, amount: "10", method: "CASH", idempotencyKey: tag });
    await create("StudentCard", { schoolId, enrollmentId, serial: tag, qrToken: tag, expiresAt: new Date(`${year}-12-31`) });
    await create("IssuedDocument", { schoolId, studentId, enrollmentId, type: "ENROLLMENT_DECLARATION", reference: tag, verificationCode: tag, payload: {} });
    const roleId = await create("PermissionRole", { schoolId, name: tag });
    const permission = await client.permission.upsert({ where: { resource_action: { resource: "students", action: "view" } }, update: {}, create: { resource: "students", action: "view" } });
    await create("RolePermission", { roleId, permissionId: permission.id });
    const user = await client.user.create({ data: { email: `integrity-${tag}@example.invalid` } });
    const membershipId = await create("Membership", { schoolId, userId: user.id, role: "SCHOOL_MANAGER", permissionRoleId: roleId, permissionsConfigured: true });
    await create("MembershipPermissionRole", { membershipId, permissionRoleId: roleId });
    await create("MembershipPermissionOverride", { membershipId, permissionId: permission.id, allowed: true });
    rows.User = { id: user.id };
    return { schoolId, rows };
  }, { timeout: 30000 });
}
export async function removeIntegrityFixtures(fixtures: IntegrityFixture[]): Promise<void> {
  const schoolIds = [...new Set(fixtures.map(fixture => fixture.schoolId))];
  const verified = await prisma.school.count({ where: { id: { in: schoolIds }, code: { startsWith: "INTEGRITY-" } } });
  if (verified !== schoolIds.length) throw Error("Fixture school identity mismatch");
  const deletionOrder = ["auditLog", "membership", "permissionRole", "issuedDocument", "studentCard", "payment", "invoiceLine", "invoice", "feeItem", "feeSchedule", "attendanceRecord", "attendanceSession", "scheduleEntry", "timeSlot", "termResult", "grade", "assessment", "term", "assessmentComponent", "assessmentScheme", "teachingGroupMember", "teachingGroup", "enrollment", "classGroup", "curriculumSubject", "studyPath", "studentGuardian", "guardian", "student", "staff", "teacher", "room", "subject", "section", "gradeLevel", "academicYear"];
  for (const schoolId of schoolIds) {
    const db = getTenantDb(schoolId) as unknown as Record<string, { deleteMany(args: object): Promise<unknown> }>;
    for (const model of deletionOrder) await db[model].deleteMany({});
  }
  await prisma.school.deleteMany({ where: { id: { in: schoolIds }, code: { startsWith: "INTEGRITY-" } } });
  await prisma.user.deleteMany({ where: { id: { in: fixtures.map(fixture => String(fixture.rows.User.id)) }, email: { endsWith: "@example.invalid" } } });
}
