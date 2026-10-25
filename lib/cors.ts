/**
 * Shared CORS rules for the API routes.
 *
 * The hosted web app calls the API same-origin, but the Capacitor iOS app
 * loads from capacitor://warikan.local (see capacitor.config.ts) and calls
 * the hosted API cross-origin, so every route must answer preflights and
 * return Access-Control-Allow-Origin for it.
 */

// capacitor://localhost is kept for iOS builds made before the app hostname
// changed to warikan.local.
const PRODUCTION_ORIGINS = [
  "https://warikan0.netlify.app",
  "capacitor://warikan.local",
  "capacitor://localhost",
];

// Only trusted when running locally, so a page served from someone's own
// machine can't spend the hosted Gemini quota.
const DEV_ORIGINS = ["http://localhost:3000", "http://localhost:3001", "http://localhost"];

const ALLOWED_ORIGINS =
  process.env.NODE_ENV === "production" ? PRODUCTION_ORIGINS : [...PRODUCTION_ORIGINS, ...DEV_ORIGINS];

// Netlify deploy previews and branch deploys, e.g. https://staging--warikan0.netlify.app
const NETLIFY_BRANCH_ORIGIN_RE = /^https:\/\/[a-z0-9-]+--warikan0\.netlify\.app(\/|$)/;

/** Accepts an Origin header or a Referer URL (which has a path after the origin). */
export function isAllowedOrigin(value: string): boolean {
  if (ALLOWED_ORIGINS.some((origin) => value === origin || value.startsWith(`${origin}/`))) return true;
  return NETLIFY_BRANCH_ORIGIN_RE.test(value);
}

export function corsHeaders(origin: string, methods: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}
