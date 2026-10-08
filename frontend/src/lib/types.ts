// Types shared across the frontend. API types mirror the Pydantic schemas in backend/app/schemas.

/** Palette keys stored by the API; each maps to a bg-avatar-* colour token. */
export type AvatarColor = "indigo" | "green" | "yellow" | "orange" | "pink" | "cyan";

/** backend/app/schemas/participant.py */
export interface Participant {
  id: number;
  name: string;
  email: string | null;
  avatar_color: AvatarColor;
}

export type MeetingSource = "seed" | "upload" | "paste";

/** One row of GET /api/meetings (backend/app/schemas/meeting.py: MeetingListItem) */
export interface MeetingListItem {
  id: number;
  title: string;
  meeting_date: string; // ISO 8601 in UTC, e.g. "2026-10-06T04:30:00Z"
  duration_ms: number;
  source: MeetingSource;
  participants: Participant[];
}

export type SortOrder = "recent" | "oldest";

/** Filters for GET /api/meetings. Dates are ISO strings with a time zone. */
export interface MeetingQuery {
  q?: string;
  participantId?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: SortOrder;
}
