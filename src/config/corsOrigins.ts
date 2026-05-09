/**
 * Origins permitidas para CORS (HTTP e Socket.IO).
 * `localhost` e `127.0.0.1` são origens diferentes no browser — com `credentials: true`
 * o access control falha se apenas uma estiver em FRONTEND_URL.
 */
const LOCAL_DEV_FRONTEND_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000"
];

function isLocalUrl(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(url);
}

export function getFrontendCorsOrigins(): string[] {
  const fromEnv = process.env.FRONTEND_URL?.trim();
  const set = new Set<string>();
  const isProduction = process.env.NODE_ENV === "production";

  if (fromEnv) {
    set.add(fromEnv);
  }

  if (isProduction) {
    return Array.from(set);
  }

  // Ambiente não produção: garantir dev local estável
  if (!fromEnv || isLocalUrl(fromEnv)) {
    LOCAL_DEV_FRONTEND_ORIGINS.forEach(o => set.add(o));
  }

  return Array.from(set);
}
