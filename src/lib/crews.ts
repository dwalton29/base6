export type CrewEra = "GTA_VI" | "GTA_V" | "BOTH";
export type JoinPolicy = "open" | "request" | "invite_only" | "closed";

export type Crew = {
  id: string;
  owner_id: string | null;
  name: string;
  slug: string;
  bio: string | null;
  description?: string | null;
  photo_url: string | null;
  crew_color: string | null;
  crew_theme: string | null;
  game_scope: CrewEra | string | null;
  play_styles: string[] | null;
  recruitment_status: JoinPolicy | string | null;
  reputation_score: number | null;
  created_at: string;
  owner_username?: string | null;
  owner_profile?: { username: string | null; avatar_url?: string | null } | null;
  crew_members?: { count: number }[];
};

export type Membership = {
  crew_id: string;
  profile_id: string | null;
  user_id?: string | null;
  role: string;
  status: string;
};

export type CrewMember = Membership & {
  joined_at: string;
  profiles?: ProfileLite | null;
};

export type CrewPost = {
  id: string;
  crew_id: string;
  author_id: string | null;
  post_type: string | null;
  title: string | null;
  body: string | null;
  image_url: string | null;
  created_at: string;
  profiles?: { username: string | null; avatar_url: string | null } | null;
};

export type CrewEvent = {
  id: string;
  crew_id: string;
  host_id: string | null;
  title: string;
  event_type: string | null;
  description: string | null;
  game_context: string | null;
  platform: string | null;
  starts_at: string | null;
  ends_at?: string | null;
  image_url?: string | null;
  max_players: number | null;
  status: string | null;
  created_at: string;
  profiles?: { username: string | null; avatar_url: string | null } | null;
  attendee_count?: number;
  current_user_joined?: boolean;
};

export type CrewEventAttendee = {
  event_id: string;
  profile_id: string | null;
  user_id?: string | null;
  status: string | null;
};

export type ProfileLite = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  platform: string | null;
  platform_handle: string | null;
  boarding_flight?: string | null;
  boarding_seat?: string | null;
};

export const PLAY_STYLE_OPTIONS = [
  "Roleplay",
  "Missions",
  "Heists",
  "Car meets",
  "Racing",
  "Drifting",
  "PvP",
  "Casual",
  "Grinding",
  "Content creation",
  "Photography",
  "Exploration",
];

export const THEME_OPTIONS = [
  { value: "midnight", label: "Midnight" },
  { value: "vice", label: "Vice" },
  { value: "executive", label: "Executive" },
  { value: "street", label: "Street" },
];

export const EVENT_TYPES = ["Heists", "Missions", "Roleplay", "Car meets", "Racing", "Drifting", "PvP", "Free roam", "Photo shoot", "Recruitment", "Launch night"];
export const PLATFORMS = ["Any", "PlayStation 5", "Xbox Series X|S", "Steam / PC", "Rockstar", "Not sure yet"];
export const POST_TYPES = ["Update", "Announcement", "Recruitment", "Media", "Operation note"];
export const FALLBACK_OPERATION_IMAGE = "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1200&q=80";

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48) || `crew-${Date.now()}`;
}

export function eraLabel(value: string | null | undefined) {
  if (value === "GTA_V") return "Los Santos / GTA V";
  if (value === "BOTH") return "V now · VI next";
  return "Leonida / GTA VI";
}

export function statusLabel(value: string | null | undefined) {
  if (value === "request") return "Request to join";
  if (value === "invite_only") return "Invite only";
  if (value === "closed") return "Closed";
  return "Open recruitment";
}

export function initials(value: string | null | undefined) {
  return String(value || "B6").trim().slice(0, 2).toUpperCase() || "B6";
}

export function asPlayStyles(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function getSupabaseErrorMessage(error: unknown, fallback: string) {
  if (!error) return fallback;
  if (error instanceof Error) return error.message;
  if (typeof error === "object") {
    const record = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    const parts = [record.message, record.details, record.hint, record.code]
      .filter((part): part is string => typeof part === "string" && part.trim().length > 0);
    if (parts.length) return parts.join(" — ");
  }
  return typeof error === "string" ? error : fallback;
}

export function localInputToIso(value: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function toDatetimeLocalValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function operationDefaultTimes() {
  const start = new Date(Date.now() + 60 * 60 * 1000);
  start.setMinutes(0, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return { start: toDatetimeLocalValue(start), end: toDatetimeLocalValue(end) };
}

export function formatWhen(value: string | null | undefined) {
  if (!value) return "TBC";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "TBC";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

export function timeAgo(value: string | null | undefined) {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function getOperationStatus(operation: Pick<CrewEvent, "starts_at" | "ends_at" | "status">) {
  if (operation.status === "cancelled") return "cancelled";
  const now = Date.now();
  const start = new Date(String(operation.starts_at || "")).getTime();
  const end = new Date(String(operation.ends_at || "")).getTime();
  if (Number.isFinite(end) && end <= now) return "ended";
  if (Number.isFinite(start) && start <= now && (!Number.isFinite(end) || end > now)) return "live";
  return "upcoming";
}

export function operationStatusLabel(operation: Pick<CrewEvent, "starts_at" | "ends_at" | "status">) {
  const status = getOperationStatus(operation);
  if (status === "live") return "Live now";
  if (status === "ended") return "Ended";
  if (status === "cancelled") return "Cancelled";
  return "Upcoming";
}

export function profileName(profile?: { username: string | null } | null) {
  return profile?.username || "Passenger";
}

export function profileMap(rows: ProfileLite[] | null | undefined) {
  return new Map((rows || []).map((profile) => [profile.id, profile]));
}

export function memberProfileId(member: Pick<CrewMember, "profile_id" | "user_id">) {
  return member.profile_id || member.user_id || null;
}
