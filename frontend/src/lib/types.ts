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

/** One transcript line (backend/app/schemas/transcript.py). The speaker is a meeting participant. */
export interface TranscriptSegment {
  id: number;
  position: number;
  speaker_id: number;
  start_ms: number; // milliseconds from the start of the meeting
  end_ms: number;
  text: string;
}

export type GeneratedBy = "seed" | "rule_based";

/** backend/app/schemas/summary.py */
export interface Summary {
  overview: string;
  keywords: string[];
  generated_by: GeneratedBy;
  created_at: string;
}

export interface Chapter {
  id: number;
  position: number;
  title: string;
  start_ms: number;
}

/** backend/app/schemas/action_item.py */
export interface ActionItem {
  id: number;
  meeting_id: number;
  text: string;
  assignee_id: number | null;
  is_completed: boolean;
  source_start_ms: number | null; // where in the transcript it was said, if known
  created_at: string;
  updated_at: string;
}

/** GET /api/meetings/{id} (MeetingDetail): the meeting with its transcript and notes. */
export interface MeetingDetail extends MeetingListItem {
  created_at: string;
  updated_at: string;
  segments: TranscriptSegment[]; // sorted by start_ms
  summary: Summary | null;
  chapters: Chapter[]; // sorted by start_ms
  action_items: ActionItem[];
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
