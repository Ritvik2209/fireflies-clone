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

/** Palette keys for tag chips (backend/app/models/tag.py). */
export type TagColor = "gray" | "blue" | "green" | "yellow" | "orange" | "red" | "pink" | "purple";

/** backend/app/schemas/tag.py (bonus 2) */
export interface Tag {
  id: number;
  name: string;
  color: TagColor;
}

/** One row of GET /api/meetings (backend/app/schemas/meeting.py: MeetingListItem) */
export interface MeetingListItem {
  id: number;
  title: string;
  meeting_date: string; // ISO 8601 in UTC, e.g. "2026-10-06T04:30:00Z"
  duration_ms: number;
  source: MeetingSource;
  participants: Participant[];
  tags: Tag[]; // sorted by name
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

export type TranscriptFormat = "txt" | "vtt" | "json";

/** POST /api/meetings (MeetingCreate). The backend parses the transcript and writes the notes. */
export interface MeetingCreateInput {
  title: string;
  meeting_date: string; // ISO 8601 with a time zone
  participant_names: string[];
  transcript_text: string;
  format: TranscriptFormat;
  source: "upload" | "paste";
}

/** PATCH /api/meetings/{id}: only the fields sent change; participant_names replaces the list. */
export interface MeetingUpdateInput {
  title?: string;
  participant_names?: string[];
  tag_ids?: number[]; // replaces the meeting's tags
}

/** POST /api/meetings/{id}/action-items */
export interface ActionItemCreateInput {
  text: string;
  assignee_id: number | null;
}

/** PATCH /api/action-items/{id}: only the fields sent change; assignee_id null unassigns. */
export interface ActionItemUpdateInput {
  text?: string;
  assignee_id?: number | null;
  is_completed?: boolean;
}

/** One matching transcript line from GET /api/search (bonus 4). */
export interface SearchResult {
  segment_id: number;
  meeting_id: number;
  meeting_title: string;
  meeting_date: string;
  speaker_name: string;
  speaker_color: AvatarColor;
  start_ms: number;
  snippet: string; // matches are wrapped in  … 
}

/** GET /api/meetings/{id}/export (bonus 3) */
export type ExportContent = "transcript" | "summary";
export type ExportFormat = "pdf" | "txt" | "md";

export type SortOrder = "recent" | "oldest";

/** Filters for GET /api/meetings. Dates are ISO strings with a time zone. */
export interface MeetingQuery {
  q?: string;
  participantId?: string;
  tagId?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: SortOrder;
}
