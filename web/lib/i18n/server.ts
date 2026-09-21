import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, pickLocale, type Locale } from "@/lib/i18n/locales";

/**
 * Resolves the active locale for the request. Runs in the async root layout so
 * the server-rendered HTML and the first client render always agree.
 */
export async function resolveLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  return pickLocale(headerStore.get("accept-language"), cookieStore.get(LOCALE_COOKIE)?.value);
}
