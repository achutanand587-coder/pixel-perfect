import { describe, expect, it } from "vitest";
import { billableHours, computeBill, findSlot, HOUR } from "./logic";
import { defaultSettings } from "./seed";
import type { ParkingSlot } from "./types";

describe("billing", () => {
  it("charges a minimum of one hour", () => expect(billableHours(0, 10 * 60000)).toBe(1));
  it("rounds up to the next started hour", () => expect(billableHours(0, 2 * HOUR + 60000)).toBe(3));
  it("car 3h with 18% tax", () => expect(computeBill("CAR", 0, 3 * HOUR, defaultSettings).total).toBe(142));
  it("adds lost-ticket surcharge before tax", () => expect(computeBill("BIKE", 0, HOUR, defaultSettings, true).total).toBe(260));
});

describe("allocation", () => {
  const s = (id: string, type: ParkingSlot["type"], status: ParkingSlot["status"] = "AVAILABLE"): ParkingSlot => ({ id, zone: id[0], row: 1, type, status });
  const slots = [s("A-01", "ACCESSIBLE"), s("B-01", "STANDARD", "OCCUPIED"), s("B-02", "STANDARD"), s("C-01", "EV"), s("D-01", "COMPACT")];
  it("bike gets compact bay", () => expect(findSlot(slots, "BIKE", "NONE")?.id).toBe("D-01"));
  it("EV prefers EV bay", () => expect(findSlot(slots, "EV", "NONE")?.id).toBe("C-01"));
  it("car skips occupied", () => expect(findSlot(slots, "CAR", "NONE")?.id).toBe("B-02"));
  it("accessible requirement", () => expect(findSlot(slots, "CAR", "ACCESSIBLE")?.id).toBe("A-01"));
});
