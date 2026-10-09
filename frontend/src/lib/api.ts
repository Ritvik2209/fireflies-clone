// The only module that talks to the backend. Components call these typed functions,
// never fetch() directly.
import type {
  ActionItem,
  ActionItemCreateInput,
  ActionItemUpdateInput,
  MeetingCreateInput,
  MeetingDetail,
  MeetingListItem,
  MeetingQuery,
  MeetingUpdateInput,
  Participant,
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

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
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
  if (response.status === 204) return undefined as T; // DELETE: no body
  return (await response.json()) as T;
}

/** A request with a JSON body (POST, PATCH). */
function sendJson<T>(method: "POST" | "PATCH", path: string, body: unknown): Promise<T> {
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
