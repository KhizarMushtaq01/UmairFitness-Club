/**
 * The seat line under a class card. Pluralisation follows `capacity` in both
 * phrasings, since that is the noun being counted — "1 of 3 seats left"
 * describes three seats, only one of which is free.
 */
export function seatLabel(seatsLeft: number, capacity: number) {
  const seats = `${capacity} ${capacity === 1 ? "seat" : "seats"}`;
  return seatsLeft === 0 ? `Full · ${seats}` : `${seatsLeft} of ${seats} left`;
}
