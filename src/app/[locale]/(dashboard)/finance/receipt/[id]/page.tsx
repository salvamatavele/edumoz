import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { getReceipt } from "@/features/finance/data/payments";
import { ReceiptPrintButton } from "@/features/finance/ui/receipt-print-button";
import { isSchoolAdministrator, type SessionContext } from "@/features/identity/domain/access";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth/config";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/finance/receipt/[id]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "finance" });

  return { title: t("receipt.title") };
}

/** Recibo imprimível de um pagamento. Gestor apenas, tal como o resto de `/financas`. */
export default async function ReceiptPage({ params }: PageProps<"/[locale]/finance/receipt/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("finance");
  const tCommon = await getTranslations("common");

  const session = await auth();

  if (!session?.schoolId) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
        <p className="rounded-lg border border-border bg-surface p-6 text-muted-foreground">{tCommon("forbidden")}</p>
      </div>
    );
  }

  const context: SessionContext = {
    userId: session.user.id,
    isPlatformAdmin: session.isPlatformAdmin,
    schoolId: session.schoolId,
    role: session.role,
    memberships: session.memberships,
  };

  if (!isSchoolAdministrator(context)) {
    redirect({ href: "/students", locale });
  }

  const receipt = await getReceipt(session.schoolId, id);

  if (!receipt) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
        <p className="rounded-lg border border-border bg-surface p-6 text-muted-foreground">{t("receipt.notFound")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-semibold">{t("receipt.title")}</h1>
        <ReceiptPrintButton />
      </div>

      {receipt.status === "REVERSED" ? (
        <p role="alert" className="rounded-md border border-destructive bg-destructive-surface p-3 text-sm font-medium text-destructive">
          {t("receipt.reversedNotice")}
        </p>
      ) : null}

      <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-6">
        <div className="flex flex-col gap-1 border-b border-border pb-4">
          <p className="text-lg font-semibold">{receipt.schoolName}</p>
          <p className="text-sm text-muted-foreground">{t("receipt.verificationLabel")}: {receipt.verificationCode}</p>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <dt className="text-muted-foreground">{t("receipt.studentLabel")}</dt>
          <dd className="font-medium text-foreground">{receipt.studentName}</dd>

          <dt className="text-muted-foreground">{t("receipt.invoiceLabel")}</dt>
          <dd className="font-medium text-foreground">{receipt.invoiceReference}</dd>

          <dt className="text-muted-foreground">{t("receipt.amountLabel")}</dt>
          <dd className="font-medium text-foreground">{receipt.amount}</dd>

          <dt className="text-muted-foreground">{t("receipt.methodLabel")}</dt>
          <dd className="font-medium text-foreground">
            {t(`payments.methods.${receipt.method}`)}
            {receipt.provider ? ` — ${t(`payments.providers.${receipt.provider}`)}` : ""}
          </dd>

          <dt className="text-muted-foreground">{t("receipt.dateLabel")}</dt>
          <dd className="font-medium text-foreground">
            {receipt.confirmedAt ? new Date(receipt.confirmedAt).toLocaleString("pt-MZ") : "—"}
          </dd>

          <dt className="text-muted-foreground">{t("receipt.statusLabel")}</dt>
          <dd className="font-medium text-foreground">{t(`payments.status.${receipt.status}`)}</dd>
        </dl>
      </div>
    </div>
  );
}
