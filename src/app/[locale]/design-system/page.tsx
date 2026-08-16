import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/design-system">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "designSystem" });

  return {
    title: t("title"),
    description:
      "Tokens, tipografia e componentes base do EduMoz, renderizados a partir do código de produção.",
  };
}

const COLOR_TOKENS = [
  { name: "brand", className: "bg-brand", note: "Só decorativo" },
  { name: "primary", className: "bg-primary", note: "Superfícies interactivas" },
  { name: "accent", className: "bg-accent", note: "CTA primário" },
  { name: "background", className: "bg-background", note: "Fundo da página" },
  { name: "surface", className: "bg-surface", note: "Cartões e painéis" },
  { name: "muted", className: "bg-muted", note: "Fundos secundários" },
  { name: "border-strong", className: "bg-border-strong", note: "Contornos" },
  { name: "success", className: "bg-success", note: "Estado positivo" },
  { name: "warning", className: "bg-warning", note: "Atenção" },
  { name: "destructive", className: "bg-destructive", note: "Erro e destruição" },
] as const;

const TYPE_SCALE = [
  { className: "text-5xl", label: "Display · 48px" },
  { className: "text-4xl", label: "Título 1 · 36px" },
  { className: "text-3xl", label: "Título 2 · 30px" },
  { className: "text-2xl", label: "Título 3 · 24px" },
  { className: "text-xl", label: "Título 4 · 20px" },
  { className: "text-base", label: "Corpo · 16px" },
  { className: "text-sm", label: "Auxiliar · 14px" },
] as const;

const SPACING = [
  ["xs", "0.25rem"],
  ["sm", "0.5rem"],
  ["md", "1rem"],
  ["lg", "1.5rem"],
  ["xl", "2rem"],
  ["2xl", "3rem"],
  ["3xl", "4rem"],
] as const;

const SHADOWS = ["shadow-sm", "shadow-md", "shadow-lg", "shadow-xl"] as const;

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="border-t border-border py-12 first:border-t-0">
      <h2 id={id} className="text-2xl">
        {title}
      </h2>
      <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>
      <div className="mt-8">{children}</div>
    </section>
  );
}

/**
 * O CORPO desta página fica deliberadamente em português nas duas línguas.
 *
 * É documentação para quem desenvolve — nomes de tokens, notas de contraste, variantes de
 * componente —, não interface para a escola. Traduzir os nomes dos tokens tornaria a
 * página menos útil, porque o token chama-se `border-strong` no código e é assim que tem
 * de aparecer aqui. Só o título entra no ficheiro de mensagens, por causa do `<title>`.
 */
export default async function DesignSystemPage({
  params,
}: PageProps<"/[locale]/design-system">) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <header className="flex flex-col gap-4">
        <Badge tone="brand">Soft UI Evolution</Badge>
        <h1 className="text-4xl font-semibold">Sistema de design do EduMoz</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Esta página é renderizada com os mesmos componentes da aplicação. Se
          algo aqui muda, mudou no produto.
        </p>
      </header>

      <Section
        id="cores"
        title="Cores"
        description="Tokens semânticos. Os componentes nunca usam hexadecimais directamente — só estes nomes."
      >
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {COLOR_TOKENS.map((token) => (
            <li key={token.name} className="flex flex-col gap-2">
              <div
                className={`h-16 rounded-md border border-border ${token.className}`}
              />
              <div>
                <p className="text-sm font-medium">{token.name}</p>
                <p className="text-xs text-muted-foreground">{token.note}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        id="tipografia"
        title="Tipografia"
        description="Lexend nos títulos pela legibilidade; Source Sans 3 no corpo e em tabelas, com algarismos tabulares."
      >
        <div className="flex flex-col gap-4">
          {TYPE_SCALE.map((item) => (
            <div key={item.label} className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">{item.label}</span>
              <span className={`${item.className} font-heading font-semibold`}>
                Boletim de avaliação
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="espacamento"
        title="Espaçamento e elevação"
        description="Ritmo de 4px e quatro níveis de sombra usados de forma consistente."
      >
        <div className="grid gap-10 md:grid-cols-2">
          <ul className="flex flex-col gap-3">
            {SPACING.map(([name, value]) => (
              <li key={name} className="flex items-center gap-4">
                <span className="w-12 text-sm text-muted-foreground">{name}</span>
                <span className="h-4 rounded-sm bg-brand" style={{ width: value }} />
                <span data-numeric className="text-sm text-muted-foreground">
                  {value}
                </span>
              </li>
            ))}
          </ul>

          <ul className="grid grid-cols-2 gap-4">
            {SHADOWS.map((shadow) => (
              <li
                key={shadow}
                className={`flex h-24 items-center justify-center rounded-lg border border-border bg-surface text-sm ${shadow}`}
              >
                {shadow}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section
        id="botoes"
        title="Botões"
        description="Uma acção primária por ecrã. Altura mínima de 44px em todos os tamanhos."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primário</Button>
          <Button variant="solid">Sólido</Button>
          <Button variant="secondary">Secundário</Button>
          <Button variant="ghost">Discreto</Button>
          <Button variant="destructive">Eliminar</Button>
          <Button disabled>Desactivado</Button>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button size="sm">Pequeno</Button>
          <Button size="md">Médio</Button>
          <Button size="lg">Grande</Button>
        </div>
      </Section>

      <Section
        id="estados"
        title="Estados"
        description="A cor nunca carrega o significado sozinha: cada estado traz texto e, quando aplicável, ícone."
      >
        <div className="flex flex-wrap gap-3">
          <Badge>Rascunho</Badge>
          <Badge tone="brand">Matriculado</Badge>
          <Badge tone="success">Propina liquidada</Badge>
          <Badge tone="warning">Pagamento pendente</Badge>
          <Badge tone="destructive">Falta injustificada</Badge>
        </div>
      </Section>

      <Section
        id="formularios"
        title="Formulários"
        description="Rótulo sempre visível, texto de apoio persistente e erro junto ao campo."
      >
        <div className="grid max-w-3xl gap-6 md:grid-cols-2">
          <Input
            label="Nome completo do aluno"
            placeholder="Ex.: Amélia Cossa"
            helperText="Como consta no assento de nascimento."
            required
          />
          <Input
            label="Número de matrícula"
            defaultValue="2026-B-014"
            error="Já existe um aluno com este número nesta escola."
          />
        </div>
      </Section>

      <Section
        id="cartoes"
        title="Cartões"
        description="Contentor base para conteúdo agrupado. Sombra média, borda subtil, cantos de 12px."
      >
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Pauta do 2.º trimestre</CardTitle>
              <CardDescription>8.ª B · 34 alunos</CardDescription>
            </CardHeader>
            <CardContent>
              Faltam lançar as notas de Educação Visual antes do fecho da pauta.
            </CardContent>
            <CardFooter>
              <Button size="sm">Abrir pauta</Button>
              <Button size="sm" variant="ghost">
                Ver histórico
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Propinas de Agosto</CardTitle>
              <CardDescription>Trimestre em curso</CardDescription>
            </CardHeader>
            <CardContent>
              <p data-numeric className="font-heading text-3xl font-semibold text-primary">
                78%
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                282 de 361 encarregados já liquidaram.
              </p>
            </CardContent>
          </Card>
        </div>
      </Section>
    </div>
  );
}
