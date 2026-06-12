export const FLIGHT_SEAT_LETTERS = ["A", "B", "C", "D", "E", "F"] as const;
export const FLIGHT_ROWS_PER_PLANE = 30;
export const FLIGHT_STATUS_MAX_LENGTH = 90;

export type FlightSeatLetter = (typeof FLIGHT_SEAT_LETTERS)[number];

export type FlightPassenger = {
  id: string;
  username: string | null;
  username_slug?: string | null;
  display_name?: string | null;
  passport_number: string | null;
  platform: string | null;
  platform_handle: string | null;
  avatar_url: string | null;
  reputation_score: number | null;
  boarding_flight: string | null;
  boarding_seat: string | null;
  flight_status?: string | null;
  flight_status_updated_at?: string | null;
  created_at?: string | null;
};

export type FlightSeat = {
  code: string;
  row: number;
  letter: FlightSeatLetter;
  passenger: FlightPassenger | null;
};

export const DEFAULT_FLIGHT_STATUSES = [
  "Waiting in the lounge.",
  "Checked in for Leonida.",
  "Looking for a crew.",
  "Boarding soon.",
  "Passport stamped and ready.",
  "Here for the launch chaos.",
];

export function flightDisplayName(profile?: Pick<FlightPassenger, "display_name" | "username" | "platform_handle"> | null) {
  return profile?.display_name || profile?.username || profile?.platform_handle || "Passenger";
}

export function flightInitials(profile?: Pick<FlightPassenger, "display_name" | "username" | "platform_handle"> | null) {
  const name = flightDisplayName(profile).trim();
  if (!name) return "B6";
  const parts = name.split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("") || name.slice(0, 2).toUpperCase();
}

export function normaliseFlightStatus(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, FLIGHT_STATUS_MAX_LENGTH);
}

export function parseSeatCode(seat?: string | null) {
  const match = String(seat || "").trim().toUpperCase().match(/^(\d{1,2})([A-F])$/);
  if (!match) return null;
  const row = Number(match[1]);
  const letter = match[2] as FlightSeatLetter;
  if (!Number.isFinite(row) || row < 1 || row > FLIGHT_ROWS_PER_PLANE) return null;
  return { row, letter, code: `${row}${letter}` };
}

export function sortPassengersBySeat(passengers: FlightPassenger[]) {
  return [...passengers].sort((a, b) => {
    const seatA = parseSeatCode(a.boarding_seat);
    const seatB = parseSeatCode(b.boarding_seat);
    if (!seatA && !seatB) return flightDisplayName(a).localeCompare(flightDisplayName(b));
    if (!seatA) return 1;
    if (!seatB) return -1;
    if (seatA.row !== seatB.row) return seatA.row - seatB.row;
    return FLIGHT_SEAT_LETTERS.indexOf(seatA.letter) - FLIGHT_SEAT_LETTERS.indexOf(seatB.letter);
  });
}

export function buildCabinRows(passengers: FlightPassenger[], minimumRows = 12) {
  const occupiedRows = passengers
    .map((passenger) => parseSeatCode(passenger.boarding_seat)?.row || 0)
    .filter(Boolean);
  const rowCount = Math.min(FLIGHT_ROWS_PER_PLANE, Math.max(minimumRows, Math.max(0, ...occupiedRows) + 2));
  const passengerBySeat = new Map<string, FlightPassenger>();

  sortPassengersBySeat(passengers).forEach((passenger) => {
    const parsed = parseSeatCode(passenger.boarding_seat);
    if (!parsed || passengerBySeat.has(parsed.code)) return;
    passengerBySeat.set(parsed.code, passenger);
  });

  return Array.from({ length: rowCount }, (_, rowIndex) => {
    const row = rowIndex + 1;
    const seats: FlightSeat[] = FLIGHT_SEAT_LETTERS.map((letter) => {
      const code = `${row}${letter}`;
      return {
        code,
        row,
        letter,
        passenger: passengerBySeat.get(code) || null,
      };
    });
    return { row, seats };
  });
}

export function demoFlightPassengers(): FlightPassenger[] {
  const now = new Date().toISOString();
  return [
    {
      id: "demo-you",
      username: "Dwalton29",
      passport_number: "B6-DEMO-029",
      platform: "Rockstar",
      platform_handle: "Dwalton29",
      avatar_url: null,
      reputation_score: 29,
      boarding_flight: "A-00",
      boarding_seat: "14A",
      flight_status: "Waiting in the lounge.",
      flight_status_updated_at: now,
    },
    {
      id: "demo-vicebound",
      username: "vicebound",
      passport_number: "B6-DEMO-104",
      platform: "PS5",
      platform_handle: "vicebound",
      avatar_url: null,
      reputation_score: 16,
      boarding_flight: "A-00",
      boarding_seat: "14B",
      flight_status: "Looking for a launch crew.",
      flight_status_updated_at: now,
    },
    {
      id: "demo-passport-control",
      username: "passport_control",
      passport_number: "B6-DEMO-006",
      platform: "Xbox Series X|S",
      platform_handle: "passportcontrol",
      avatar_url: null,
      reputation_score: 44,
      boarding_flight: "A-00",
      boarding_seat: "15D",
      flight_status: "Boarding soon.",
      flight_status_updated_at: now,
    },
    {
      id: "demo-leonida-local",
      username: "leonida_local",
      passport_number: "B6-DEMO-118",
      platform: "PC",
      platform_handle: "leonida_local",
      avatar_url: null,
      reputation_score: 9,
      boarding_flight: "A-00",
      boarding_seat: "16C",
      flight_status: "Here for trailer theories.",
      flight_status_updated_at: now,
    },
  ];
}
