import { prisma } from "./client";

/**
 * Modelos com coluna `schoolId`, ou seja, todos os que pertencem a uma escola.
 *
 * A lista é explícita de propósito — é legível e não depende de internals do Prisma —
 * mas NÃO é mantida à mão: `tenant.test.ts` lê o `schema.prisma`, extrai todos os modelos
 * que declaram `schoolId` e falha se divergir desta lista. Acrescentar um modelo com
 * `schoolId` sem o registar aqui parte os testes, em vez de abrir um buraco silencioso
 * entre escolas.
 *
 * Ausentes de propósito: `School` (é o próprio tenant), `User`, `Account`, `Session` e
 * `VerificationToken` (globais — um utilizador pertence a várias escolas), `Permission`
 * (catálogo fixo, global, ver `permission-catalog.ts`), e os modelos de junção que herdam
 * o âmbito do pai (`StudentGuardian`, `TeachingGroupMember`, `AssessmentComponent`,
 * `InvoiceLine`, `AttendanceRecord`, `RolePermission`).
 */
export const TENANT_SCOPED_MODELS = [
  "AcademicYear",
  "Assessment",
  "AssessmentScheme",
  "AttendanceSession",
  "AuditLog",
  "ClassGroup",
  "CurriculumSubject",
  "Enrollment",
  "FeeItem",
  "FeeSchedule",
  "Grade",
  "GradeLevel",
  "Guardian",
  "Invitation",
  "Invoice",
  "IssuedDocument",
  "Membership",
  "Payment",
  "PermissionRole",
  "Room",
  "ScheduleEntry",
  "Section",
  "Student",
  "StudentCard",
  "StudyPath",
  "Subject",
  "Teacher",
  "TeachingGroup",
  "Term",
  "TermResult",
  "TimeSlot",
] as const;

export type TenantScopedModel = (typeof TENANT_SCOPED_MODELS)[number];

const TENANT_SCOPED = new Set<string>(TENANT_SCOPED_MODELS);

/** Operações cujo `where` delimita as linhas atingidas. */
const OPERATIONS_WITH_WHERE = new Set([
  "aggregate",
  "count",
  "delete",
  "deleteMany",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "findUnique",
  "findUniqueOrThrow",
  "groupBy",
  "update",
  "updateMany",
  "upsert",
]);

/** Operações que criam linhas e portanto precisam de `schoolId` nos dados. */
const OPERATIONS_WITH_DATA = new Set([
  "create",
  "createMany",
  "createManyAndReturn",
  "upsert",
]);

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Escreve `schoolId` num objecto de dados. Se já lá vier um valor diferente, é erro —
 * silenciosamente reescrevê-lo esconderia um bug de chamada e daria a ilusão de que o
 * pedido foi cumprido.
 */
function withSchoolId(data: unknown, schoolId: string, model: string): unknown {
  if (Array.isArray(data)) {
    return data.map((item) => withSchoolId(item, schoolId, model));
  }

  if (!isRecord(data)) return data;

  const declared = data["schoolId"];

  if (typeof declared === "string" && declared !== schoolId) {
    throw new Error(
      `Tentativa de escrever ${model} com schoolId "${declared}" no contexto da escola "${schoolId}".`,
    );
  }

  return { ...data, schoolId };
}

/**
 * Cliente Prisma restrito a uma escola.
 *
 * LEITURAS: `schoolId` entra no `where` automaticamente e sem custo de tipos, porque o
 * `where` é opcional. Não há forma de uma leitura escapar ao filtro.
 *
 * ESCRITAS: o TypeScript continua a exigir `schoolId` nos dados — a extensão actua em
 * runtime e o sistema de tipos não a vê. Isso é deliberado e é a melhor das duas
 * garantias, não um compromisso: esquecer `schoolId` numa escrita passa a ser erro de
 * compilação, e escrever o `schoolId` ERRADO passa a ser erro em runtime, porque a
 * extensão compara o valor recebido com o da sessão e recusa se divergirem.
 *
 * O código de aplicação deve usar sempre esta função e nunca importar `prisma` de
 * `./client` — a regra `@typescript-eslint/no-restricted-imports` impõe-o.
 *
 * LIMITE CONHECIDO: `$queryRaw` e `$executeRaw` não passam por esta extensão, porque não
 * são operações de modelo. SQL cru contra tabelas com `schoolId` tem de filtrar à mão.
 */
export function getTenantDb(schoolId: string) {
  if (!schoolId) {
    throw new Error("getTenantDb exige um schoolId não vazio.");
  }

  return prisma.$extends({
    name: "tenant-isolation",
    query: {
      $allModels: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        $allOperations({ model, operation, args, query }: any) {
          if (!model || !TENANT_SCOPED.has(model)) {
            return query(args);
          }

          const scoped: UnknownRecord = isRecord(args) ? { ...args } : {};

          if (OPERATIONS_WITH_WHERE.has(operation)) {
            const where = isRecord(scoped["where"]) ? scoped["where"] : {};
            scoped["where"] = { ...where, schoolId };
          }

          if (OPERATIONS_WITH_DATA.has(operation)) {
            // `upsert` traz `create`; as restantes trazem `data`.
            const dataKey = operation === "upsert" ? "create" : "data";

            if (dataKey in scoped) {
              scoped[dataKey] = withSchoolId(scoped[dataKey], schoolId, model);
            }
          }

          return query(scoped);
        },
      },
    },
  });
}

export type TenantDb = ReturnType<typeof getTenantDb>;
