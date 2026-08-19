## Context

`/alunos` (`src/app/[locale]/students/page.tsx`) renders `listEnrolledStudents(schoolId)`
(`src/features/academic/data/students.ts`), which queries `Enrollment` for the active
`AcademicYear`, not `Student`. `create-student` (Fase 3,
`src/features/academic/actions/create-student.ts`) only creates the `Student` row —
deliberately, it was scoped as the template for the Server Action pattern, not a full
matriculation flow. The result: a school can create a student who never appears anywhere
in the app until someone enrols them, and today nothing does that.

`Enrollment` (`prisma/schema.prisma`) already carries everything needed —
`studentId`, `academicYearId`, `studyPathId`, `classGroupId`, `number`, `status` — and the
unique constraints `(studentId, academicYearId)` and `(academicYearId, number)` are
already in place from Fase 2. No schema change is needed.

## Goals / Non-Goals

**Goals:**
- A `SCHOOL_MANAGER` can enrol an existing, currently-unenrolled `Student` into the active
  academic year's `ClassGroup` + `StudyPath`, and the student then appears on `/alunos`.
- Reuse the exact Server Action shape `create-student` established: `auth()` →
  `isSchoolAdministrator` → shared Zod schema → tenant-scoped transactional write +
  `AuditLog` → `fieldErrors` on constraint violations → `revalidatePath`.
- Surface which students exist but aren't enrolled — today they're invisible, which is the
  bug this change closes.

**Non-Goals:**
- Transfers between classes, withdrawals, or any `EnrollmentStatus` other than `ACTIVE` on
  creation.
- Editing or closing an existing `Enrollment`.
- Creating `ClassGroup`/`StudyPath`/`AcademicYear` — this change only *consumes* the
  active year's existing options; managing them is a separate capability.
- Bulk/CSV enrolment.

## Decisions

**Un-enrolled students get a second section on `/alunos`, not a new route.**
Alternatives considered: a dedicated `/matriculas` page. Rejected for now — it would need
its own translated pathname, nav entry, and duplicate the "which students, which school"
resolution `/alunos` already does. A second `DataTable` section
("Por matricular") on the same page keeps the one-screen mental model the spec's own
`create-student` button already established, and is the smallest change that closes the
visibility gap. Revisit as a separate page once there's also an edit/transfer flow to
justify one.

**`enroll-student.ts` takes `studentId` as an opaque field, not something the user types.**
The "Matricular" trigger is per-row on the unenrolled-students table, so `studentId` is
known before the modal opens — same reasoning `create-student` uses for `schoolId`: never
trust the client for an identifier the server already knows from context. The Zod schema
still validates it (non-empty string) since the action is a public entry point regardless
of how the UI calls it.

**`academicYearId` is resolved server-side from the active year, not submitted by the
client.** Mirrors `create-student` resolving `schoolId` from the session rather than the
form. An academic year closing between the modal opening and submitting is an edge case
the server-side resolution handles for free — the write simply targets whatever year is
active at submit time.

**`classGroupId`/`studyPathId` options come from a new query scoped to
`(schoolId, activeAcademicYearId)`.** Both models already carry `academicYearId`, so this
is a plain tenant-scoped `findMany` — no new modelling. Reuses `getTenantDb`.

**`number` is pre-filled with a suggestion, not silently auto-assigned.** Format
`${academicYear.year}/${seq}`, `seq` = count of existing enrolments for the active year
+ 1, zero-padded to 3 digits — matches the convention `prisma/seed.ts` already uses (see
`seed.ts:348`). Pre-filling instead of auto-assigning keeps `number` editable and keeps
the uniqueness error path (`fieldErrors.number` on a `P2002` collision, e.g. a race between
two staff enrolling at once) exercised, consistent with `create-student`'s `code`
duplicate-handling.

**No change to `listEnrolledStudents`.** The existing query is correct for what it does
(enrolled students for the active year); the fix is adding a path to *create* the missing
`Enrollment`, not changing what counts as "enrolled".

## Risks / Trade-offs

**[Risk] No active `AcademicYear`** → the unenrolled-students section and the enrol action
both need to handle `academicYear: null` the same way `listEnrolledStudents` already does
today (empty state, no crash) — not a new failure mode, just one more call site to cover.

**[Risk] A school with many unenrolled students makes the second `DataTable` on `/alunos`
crowded.** Accepted for this change (Non-Goals excludes a dedicated page); if it becomes a
real problem in practice, promoting it to its own route is a small follow-up, not a
rewrite, given the query and action are already isolated.

**[Trade-off] The suggested `number` can collide if two staff enrol concurrently with the
same suggestion.** Handled the same way `create-student` handles a duplicate `code`:
`P2002` → `fieldErrors.number`, user retypes. Not prevented, just surfaced correctly.
