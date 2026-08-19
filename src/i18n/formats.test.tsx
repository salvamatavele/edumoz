import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useLocaleFormatter } from "@/i18n/use-locale-formatter";
import { renderWithIntl } from "@/test/intl";

/**
 * Regressão: `<html lang>` declara `en-GB`, mas se o formatador usar o código curto "en" o
 * `Intl` trata-o como "en-US" e inverte dia e mês. 4 de Maio de 2010 tem de sair
 * "04/05/2010" nas duas línguas — nunca "05/04/2010".
 *
 * Usa `useLocaleFormatter`, não o `useFormatter()` do next-intl: este último usa o mesmo
 * `locale` para formatar e para o encaminhamento, e não há como lhe dar só o tag completo
 * (`pt-MZ`/`en-GB`) sem também partir `Link`/`usePathname` — ver `use-locale-formatter.ts`.
 */
function BirthDate() {
  const format = useLocaleFormatter();
  return <span>{format.dateTime(new Date("2010-05-04T00:00:00.000Z"), "short")}</span>;
}

describe("formato de data curto", () => {
  it("usa a ordem dia/mês/ano em português", () => {
    renderWithIntl(<BirthDate />, "pt");
    expect(screen.getByText("04/05/2010")).toBeInTheDocument();
  });

  it("usa a mesma ordem dia/mês/ano em inglês (britânico, não americano)", () => {
    renderWithIntl(<BirthDate />, "en");
    expect(screen.getByText("04/05/2010")).toBeInTheDocument();
  });
});
