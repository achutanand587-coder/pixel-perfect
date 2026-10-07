export type VehicleType = "CAR" | "BIKE" | "EV";
export type SlotType = "STANDARD" | "COMPACT" | "EV" | "ACCESSIBLE" | "VIP";
export type SlotStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED" | "MAINTENANCE";
export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED";
export type PaymentMethod = "CASH" | "CARD" | "UPI";

export interface Vehicle {
  plate: string;
  type: VehicleType;
  brand: string;
  model: string;
  owner?: string;
}

export interface ParkingSlot {
  id: string; // e.g. B-07
  zone: string;
  row: number;
  type: SlotType;
  status: SlotStatus;
  recordId?: string;
}

export interface RateCard {
  CAR: number;
  BIKE: number;
  EV: number;
}

export interface Settings {
  rates: RateCard; // per started hour
  taxPercent: number;
  lostTicketFee: number;
  facilityName: string;
}

export interface Bill {
  hours: number;
  rate: number;
  subtotal: number;
  tax: number;
  lostTicket: number;
  total: number;
}

export interface Payment {
  status: PaymentStatus;
  method?: PaymentMethod;
  amountPaid?: number;
  txnId?: string;
  at?: number;
}

export interface ParkingRecord {
  id: string;
  vehicle: Vehicle;
  slotId: string;
  entry: number;
  exit?: number;
  bill?: Bill;
  payment?: Payment;
}
