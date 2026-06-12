export type PassportStampAwardDetail = {
  title: string;
  date?: string;
  code?: string | null;
  icon?: string | null;
  description?: string | null;
};

export const BASE6_PASSPORT_STAMP_EVENT = "base6:passport-stamp-earned";

export function announcePassportStampAward(stamp: PassportStampAwardDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<PassportStampAwardDetail>(BASE6_PASSPORT_STAMP_EVENT, { detail: stamp }));
}


export const BASE6_PENDING_PASSPORT_STAMPS_KEY = "base6:pending-passport-stamps";

export function queuePassportStampAwardsForLounge(stamps: PassportStampAwardDetail[]) {
  if (typeof window === "undefined" || stamps.length === 0) return;

  try {
    const existing = window.sessionStorage.getItem(BASE6_PENDING_PASSPORT_STAMPS_KEY);
    const current = existing ? JSON.parse(existing) : [];
    const next = Array.isArray(current) ? [...current, ...stamps] : [...stamps];
    window.sessionStorage.setItem(BASE6_PENDING_PASSPORT_STAMPS_KEY, JSON.stringify(next));
  } catch {
    // If session storage is unavailable, avoid interrupting onboarding.
  }
}

export function takeQueuedPassportStampAwards(): PassportStampAwardDetail[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.sessionStorage.getItem(BASE6_PENDING_PASSPORT_STAMPS_KEY);
    if (!raw) return [];
    window.sessionStorage.removeItem(BASE6_PENDING_PASSPORT_STAMPS_KEY);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((stamp): stamp is PassportStampAwardDetail => Boolean(stamp?.title));
  } catch {
    window.sessionStorage.removeItem(BASE6_PENDING_PASSPORT_STAMPS_KEY);
    return [];
  }
}
