import {
  BadgeCheck,
  CalendarCheck,
  ClipboardList,
  GraduationCap,
  Receipt,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
/**
 * Os valores dos indicadores e os nomes dos alunos são amostra estática — a página é uma
 * montra, não um painel ligado a dados. As chaves apontam para o ficheiro de mensagens;
 * os números ficam aqui porque não se traduzem.
 */
const INDICATORS = [
  { key: "enrolled", value: "1 284" },
  { key: "attendance", value: "94%" },
  { key: "fees", value: "78%" },
  { key: "reports", value: "9/12" },
] as const;

const STEPS = [
  { key: "register", icon: Users },
  { key: "daily", icon: ClipboardList },
  { key: "follow", icon: Receipt },
] as const;

const ASSURANCES = ["slowConnections", "consent", "language"] as const;

const PREVIEW_ROLL = [
  { name: "Amélia Cossa", status: "present", tone: "success" },
  { name: "Bernardo Nhantumbo", status: "late", tone: "warning" },
  { name: "Custódia Machava", status: "present", tone: "success" },
  { name: "Délcio Mabjaia", status: "absent", tone: "destructive" },
] as const;

export function HomeSections() {
  const t = useTranslations("home");
  const tCommon = useTranslations("common");

  return (
    <>
      {/* 1 — Hero with live product preview */}
      <section className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-24">
        <div className="flex flex-col gap-6">
          <Badge tone="brand">
            <GraduationCap aria-hidden="true" />
            {t("badge")}
          </Badge>

          <h1 className="text-4xl font-semibold lg:text-5xl">{t("heading")}</h1>

          <p className="max-w-xl text-lg text-muted-foreground">{t("lead")}</p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg">{tCommon("requestDemo")}</Button>
            <Button size="lg" variant="secondary">
              {t("exploreDesignSystem")}
            </Button>
          </div>

          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {ASSURANCES.map((key) => (
              <li key={key} className="flex items-center gap-2">
                <BadgeCheck
                  aria-hidden="true"
                  className="size-4 shrink-0 text-primary"
                />
                {t(`assurances.${key}`)}
              </li>
            ))}
          </ul>
        </div>

        {/* Static preview of the product surface — no business logic yet. */}
        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">{t("preview.classTitle")}</CardTitle>
                <CardDescription>{t("preview.classSubtitle")}</CardDescription>
              </div>
              <Badge tone="success">
                <CalendarCheck aria-hidden="true" />
                {t("preview.done")}
              </Badge>
            </div>
          </CardHeader>

          <ul className="divide-y divide-border">
            {PREVIEW_ROLL.map((student) => (
              <li
                key={student.name}
                className="flex items-center justify-between gap-4 py-3"
              >
                <span className="text-sm font-medium">{student.name}</span>
                <Badge tone={student.tone}>
                  {t(`preview.status.${student.status}`)}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      {/* 2 — Key indicators */}
      <section
        aria-labelledby="indicadores"
        className="border-y border-border bg-surface"
      >
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
          <h2 id="indicadores" className="text-2xl">
            {t("indicators.heading")}
          </h2>
          <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {INDICATORS.map((indicator) => (
              <div
                key={indicator.key}
                className="rounded-lg border border-border bg-background p-5"
              >
                <dt className="text-sm text-muted-foreground">
                  {t(`indicators.${indicator.key}.label`)}
                </dt>
                <dd
                  data-numeric
                  className="mt-2 font-heading text-3xl font-semibold text-primary"
                >
                  {indicator.value}
                </dd>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t(`indicators.${indicator.key}.detail`)}
                </p>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* 3 — How it works */}
      <section
        aria-labelledby="como-funciona"
        className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6"
      >
        <h2 id="como-funciona" className="text-2xl">
          {t("steps.heading")}
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <Card key={step.key}>
              <CardHeader>
                <span className="inline-flex size-11 items-center justify-center rounded-md bg-muted text-primary">
                  <step.icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
                </span>
                <CardTitle className="mt-3 text-lg">
                  <span data-numeric className="mr-2 text-muted-foreground">
                    {index + 1}.
                  </span>
                  {t(`steps.${step.key}.title`)}
                </CardTitle>
                <CardDescription className="text-base">
                  {t(`steps.${step.key}.description`)}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* 4 — Closing call to action */}
      <section className="border-t border-border bg-surface">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl">{t("closing.heading")}</h2>
            <p className="mt-2 max-w-xl text-muted-foreground">{t("closing.body")}</p>
          </div>
          <Button size="lg">{tCommon("requestDemo")}</Button>
        </div>
      </section>
    </>
  );
}
