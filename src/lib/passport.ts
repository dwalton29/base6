export type PassportProfile = {
  username: string;
  passport_number: string;
  platform: string | null;
  platform_handle: string | null;
  avatar_url: string | null;
  crime_history: string | null;
  san_andreas_since_year: number | null;
  business_type: string | null;
  business_custom_text: string | null;
  bio: string | null;
  reputation_score: number;
  created_at?: string | null;
};

export type PassportStamp = {
  name: string;
  description: string | null;
  icon: string | null;
  code?: string | null;
  granted_at?: string | null;
};

export type PassportStampRow = {
  granted_at: string | null;
  passport_stamps:
    | {
        name: string;
        description: string | null;
        icon: string | null;
        code: string | null;
      }
    | {
        name: string;
        description: string | null;
        icon: string | null;
        code: string | null;
      }[]
    | null;
};

export type PassportIdentityDetails = {
  username: string;
  passportNumber: string;
  avatarUrl?: string | null;
  platform?: string | null;
  handleLabel?: string;
  handle?: string | null;
  issued?: string;
  record?: string;
  business?: string;
  bio?: string | null;
  reputation?: string | number | null;
};

export const fallbackPassportStamps: PassportStamp[] = [
  {
    name: "Checked In",
    description: "Issued your first Leonida boarding pass.",
    icon: "✈️",
    code: "checked_in",
  },
];

export function formatPassportDate(value?: string | null) {
  if (!value) return "Pending";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function getPassportPlatformLabel(platform?: string | null) {
  if (!platform) return "Player ID";
  if (platform.includes("PlayStation")) return "PSN";
  if (platform.includes("Xbox")) return "Gamertag";
  if (platform.includes("Steam") || platform.includes("PC")) return "Steam";
  return "Player ID";
}

export function buildPassportIdentityDetails(profile: PassportProfile): PassportIdentityDetails {
  const business = profile.business_custom_text || profile.business_type || "Lounge traveller";
  const record = profile.crime_history === "Spent time in San Andreas"
    ? `San Andreas · moved there in ${profile.san_andreas_since_year || 2013}`
    : profile.crime_history || "Clean record";

  return {
    username: profile.username,
    passportNumber: profile.passport_number,
    avatarUrl: profile.avatar_url,
    platform: profile.platform,
    handleLabel: getPassportPlatformLabel(profile.platform),
    handle: profile.platform_handle,
    issued: formatPassportDate(profile.created_at),
    record,
    business,
    bio: profile.bio,
    reputation: profile.reputation_score,
  };
}

export function parsePassportStampRows(rows: PassportStampRow[] | null | undefined) {
  return (rows || [])
    .map((row) => {
      const stamp = Array.isArray(row.passport_stamps) ? row.passport_stamps[0] : row.passport_stamps;
      if (!stamp) return null;
      return {
        name: stamp.name,
        description: stamp.description,
        icon: stamp.icon,
        code: stamp.code,
        granted_at: row.granted_at,
      };
    })
    .filter(Boolean) as PassportStamp[];
}

export function chunkPassportStamps(stamps: PassportStamp[], perPage = 6) {
  const source = stamps.length ? stamps : fallbackPassportStamps;
  const chunks: PassportStamp[][] = [];
  for (let i = 0; i < source.length; i += perPage) chunks.push(source.slice(i, i + perPage));
  return chunks.length ? chunks : [fallbackPassportStamps];
}

export function passportInitials(username: string) {
  const trimmed = username.trim();
  if (!trimmed) return "ID";
  return trimmed.slice(0, 2).toUpperCase();
}

export function cleanPassportMachineText(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "") || "PASSENGER";
}
