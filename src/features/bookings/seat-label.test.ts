import { describe, it, expect } from "vitest";
import { seatLabel } from "./seat-label";

describe("seatLabel", () => {
  it("says 'seat' when a full class holds exactly one", () => {
    expect(seatLabel(0, 1)).toBe("Full · 1 seat");
  });

  it("says 'seats' when a full class holds more than one", () => {
    expect(seatLabel(0, 12)).toBe("Full · 12 seats");
  });

  it("says 'seat' when the only seat in a one-seat class is still open", () => {
    expect(seatLabel(1, 1)).toBe("1 of 1 seat left");
  });

  it("says 'seats' when a larger class has seats open", () => {
    expect(seatLabel(2, 3)).toBe("2 of 3 seats left");
  });

  // Pluralisation follows capacity, not seatsLeft, so the last remaining seat
  // of a three-seat class must not read "1 of 3 seat left".
  it("pluralises on capacity rather than on the number left", () => {
    expect(seatLabel(1, 3)).toBe("1 of 3 seats left");
  });
});
