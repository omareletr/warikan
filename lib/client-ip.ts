// Netlify sets x-nf-client-connection-ip itself, so callers can't fake it. X-Forwarded-For can be
// written by the caller, so it's only trusted in local dev (where Netlify's header doesn't exist).
export function clientIp(headers: Headers): string {
  const netlify = headers.get("x-nf-client-connection-ip");
  if (netlify) return netlify;
  if (process.env.NODE_ENV !== "production") {
    return headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  }
  return "unknown"; // shortcut: off Netlify every caller shares one bucket; derive the IP from that host's trusted proxy if the app moves
}
