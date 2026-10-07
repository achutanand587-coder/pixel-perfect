import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { computeBill, findSlot, normalizePlate, type Requirement } from "./logic";
import { defaultSettings, makeSeed } from "./seed";
import type { ParkingRecord, ParkingSlot, PaymentMethod, Settings, SlotStatus, Vehicle } from "./types";

interface State {
  slots: ParkingSlot[];
  records: ParkingRecord[];
  settings: Settings;
  seq: number;
}

const KEY = "spms-demo-v1";

interface Ctx extends State {
  ready: boolean;
  now: number;
  active: ParkingRecord[];
  closed: ParkingRecord[];
  recommend: (v: Vehicle["type"], req: Requirement, zone?: string) => ParkingSlot | undefined;
  enter: (v: Vehicle, slotId: string) => { ok: true; record: ParkingRecord } | { ok: false; error: string };
  checkout: (recordId: string, lostTicket: boolean) => void;
  pay: (recordId: string, method: PaymentMethod, amount: number) => "SUCCESS" | "FAILED";
  setSlotStatus: (slotId: string, status: SlotStatus) => void;
  updateSettings: (s: Settings) => void;
  reset: () => void;
}

const ParkingContext = createContext<Ctx | null>(null);

export function ParkingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const t = Date.now();
    setNow(t);
    let loaded: State | null = null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) loaded = JSON.parse(raw);
    } catch {
      /* ignore */
    }
    // short delay so loading states are visible on first open
    const id = setTimeout(() => setState(loaded ?? { ...makeSeed(t), settings: defaultSettings }), 350);
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      clearTimeout(id);
      clearInterval(tick);
    };
  }, []);

  useEffect(() => {
    if (state) localStorage.setItem(KEY, JSON.stringify(state));
  }, [state]);

  const s = state ?? { slots: [], records: [], settings: defaultSettings, seq: 0 };

  const recommend = useCallback(
    (type: Vehicle["type"], req: Requirement, zone?: string) => findSlot(s.slots, type, req, zone),
    [s.slots],
  );

  const enter: Ctx["enter"] = (v, slotId) => {
    const plate = normalizePlate(v.plate);
    if (s.records.some((r) => !r.exit && r.vehicle.plate === plate))
      return { ok: false, error: `${plate} is already parked.` };
    const slot = s.slots.find((x) => x.id === slotId);
    if (!slot || slot.status !== "AVAILABLE") return { ok: false, error: `Slot ${slotId} is not available.` };
    const record: ParkingRecord = { id: `PR-${s.seq}`, vehicle: { ...v, plate }, slotId, entry: Date.now() };
    setState((p) =>
      p && {
        ...p,
        seq: p.seq + 1,
        records: [record, ...p.records],
        slots: p.slots.map((x) => (x.id === slotId ? { ...x, status: "OCCUPIED", recordId: record.id } : x)),
      },
    );
    return { ok: true, record };
  };

  const checkout: Ctx["checkout"] = (id, lost) =>
    setState((p) => {
      if (!p) return p;
      const exit = Date.now();
      return {
        ...p,
        records: p.records.map((r) =>
          r.id === id
            ? { ...r, exit, bill: computeBill(r.vehicle.type, r.entry, exit, p.settings, lost), payment: { status: "PENDING" } }
            : r,
        ),
      };
    });

  const pay: Ctx["pay"] = (id, method, amount) => {
    const rec = s.records.find((r) => r.id === id);
    const ok = !!rec?.bill && amount >= rec.bill.total;
    setState((p) =>
      p && {
        ...p,
        records: p.records.map((r) =>
          r.id === id
            ? {
                ...r,
                payment: {
                  status: ok ? "SUCCESS" : "FAILED",
                  method,
                  amountPaid: amount,
                  txnId: ok ? `TXN${Date.now().toString().slice(-6)}` : undefined,
                  at: Date.now(),
                },
              }
            : r,
        ),
        slots: ok
          ? p.slots.map((x) => (x.recordId === id ? { ...x, status: "AVAILABLE", recordId: undefined } : x))
          : p.slots,
      },
    );
    return ok ? "SUCCESS" : "FAILED";
  };

  const setSlotStatus: Ctx["setSlotStatus"] = (slotId, status) =>
    setState((p) => p && { ...p, slots: p.slots.map((x) => (x.id === slotId && x.status !== "OCCUPIED" ? { ...x, status } : x)) });

  const updateSettings = (settings: Settings) => setState((p) => p && { ...p, settings });
  const reset = () => setState({ ...makeSeed(Date.now()), settings: defaultSettings });

  // A record is "active" until payment succeeds (vehicle still occupies slot)
  const active = useMemo(() => s.records.filter((r) => r.payment?.status !== "SUCCESS"), [s.records]);
  const closed = useMemo(() => s.records.filter((r) => r.exit), [s.records]);

  return (
    <ParkingContext.Provider
      value={{ ...s, ready: !!state, now, active, closed, recommend, enter, checkout, pay, setSlotStatus, updateSettings, reset }}
    >
      {children}
    </ParkingContext.Provider>
  );
}

export function useParking() {
  const c = useContext(ParkingContext);
  if (!c) throw new Error("useParking outside provider");
  return c;
}
