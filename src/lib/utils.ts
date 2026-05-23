import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format meeting ID string as "XXX XXX XXXX". */
export function formatMeetingId(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 10) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
  }
  return raw;
}

/** Compact meeting ID — strips all spaces. */
export function compactMeetingId(id: string): string {
  return id.replace(/\s/g, "");
}

/** Format seconds as MM:SS. */
export function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/** Pick a deterministic avatar colour from a display name. */
const AVATAR_COLORS = [
  "#C0392B", "#0B5CFF", "#16A34A", "#D97706",
  "#7C3AED", "#DB2777", "#0891B2", "#65A30D",
];
export function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/** Initials from a display name (max 2 chars). */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}
