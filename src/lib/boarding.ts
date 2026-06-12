export type Base6BoardingAssignment = {
  boardingSequence: number;
  boardingGroup: string;
  boardingFlight: string;
  boardingSeat: string;
};

const SEATS_PER_ROW = 6;
const ROWS_PER_FLIGHT = 30;
const SEATS_PER_FLIGHT = SEATS_PER_ROW * ROWS_PER_FLIGHT;
const FLIGHTS_PER_GROUP = 100;
const SEAT_LETTERS = "ABCDEF";

export function getBase6BoardingAssignment(sequence: number): Base6BoardingAssignment {
  const safeSequence = Math.max(1, Math.floor(sequence || 1));
  const zeroBased = safeSequence - 1;
  const flightIndex = Math.floor(zeroBased / SEATS_PER_FLIGHT);
  const groupIndex = Math.floor(flightIndex / FLIGHTS_PER_GROUP);
  const flightNumber = flightIndex % FLIGHTS_PER_GROUP;
  const seatIndex = zeroBased % SEATS_PER_FLIGHT;
  const rowNumber = Math.floor(seatIndex / SEATS_PER_ROW) + 1;
  const seatLetter = SEAT_LETTERS[seatIndex % SEATS_PER_ROW];
  const boardingGroup = String.fromCharCode("A".charCodeAt(0) + groupIndex);

  return {
    boardingSequence: safeSequence,
    boardingGroup,
    boardingFlight: `${boardingGroup}-${String(flightNumber).padStart(2, "0")}`,
    boardingSeat: `${rowNumber}${seatLetter}`,
  };
}
