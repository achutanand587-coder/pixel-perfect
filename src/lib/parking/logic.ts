import type { Bill, ParkingSlot, Settings, SlotType, VehicleType } from "./types";

export const HOUR = 3_600_000;

/** Billed per started hour, minimum one hour. */
export function billableHours(entry: number, exit: number): number {
  return Math.max(1, Math.ceil((exit - entry) / HOUR));
}

export function computeBill(
  type: VehicleType,
  entry: number,
  exit: number,
  settings: Settings,
  lostTicket = false,
): Bill {
  const hours = billableHours(entry, exit);
  const rate = settings.rates[type];
  const subtotal = hours * rate;
  const lost = lostTicket ? settings.lostTicketFee : 0;
  const tax = Math.round(((subtotal + lost) * settings.taxPercent) / 100);
  return { hours, rate, subtotal, tax, lostTicket: lost, total: subtotal + lost + tax };
}

export type Requirement = "NONE" | "ACCESSIBLE" | "VIP";

/** Which slot types a vehicle may use, in preference order. */
export function compatibleTypes(type: VehicleType, req: Requirement): SlotType[] {
  if (req === "ACCESSIBLE") return ["ACCESSIBLE"];
  if (req === "VIP") return ["VIP"];
  if (type === "BIKE") return ["COMPACT", "STANDARD"];
  if (type === "EV") return ["EV", "STANDARD"];
  return ["STANDARD"];
}

export function findSlot(
  slots: ParkingSlot[],
  type: VehicleType,
  req: Requirement,
  zone?: string,
): ParkingSlot | undefined {
  for (const t of compatibleTypes(type, req)) {
    const hit = slots.find(
      (s) => s.status === "AVAILABLE" && s.type === t && (!zone || s.zone === zone),
    );
    if (hit) return hit;
  }
  return undefined;
}

export function formatDuration(ms: number): string {
  const m = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(m / 60);
  return h ? `${h}h ${String(m % 60).padStart(2, "0")}m` : `${m}m`;
}

export const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export function normalizePlate(p: string) {
  return p.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
