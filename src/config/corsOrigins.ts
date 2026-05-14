/**
 * Origins permitidas para CORS (HTTP e Socket.IO).
 * `localhost` e `127.0.0.1` são origens diferentes no browser — com `credentials: true`
 * o access control falha se apenas uma estiver em FRONTEND_URL.
 *
 * Produção: defina FRONTEND_URL com a URL pública do painel (ex.: https://crmloop.tech).
 * Várias origens: separe por vírgula (ex.: https://crmloop.tech,https://www.crmloop.tech).
 * Barras finais são normalizadas — o browser envia Origin sem "/" no final.
 */
const LOCAL_DEV_FRONTEND_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000"
];

function isLocalUrl(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(url);
}

/** Normaliza para bater com o header Origin do browser (sem barra final). */
function normalizeOrigin(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  return t.replace(/\/+$/, "");
}

function addOriginsFromEnvValue(set: Set<string>, value: string | undefined): void {
  if (!value?.trim()) return;
  for (const part of value.split(",")) {
    const n = normalizeOrigin(part);
    if (n) set.add(n);
  }
}

export function getFrontendCorsOrigins(): string[] {
  const fromEnv = process.env.FRONTEND_URL?.trim();
  const set = new Set<string>();
  const isProduction = process.env.NODE_ENV === "production";

  addOriginsFromEnvValue(set, fromEnv);

  if (isProduction) {
    return Array.from(set);
  }

  // Ambiente não produção: garantir dev local estável
  const firstConfigured = fromEnv ? normalizeOrigin(fromEnv.split(",")[0] || "") : "";
  if (!firstConfigured || isLocalUrl(firstConfigured)) {
    LOCAL_DEV_FRONTEND_ORIGINS.forEach(o => set.add(o));
  }

  return Array.from(set);
}
