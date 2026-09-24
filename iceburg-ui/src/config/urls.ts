/**
 * Cross-domain links between the two separately-built, separately-deployed
 * surfaces: the marketing site (this repo's `index.html` / `main.tsx`
 * entry) and the app (`app/index.html` / `main.app.tsx`). They no longer
 * share an origin in production, so navigation between them uses plain
 * `<a>` tags against these URLs, never a React Router `<Link>`.
 */
export const MARKETING_URL = (import.meta.env.VITE_MARKETING_URL || "http://localhost:5173").replace(/\/$/, "");
export const APP_URL = (import.meta.env.VITE_APP_URL || "http://localhost:5174").replace(/\/$/, "");
