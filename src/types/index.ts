/**
 * Ponto único de entrada para os tipos do domínio.
 *
 * A camada de aplicação importa daqui e nunca de `@/generated/prisma` — a regra
 * `@typescript-eslint/no-restricted-imports` impõe-o para o cliente em runtime.
 *
 * Distinção importante: os tipos aqui reexportados são a FORMA DAS LINHAS na base de
 * dados. Os tipos com invariantes — os que carregam regras, como o esquema de avaliação
 * ou um conflito de horário — vivem em `src/features/<módulo>/domain/` e não são gerados.
 */

// ---------------------------------------------------------------------------
// Identidade
// ---------------------------------------------------------------------------
export type {
  Account,
  Guardian,
  Invitation,
  Membership,
  School,
  Session,
  Student,
  StudentGuardian,
  Teacher,
  User,
  VerificationToken,
} from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// Académico
// ---------------------------------------------------------------------------
export type {
  AcademicYear,
  Assessment,
  AssessmentComponent,
  AssessmentScheme,
  AttendanceRecord,
  AttendanceSession,
  ClassGroup,
  CurriculumSubject,
  Enrollment,
  Grade,
  GradeLevel,
  Room,
  ScheduleEntry,
  Section,
  StudyPath,
  Subject,
  TeachingGroup,
  TeachingGroupMember,
  Term,
  TermResult,
  TimeSlot,
} from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// Finanças e identidade digital
// ---------------------------------------------------------------------------
export type {
  AuditLog,
  FeeItem,
  FeeSchedule,
  Invoice,
  InvoiceLine,
  IssuedDocument,
  Payment,
  StudentCard,
} from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export {
  AssessmentRegime,
  AttendanceSessionStatus,
  AttendanceStatus,
  CardStatus,
  ComponentType,
  DayOfWeek,
  DocumentType,
  EnrollmentStatus,
  FeeRecurrence,
  Gender,
  GuardianRelationship,
  InvitationStatus,
  InvoiceStatus,
  MembershipStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  Role,
  RoomKind,
  RoundingMode,
  SchoolCycle,
  Shift,
  SubjectScope,
  TermStatus,
} from "@/generated/prisma/enums";

// ---------------------------------------------------------------------------
// Vocabulário do pedido original
// ---------------------------------------------------------------------------
import type { ClassGroup as ClassGroupModel } from "@/generated/prisma/client";

/**
 * Alias de `ClassGroup` — a TURMA, o agrupamento administrativo de alunos.
 *
 * O modelo chama-se `ClassGroup` e não `Classroom` porque o espaço físico é uma entidade
 * separada (`Room`), e o motor de horários precisa de falar das duas na mesma linha de
 * código. Ver docs/specs/domain-foundation.md §4.1.
 */
export type Classroom = ClassGroupModel;
