// Types shared across the frontend. API types mirror the Pydantic schemas in backend/app/schemas.

/** GET /api/health (backend/app/schemas/health.py) */
export interface HealthResponse {
  status: "ok";
  sqlite_version: string;
  fts5: boolean;
}

/** Palette keys stored by the API; each maps to a bg-avatar-* colour token. */
export type AvatarColor = "indigo" | "green" | "yellow" | "orange" | "pink" | "cyan";
