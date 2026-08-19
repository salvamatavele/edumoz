## 1. Domain & data

- [x] 1.1 `src/features/academic/domain/enrollment-schema.ts` — Zod `enrollStudentSchema`
      (`studentId`, `classGroupId`, `studyPathId`, `number`), shared client/server, same
      pattern as `student-schema.ts`.
- [x] 1.2 `src/features/academic/data/students.ts` (or a new file in the same folder) —
      `listUnenrolledStudents(schoolId)`: students in the school with no `Enrollment` in
      the active academic year; returns `{ rows: [], academicYear: null }` when there is
      no active year, matching `listEnrolledStudents`.
- [x] 1.3 Same data layer — `listEnrollmentOptions(schoolId)`: active year's `ClassGroup`
      and `StudyPath` rows for the school, plus the active `academicYearId`.
- [x] 1.4 Suggested-number helper: count of existing enrolments in the active year + 1,
      zero-padded to 3 digits, formatted `${academicYear.year}/${seq}` (mirrors
      `prisma/seed.ts:348`). Keep it a pure function so it's unit-testable without a DB.

## 2. Server Action

- [x] 2.1 `src/features/academic/actions/enroll-student.ts`, `"use server"` — `auth()`,
      build `SessionContext`, reject via `isSchoolAdministrator` (reuse, don't
      reimplement — see `create-student.ts`).
- [x] 2.2 `enrollStudentSchema.safeParse`, map Zod issues to `fieldErrors` the same way
      `create-student.ts` does.
- [x] 2.3 `getTenantDb(schoolId).$transaction`: create `Enrollment`
      (`status: "ACTIVE"`, `academicYearId` resolved server-side, never from the client)
      + `AuditLog` (`action: "enrollment.create"`, `entity: "Enrollment"`) in one
      transaction.
- [x] 2.4 Catch `Prisma.PrismaClientKnownRequestError` `P2002`: map the
      `(academicYearId, number)` collision to `fieldErrors.number`, and the
      `(studentId, academicYearId)` collision (student already enrolled) to a field error
      too — decide which field carries it (likely a general `message`, since it's not
      something the form's own fields caused).
- [x] 2.5 `revalidatePath` for both locales' `/students` path, same loop as
      `create-student.ts`.

## 3. UI

- [x] 3.1 `src/features/academic/ui/enroll-student-button.tsx` — per-row trigger +
      `FormModal`: `classGroupId`/`studyPathId` as `select` fields sourced from
      `listEnrollmentOptions`, `number` pre-filled with the suggestion and editable,
      `studentId` passed in, not user-entered.
- [x] 3.2 `src/features/academic/ui/unenrolled-students-table.tsx` (or extend
      `students-table.tsx` with a variant) — second `DataTable` on `/alunos`, listing
      `listUnenrolledStudents` rows, with the "Matricular" action per row.
- [x] 3.3 `src/app/[locale]/students/page.tsx` — fetch unenrolled students alongside
      enrolled ones, render the new section gated by `isSchoolAdministrator` (same
      guard already used for `CreateStudentButton`), hidden entirely when the list is
      empty or there's no active academic year.

## 4. Internacionalização

- [x] 4.1 Add pt/en keys for the enrolment form (title, field labels, duplicate-number
      error, already-enrolled error, forbidden) and the "por matricular" section
      (heading, empty state) to `messages/pt.json` and `messages/en.json`.
- [x] 4.2 Run `src/i18n/messages.test.ts` to confirm parity.

## 5. Tests

- [x] 5.1 Unit test the suggested-number helper (task 1.4) — count-based suggestion,
      zero-padding, format.
- [x] 5.2 `enroll-student.test.ts` (mirrors `create-student.test.ts`'s mocking of
      `next-intl/server`, `@/i18n/navigation`, `next/cache`, `@/lib/auth/config`):
      forbidden without `SCHOOL_MANAGER`, invalid input → `fieldErrors`, duplicate
      `number` → `fieldErrors.number`, student already enrolled → rejected, success →
      `Enrollment` + `AuditLog` written in one transaction.
- [x] 5.3 Component test for the unenrolled-students section / enrol modal, following the
      `renderWithIntl` + mocked-session conventions from `school-switcher.test.tsx`.

## 6. Verification

- [x] 6.1 `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test`, `pnpm build` all green.
- [x] 6.2 Manual check in the dev app: create a student, confirm it shows under "por
      matricular", enrol it, confirm it moves to the enrolled list without a page reload,
      and that the previously-known gap (documented in `CHANGELOG.md` Fase 3, "Problema
      conhecido") is closed.
- [x] 6.3 Update `CHANGELOG.md` with a "Fase 4" (or equivalent) entry documenting what was
      built and the key decisions, following the existing house style.
