"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import type { FormActionResult } from "@/components/form/field-schema";
import {
  createGradeLevelSchema,
  type CreateGradeLevelInput,
} from "@/features/academic/domain/academic-structure-schema";
import {
  hasPermission,
  toSessionContext,
} from "@/features/identity/domain/access";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { auth } from "@/lib/auth/config";
import { Prisma, UNIQUE_CONSTRAINT_VIOLATION } from "@/lib/db/errors";
import { getTenantDb } from "@/lib/db/tenant";

/** Cria um nível/classe. Sem dependências de outras entidades — molde de `create-student.ts`. */
export async function createGradeLevel(
  values: CreateGradeLevelInput,
): Promise<FormActionResult<CreateGradeLevelInput>> {
  const t = await getTranslations();

  const session = await auth();

  if (!session?.schoolId) {
    return { status: "error", message: t("common.forbidden") };
  }

  const context = toSessionContext(session);

  if (!hasPermission(context, "academic-structure", "create")) {
    return { status: "error", message: t("common.forbidden") };
  }

  const parsed = createGradeLevelSchema.safeParse(values);

  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof CreateGradeLevelInput, string>> = {};

    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0]) as keyof CreateGradeLevelInput;
      fieldErrors[field] = t(`academic.gradeLevels.errors.${field}`);
    }

    return { status: "error", fieldErrors };
  }

  const { schoolId } = session;
  const db = getTenantDb(schoolId);

  try {
    await db.$transaction(async (tx) => {
      const created = await tx.gradeLevel.create({ data: { schoolId, ...parsed.data } });

      await tx.auditLog.create({
        data: {
          schoolId,
          actorUserId: session.user.id,
          action: "gradeLevel.create",
          entity: "GradeLevel",
          entityId: created.id,
          after: JSON.parse(JSON.stringify(created)),
        },
      });
    });

    for (const locale of routing.locales) {
      revalidatePath(getPathname({ locale, href: "/academic" }));
    }

    return { status: "success" };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === UNIQUE_CONSTRAINT_VIOLATION
    ) {
      return {
        status: "error",
        fieldErrors: { code: t("academic.gradeLevels.errors.duplicateCode") },
      };
    }

    throw error;
  }
}
