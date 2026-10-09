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
  highlight_color: HighlightColor | null; // bonus 5: the current user's highlight
  comment_count: number; // bonus 5
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
  soundbites: Soundbite[]; // bonus 5, sorted by start
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

/** Bonus 5: annotations (backend/app/schemas/annotations.py). */
export type HighlightColor = "yellow" | "green" | "blue" | "pink";

export interface Comment {
  id: number;
  segment_id: number;
  author_name: string;
  text: string;
  created_at: string;
  updated_at: string;
}

export interface Soundbite {
  id: number;
  meeting_id: number;
  title: string;
  start_ms: number;
  end_ms: number;
  created_at: string;
}

export interface SoundbiteCreateInput {
  title: string;
  start_ms: number;
  end_ms: number;
}

/** Bonus 6: the "Ask about this meeting" chat (backend/app/schemas/chat.py). */
export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  answered_by: "llm" | "fallback" | null; // on answers: the model, or search results
  created_at: string;
}

/** backend/app/schemas/analytics.py (Extra 2): who talked how much in a meeting. */
export interface SpeakerAnalytics {
  participant_id: number;
  name: string;
  avatar_color: AvatarColor;
  talk_time_ms: number;
  talk_percent: number; // share of the meeting's talk time, to one decimal
  segment_count: number;
  word_count: number;
  words_per_minute: number; // 0 when the speaker's talk time is 0
  question_count: number;
  longest_monologue_ms: number;
}

export interface MeetingAnalytics {
  meeting_id: number;
  total_talk_time_ms: number;
  speaker_count: number;
  dominant_speaker: string | null; // null when there is no transcript
  speakers: SpeakerAnalytics[]; // most talk time first
}
