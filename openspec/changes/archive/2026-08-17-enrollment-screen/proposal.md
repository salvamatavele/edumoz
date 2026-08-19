## Why

`/alunos` lists students via their `Enrollment` for the active academic year
(`listEnrolledStudents`), not via `Student` directly. `create-student` (Fase 3) creates
the `Student` record but nothing enrols them — so a newly created student never appears in
the list the school is looking at, and there is currently no screen that closes that gap.
A `Student` needs an `Enrollment` (turma, percurso, número) before they show up anywhere
in the app.

## What Changes

- New "Matricular aluno" action on `/alunos`, for students who exist (`Student`) but have
  no `Enrollment` in the active academic year.
- A Server Action that creates the `Enrollment` — tenant-scoped write, `AuditLog` entry,
  following the same pattern `create-student` established (Fase 3).
- The enrolment form offers only the active academic year's `ClassGroup` and `StudyPath`
  options for the school; the enrolment `number` is suggested (`${ano}/${sequência}`,
  matching the convention already used by `prisma/seed.ts`) but editable, and must be
  unique within the academic year.
- `/alunos` gains a way to see students without an active enrolment for the year (today
  they're invisible — created but nowhere to act on).

## Capabilities

### New Capabilities
- `student-enrollment`: creating and viewing a student's `Enrollment` (class, study path,
  academic year, enrolment number) for the active academic year, and surfacing students
  who exist but aren't yet enrolled.

### Modified Capabilities
(none — no existing capability specs in `openspec/specs/` yet; `create-student` predates
this OpenSpec workflow and isn't captured as a spec)

## Impact

- `src/features/academic/actions/` — new `enroll-student.ts` Server Action.
- `src/features/academic/domain/` — new `enrollment-schema.ts` (Zod, shared client/server,
  same pattern as `student-schema.ts`).
- `src/features/academic/data/` — new query for un-enrolled students, and queries for the
  active year's `ClassGroup`/`StudyPath` options.
- `src/features/academic/ui/` — new enrolment UI (button + `FormModal`, or a dedicated
  view depending on how many un-enrolled students there typically are — see design.md).
- `src/app/[locale]/students/page.tsx` — surfaces the "needs enrolment" state.
- `messages/{pt,en}.json` — new translation keys, checked by the existing parity test.
- No schema changes: `Enrollment`, `ClassGroup`, `StudyPath`, `AcademicYear` already exist
  (Fase 2).
