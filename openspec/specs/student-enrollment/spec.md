# student-enrollment

## Purpose

Creating and viewing a student's `Enrollment` (class, study path, academic year, enrolment
number) for the active academic year, and surfacing students who exist (`Student`) but
aren't yet enrolled, so they aren't effectively hidden from the school's students screen.

## Requirements

### Requirement: Enrol an existing student into the active academic year
The system SHALL allow a school administrator to create an `Enrollment` for a `Student`
who has no `Enrollment` in the active `AcademicYear`, given a `classGroupId`, a
`studyPathId`, and an enrolment `number`.

#### Scenario: Successful enrolment
- **WHEN** a school administrator submits the enrolment form for an unenrolled student
  with a valid class, study path, and number
- **THEN** an `Enrollment` with `status: ACTIVE` is created for that student in the active
  academic year, and the student appears in the enrolled-students list without a page
  reload

#### Scenario: Student already enrolled in the active year
- **WHEN** the enrolment action is called for a `studentId` that already has an
  `Enrollment` in the active academic year
- **THEN** the write is rejected with a field error, and no second `Enrollment` is created

### Requirement: Enrolment options are scoped to the active academic year and school
The system SHALL only offer `ClassGroup` and `StudyPath` options that belong to the
requesting school and to the currently active `AcademicYear`.

#### Scenario: Options from another academic year are not offered
- **WHEN** the enrolment form loads its class and study path options
- **THEN** only `ClassGroup` and `StudyPath` rows whose `academicYearId` matches the
  active academic year are shown

#### Scenario: Options from another school are not offered
- **WHEN** the enrolment form loads its class and study path options
- **THEN** only rows belonging to the administrator's active school are shown, regardless
  of what the client requests

### Requirement: Enrolment number is suggested but editable
The system SHALL pre-fill the enrolment `number` field with a suggestion in the form
`{academicYear.year}/{seq}`, where `seq` is the count of existing enrolments in the active
academic year plus one, zero-padded to 3 digits, and SHALL allow the administrator to
change it before submitting.

#### Scenario: Suggested number reflects existing enrolments
- **WHEN** the enrolment form opens for a school with 12 existing enrolments in the active
  year
- **THEN** the suggested number is `{year}/013`

#### Scenario: Administrator overrides the suggested number
- **WHEN** the administrator replaces the suggested number with a different value before
  submitting
- **THEN** the submitted value is used, not the suggestion

### Requirement: A duplicate enrolment number is rejected per field
The system SHALL reject an enrolment whose `number` already exists within the same
academic year, and SHALL report the error against the `number` field rather than as a
generic message.

#### Scenario: Two enrolments race for the same number
- **WHEN** an enrolment is submitted with a `number` that another enrolment already holds
  in the same academic year
- **THEN** the action returns a field error on `number`, and the existing enrolment is
  unaffected

### Requirement: Only school administrators can enrol students
The system SHALL reject an enrolment attempt from a session without `SCHOOL_MANAGER` (or
platform administrator) standing in the active school, without revealing which part of
the request was invalid beyond "not permitted".

#### Scenario: Teacher attempts to enrol a student
- **WHEN** a user whose role in the active school is `TEACHER` calls the enrolment action
- **THEN** the action returns an error and no `Enrollment` is created

### Requirement: Enrolment is recorded in the audit log
The system SHALL write an `AuditLog` entry for every successful enrolment, in the same
transaction as the `Enrollment` write, recording the acting user and the school.

#### Scenario: Successful enrolment is audited
- **WHEN** an enrolment succeeds
- **THEN** an `AuditLog` row exists with `action: "enrollment.create"`, `entity:
  "Enrollment"`, the new enrolment's id as `entityId`, and the acting user's id as
  `actorUserId`

### Requirement: Students without an active-year enrolment are visible
The system SHALL show, on the students screen, which students belong to the school but
have no `Enrollment` in the active academic year, so they are not effectively hidden after
being created.

#### Scenario: Newly created, unenrolled student is visible
- **WHEN** a student is created (`create-student`) and not yet enrolled in the active year
- **THEN** that student appears in an unenrolled-students view on the students screen,
  distinct from the enrolled-students list

#### Scenario: No active academic year
- **WHEN** the school has no active `AcademicYear`
- **THEN** the unenrolled-students view and the enrol action are both disabled without
  error, consistent with how the enrolled-students list already behaves in that case
</content>
