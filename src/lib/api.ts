/**
 * Type-safe API client for the ZoomConnect FastAPI backend.
 *
 * All wire types use camelCase to match the Pydantic alias_generator on the
 * server side.  The base URL is read from NEXT_PUBLIC_API_URL at build time
 * and falls back to the Next.js rewrite proxy at /api so the app works in
 * development without any CORS configuration.
 */

const API_BASE =
  typeof window !== "undefined"
    ? "/api"
    : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000") + "/api";

// ── Types ──────────────────────────────────────────────────────────────────

export type MeetingType   = "instant" | "scheduled";
export type MeetingStatus = "waiting" | "active" | "ended";
export type MeetingFilter = "upcoming" | "recent" | "all";

export interface Meeting {
  id: number;
  meetingId: string;
  title: string;
  description?: string | null;
  hostName: string;
  hostEmail: string;
  type: MeetingType;
  status: MeetingStatus;
  scheduledAt?: string | null;
  durationMinutes: number;
  participantCount: number;
  inviteLink: string;
  passcode?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingCreate {
  title: string;
  description?: string;
  type: MeetingType;
  scheduledAt?: string;
  durationMinutes?: number;
  passcode?: string;
}

export interface MeetingUpdate {
  title?: string;
  description?: string;
  scheduledAt?: string;
  durationMinutes?: number;
  passcode?: string;
  status?: MeetingStatus;
}

export interface Participant {
  id: number;
  meetingId: number;
  userId?: number | null;
  displayName: string;
  isMuted: boolean;
  isCameraOff: boolean;
  isAdmitted: boolean;
  isHost: boolean;
  joinedAt: string;
  leftAt?: string | null;
}

export interface DashboardSummary {
  totalMeetings: number;
  upcomingCount: number;
  recentCount: number;
  activeMeetings: Meeting[];
  upcomingMeetings: Meeting[];
  recentMeetings: Meeting[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

// ── Core fetcher ───────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    let message = `API error ${res.status}`;
    try {
      const body = await res.json();
      message = body.error ?? body.detail ?? message;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Dashboard ──────────────────────────────────────────────────────────────

export const getDashboardSummary = (): Promise<DashboardSummary> =>
  request("/dashboard/summary");

// ── Meetings ───────────────────────────────────────────────────────────────

export const listMeetings = (
  filter: MeetingFilter = "all",
  page = 1,
  pageSize = 20
): Promise<PaginatedResponse<Meeting>> =>
  request(`/meetings?type=${filter}&page=${page}&page_size=${pageSize}`);

export const getMeeting = (id: string): Promise<Meeting> =>
  request(`/meetings/${id}`);

export const createMeeting = (data: MeetingCreate): Promise<Meeting> =>
  request("/meetings", { method: "POST", body: JSON.stringify(data) });

export const updateMeeting = (id: string, data: MeetingUpdate): Promise<Meeting> =>
  request(`/meetings/${id}`, { method: "PATCH", body: JSON.stringify(data) });

export const deleteMeeting = (id: string): Promise<void> =>
  request(`/meetings/${id}`, { method: "DELETE" });

export const joinMeeting = (id: string, displayName: string): Promise<Participant> =>
  request(`/meetings/join/${id}`, {
    method: "POST",
    body: JSON.stringify({ displayName }),
  });

export const endMeeting = (id: string): Promise<Meeting> =>
  request(`/meetings/${id}/end`, { method: "POST" });

export const getMeetingParticipants = (id: string): Promise<Participant[]> =>
  request(`/meetings/${id}/participants`);

// ── Query key factories (for React Query cache invalidation) ───────────────

export const queryKeys = {
  dashboardSummary: ["dashboard", "summary"] as const,
  meetings: (filter?: MeetingFilter) => ["meetings", filter ?? "all"] as const,
  meeting: (id: string) => ["meeting", id] as const,
  participants: (id: string) => ["participants", id] as const,
};
