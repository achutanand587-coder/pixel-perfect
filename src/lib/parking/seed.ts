import { HOUR, computeBill } from "./logic";
import type { ParkingRecord, ParkingSlot, Settings, SlotType, Vehicle } from "./types";

export const defaultSettings: Settings = {
  rates: { CAR: 40, BIKE: 20, EV: 50 },
  taxPercent: 18,
  lostTicketFee: 200,
  facilityName: "VIT Pune Campus Parking",
};

const ZONES: { zone: string; types: (row: number, i: number) => SlotType }[] = [
  { zone: "A", types: (r, i) => (r === 1 && i < 2 ? "ACCESSIBLE" : r === 1 && i < 4 ? "VIP" : "STANDARD") },
  { zone: "B", types: () => "STANDARD" },
  { zone: "C", types: (r) => (r === 1 ? "EV" : "STANDARD") },
  { zone: "D", types: () => "COMPACT" },
];

const VEHICLES: Vehicle[] = [
  { plate: "MH12AB4471", type: "CAR", brand: "Hyundai", model: "Creta", owner: "R. Kulkarni" },
  { plate: "MH14CD9902", type: "CAR", brand: "Maruti", model: "Baleno" },
  { plate: "MH12EV2210", type: "EV", brand: "Tata", model: "Nexon EV", owner: "Dr. S. Joshi" },
  { plate: "MH12GH6634", type: "CAR", brand: "Honda", model: "City" },
  { plate: "MH12BK1180", type: "BIKE", brand: "Royal Enfield", model: "Classic 350" },
  { plate: "MH14BK7721", type: "BIKE", brand: "Honda", model: "Activa 6G" },
  { plate: "MH12JK2210", type: "CAR", brand: "Kia", model: "Seltos" },
  { plate: "MH12EV8803", type: "EV", brand: "MG", model: "ZS EV" },
  { plate: "MH12LM9902", type: "CAR", brand: "Toyota", model: "Innova" },
  { plate: "MH14BK3345", type: "BIKE", brand: "Bajaj", model: "Pulsar 150" },
  { plate: "MH12QR4419", type: "CAR", brand: "Mahindra", model: "XUV700" },
  { plate: "MH12ST5560", type: "CAR", brand: "Skoda", model: "Slavia" },
];

/** Deterministic demo data relative to `now`. Call only on the client. */
export function makeSeed(now: number) {
  const slots: ParkingSlot[] = [];
  for (const z of ZONES) {
    for (let row = 1; row <= 2; row++) {
      for (let i = 0; i < 8; i++) {
        const n = (row - 1) * 8 + i + 1;
        slots.push({
          id: `${z.zone}-${String(n).padStart(2, "0")}`,
          zone: z.zone,
          row,
          type: z.types(row, i),
          status: "AVAILABLE",
        });
      }
    }
  }
  const take = (id: string) => slots.find((s) => s.id === id)!;
  ["A-04", "C-12"].forEach((id) => (take(id).status = "RESERVED"));
  ["B-14", "D-16"].forEach((id) => (take(id).status = "MAINTENANCE"));

  const activeMap: [number, string, number][] = [
    [0, "B-02", 2.3], [1, "B-05", 0.6], [2, "C-01", 3.4], [3, "A-09", 1.2],
    [4, "D-01", 4.1], [5, "D-03", 0.3], [6, "B-09", 5.6], [7, "C-03", 1.8],
    [8, "A-11", 2.9], [9, "D-06", 1.1], [10, "B-11", 0.9],
  ];
  const records: ParkingRecord[] = [];
  let seq = 1040;
  activeMap.forEach(([vi, slotId, hrs]) => {
    const id = `PR-${seq++}`;
    records.push({ id, vehicle: VEHICLES[vi], slotId, entry: now - hrs * HOUR });
    const s = take(slotId);
    s.status = "OCCUPIED";
    s.recordId = id;
  });

  // Closed history across the last few days
  const histSlots = ["B-01", "B-03", "A-07", "C-05", "D-02", "B-06", "A-12", "C-02", "D-08", "B-15"];
  for (let k = 0; k < 26; k++) {
    const v = VEHICLES[(k * 5) % VEHICLES.length];
    const exit = now - (k * 3.1 + 0.5) * HOUR;
    const entry = exit - (((k * 7) % 9) * 0.5 + 0.5) * HOUR;
    const bill = computeBill(v.type, entry, exit, defaultSettings, k === 9);
    const failed = k === 4;
    records.push({
      id: `PR-${1013 - k}`,
      vehicle: v,
      slotId: histSlots[k % histSlots.length],
      entry,
      exit,
      bill,
      payment: failed
        ? { status: "FAILED", method: "CARD", amountPaid: 0, at: exit }
        : {
            status: "SUCCESS",
            method: (["CASH", "UPI", "CARD"] as const)[k % 3],
            amountPaid: bill.total,
            txnId: `TXN${(880120 + k * 37).toString()}`,
            at: exit,
          },
    });
  }
  return { slots, records, seq };
}
