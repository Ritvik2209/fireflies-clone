// The only module that talks to the backend. Components call these typed functions,
// never fetch() directly.
import type { MeetingDetail, MeetingListItem, MeetingQuery, Participant } from "@/lib/types";

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
  return (await response.json()) as T;
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
