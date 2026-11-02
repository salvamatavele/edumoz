import { en, pt } from "zod/v4/locales";

/** Per-parse messages avoid changing global Zod state between concurrent locales. */
export function validationMessages(locale: string) {
  return (locale === "pt" ? pt() : en()).localeError;
}
