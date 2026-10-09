// The only module that talks to the backend. Components call these typed functions,
// never fetch() directly.
import type {
  ActionItem,
  ActionItemCreateInput,
  ActionItemUpdateInput,
  ChatMessage,
  Comment,
  ExportContent,
  ExportFormat,
  HighlightColor,
  MeetingCreateInput,
  MeetingDetail,
  MeetingListItem,
  MeetingQuery,
  MeetingUpdateInput,
  Participant,
  SearchResult,
  Soundbite,
  SoundbiteCreateInput,
  Tag,
} from "@/lib/types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** A failed API call. `status` is 0 when the server couldn't be reached at all. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Sends a request and returns the response, or throws an ApiError the UI can show. */
async function send(path: string, init: RequestInit = {}): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api${path}`, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
  }
  if (!response.ok) {
    throw new ApiError(response.status, await errorDetail(response));
  }
  return response;
}

/** A request whose response is JSON (or nothing, for DELETE). */
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await send(path, init);
  if (response.status === 204) return undefined as T; // DELETE: no body
  return (await response.json()) as T;
}

/** A request with a JSON body (POST, PATCH, PUT). */
function sendJson<T>(method: "POST" | "PATCH" | "PUT", path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** The API always answers errors with {"detail": "..."}; fall back to the status code. */
async function errorDetail(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null && "detail" in body) {
      const { detail } = body;
      if (typeof detail === "string") return detail;
    }
  } catch {
    // Not JSON (e.g. a proxy error page): use the generic message below.
  }
  return `Request failed (${response.status})`;
}

/** A message for the UI from anything a request can throw. */
export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : "Something went wrong. Please try again.";
}

export function listMeetings(
  query: MeetingQuery,
  signal?: AbortSignal,
): Promise<MeetingListItem[]> {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.participantId) params.set("participant_id", query.participantId);
  if (query.tagId) params.set("tag_id", query.tagId);
  if (query.dateFrom) params.set("date_from", query.dateFrom);
  if (query.dateTo) params.set("date_to", query.dateTo);
  if (query.sort) params.set("sort", query.sort);
  const search = params.toString();
  return request<MeetingListItem[]>(search ? `/meetings?${search}` : "/meetings", { signal });
}

export function getMeeting(id: number, signal?: AbortSignal): Promise<MeetingDetail> {
  return request<MeetingDetail>(`/meetings/${id}`, { signal });
}

export function listParticipants(signal?: AbortSignal): Promise<Participant[]> {
  return request<Participant[]>("/participants", { signal });
}

export function createMeeting(input: MeetingCreateInput): Promise<MeetingDetail> {
  return sendJson<MeetingDetail>("POST", "/meetings", input);
}

export function updateMeeting(id: number, changes: MeetingUpdateInput): Promise<MeetingDetail> {
  return sendJson<MeetingDetail>("PATCH", `/meetings/${id}`, changes);
}

export function deleteMeeting(id: number): Promise<void> {
  return request<void>(`/meetings/${id}`, { method: "DELETE" });
}

export function createActionItem(
  meetingId: number,
  input: ActionItemCreateInput,
): Promise<ActionItem> {
  return sendJson<ActionItem>("POST", `/meetings/${meetingId}/action-items`, input);
}

export function updateActionItem(id: number, changes: ActionItemUpdateInput): Promise<ActionItem> {
  return sendJson<ActionItem>("PATCH", `/action-items/${id}`, changes);
}

export function deleteActionItem(id: number): Promise<void> {
  return request<void>(`/action-items/${id}`, { method: "DELETE" });
}

export function listTags(signal?: AbortSignal): Promise<Tag[]> {
  return request<Tag[]>("/tags", { signal });
}

/** The API picks the colour from the name. A name that already exists (ignoring case) is 409. */
export function createTag(name: string): Promise<Tag> {
  return sendJson<Tag>("POST", "/tags", { name });
}

/** An export file (bonus 3), with the filename the server chose. */
export async function downloadExport(
  meetingId: number,
  content: ExportContent,
  format: ExportFormat,
): Promise<{ blob: Blob; filename: string }> {
  const response = await send(`/meetings/${meetingId}/export?content=${content}&format=${format}`);
  // The server names the file in Content-Disposition, which its CORS settings let us read.
  const header = response.headers.get("Content-Disposition") ?? "";
  const filename = /filename="([^"]+)"/.exec(header)?.[1] ?? `meeting-${content}.${format}`;
  return { blob: await response.blob(), filename };
}

/** Full-text search across every transcript (bonus 4), best matches first. */
export function searchTranscripts(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  return request<SearchResult[]>(`/search?q=${encodeURIComponent(query)}`, { signal });
}

// Bonus 5: highlights, comments and soundbites.

export function setHighlight(segmentId: number, color: HighlightColor): Promise<unknown> {
  return sendJson("PUT", `/segments/${segmentId}/highlight`, { color });
}

export function clearHighlight(segmentId: number): Promise<void> {
  return request<void>(`/segments/${segmentId}/highlight`, { method: "DELETE" });
}

export function listComments(segmentId: number, signal?: AbortSignal): Promise<Comment[]> {
  return request<Comment[]>(`/segments/${segmentId}/comments`, { signal });
}

export function addComment(segmentId: number, text: string): Promise<Comment> {
  return sendJson<Comment>("POST", `/segments/${segmentId}/comments`, { text });
}

export function updateComment(commentId: number, text: string): Promise<Comment> {
  return sendJson<Comment>("PATCH", `/comments/${commentId}`, { text });
}

export function deleteComment(commentId: number): Promise<void> {
  return request<void>(`/comments/${commentId}`, { method: "DELETE" });
}

export function createSoundbite(
  meetingId: number,
  input: SoundbiteCreateInput,
): Promise<Soundbite> {
  return sendJson<Soundbite>("POST", `/meetings/${meetingId}/soundbites`, input);
}

export function deleteSoundbite(soundbiteId: number): Promise<void> {
  return request<void>(`/soundbites/${soundbiteId}`, { method: "DELETE" });
}

// Bonus 6: the "Ask about this meeting" chat.

export function listChat(meetingId: number, signal?: AbortSignal): Promise<ChatMessage[]> {
  return request<ChatMessage[]>(`/meetings/${meetingId}/chat`, { signal });
}

/** Asks a question; resolves to the stored answer (the server stores the question too). */
export function askQuestion(meetingId: number, question: string): Promise<ChatMessage> {
  return sendJson<ChatMessage>("POST", `/meetings/${meetingId}/chat`, { question });
}

export function clearChat(meetingId: number): Promise<void> {
  return request<void>(`/meetings/${meetingId}/chat`, { method: "DELETE" });
}
