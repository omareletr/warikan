// Netlify sets x-nf-client-connection-ip itself, so callers can't fake it. The first
// X-Forwarded-For entry can be written by the caller, so it's only a fallback for local dev.
export function clientIp(headers: Headers): string {
  return (
    headers.get("x-nf-client-connection-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    headers.get("x-real-ip") ??
    "anonymous"
  );
}
