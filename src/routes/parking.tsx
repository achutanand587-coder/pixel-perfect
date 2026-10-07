import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { LogOut, MapPinOff, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useParking } from "@/lib/parking/store";
import { formatDuration, inr, computeBill } from "@/lib/parking/logic";
import type { ParkingSlot, SlotStatus, SlotType } from "@/lib/parking/types";
import { EmptyState, PageHeader, PageSkeleton, Panel, Plate, Row, SlotStatusBadge, fmtTime, slotTypeMeta, vehicleMeta } from "@/components/parking/ui";
import { Legend, ZoneBlock } from "@/components/parking/SlotMap";

export const Route = createFileRoute("/parking")({
  validateSearch: (s: Record<string, unknown>): { highlight?: string } => ({ highlight: typeof s.highlight === "string" ? s.highlight : undefined }),
  head: () => ({
    meta: [
      { title: "Live Parking Map — Smart Parking Management System" },
      { name: "description", content: "Zone-by-zone 2D map of available, occupied, reserved and maintenance bays." },
      { property: "og:title", content: "Live Parking Map — Smart Parking" },
      { property: "og:description", content: "Interactive 2D map of every parking bay and its status." },
    ],
  }),
  component: LiveMap,
});

function LiveMap() {
  const p = useParking();
  const { highlight } = Route.useSearch();
  const [status, setStatus] = useState<"ALL" | SlotStatus>("ALL");
  const [type, setType] = useState<"ALL" | SlotType>("ALL");
  const [zone, setZone] = useState("ALL");
  const [sel, setSel] = useState<ParkingSlot | null>(null);
  const recMap = useMemo(() => new Map(p.records.map((r) => [r.id, r])), [p.records]);

  if (!p.ready) return <PageSkeleton />;
  const filtered = p.slots.filter((s) => (status === "ALL" || s.status === status) && (type === "ALL" || s.type === type));
  const zones = ["A", "B", "C", "D"].filter((z) => zone === "ALL" || z === zone);
  const selSlot = sel ? p.slots.find((s) => s.id === sel.id)! : null;
  const rec = selSlot?.recordId ? recMap.get(selSlot.recordId) : undefined;

  return (
    <>
      <PageHeader eyebrow="Monitor" title="Live Parking Map">
        <Button asChild><Link to="/entry">Allocate a slot</Link></Button>
      </PageHeader>
      <Panel className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <F label="Availability" value={status} onChange={(v) => setStatus(v as never)} items={[["ALL", "All statuses"], ["AVAILABLE", "Available"], ["OCCUPIED", "Occupied"], ["RESERVED", "Reserved"], ["MAINTENANCE", "Maintenance"]]} />
          <F label="Slot type" value={type} onChange={(v) => setType(v as never)} items={[["ALL", "All types"], ...Object.entries(slotTypeMeta).map(([k, m]) => [k, m.label] as [string, string])]} />
          <F label="Zone" value={zone} onChange={setZone} items={[["ALL", "All zones"], ["A", "Zone A"], ["B", "Zone B"], ["C", "Zone C · EV"], ["D", "Zone D · 2W"]]} />
          <div className="ml-auto"><Legend /></div>
        </div>
      </Panel>
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          {zones.map((z) => {
            const zs = filtered.filter((s) => s.zone === z);
            return zs.length ? <ZoneBlock key={z} zone={z} slots={zs} records={recMap} now={p.now} selectedId={selSlot?.id} highlightId={highlight} onSelect={setSel} /> : null;
          })}
          {filtered.length === 0 && <EmptyState icon={MapPinOff} title="No bays match these filters" text="Try clearing a filter to see more of the facility." />}
        </div>
        <div className="xl:sticky xl:top-6 xl:self-start">
          {!selSlot ? (
            <EmptyState icon={MapPinOff} title="Select a bay" text="Click any slot on the map to see its status and session." />
          ) : (
            <Panel title={`Bay ${selSlot.id}`} action={<button aria-label="Close" onClick={() => setSel(null)}><X className="size-4" /></button>}>
              <div className="mb-3 flex flex-wrap gap-2"><SlotStatusBadge status={selSlot.status} /><span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">{slotTypeMeta[selSlot.type].label}</span></div>
              {rec ? (
                <>
                  <Plate plate={rec.vehicle.plate} size="lg" />
                  <div className="mt-3 divide-y">
                    <Row k="Vehicle" v={`${vehicleMeta[rec.vehicle.type].label} · ${rec.vehicle.brand} ${rec.vehicle.model}`} />
                    <Row k="Entry" v={fmtTime(rec.entry)} />
                    <Row k="Duration" v={formatDuration(p.now - rec.entry)} />
                    <Row k="Estimated bill" v={inr(computeBill(rec.vehicle.type, rec.entry, p.now, p.settings).total)} strong />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button asChild variant="outline"><Link to="/vehicles" search={{ plate: rec.vehicle.plate }}>Details</Link></Button>
                    <Button asChild><Link to="/exit" search={{ id: rec.id }}><LogOut />Exit</Link></Button>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">No vehicle in this bay.</p>
                  {selSlot.status !== "OCCUPIED" && (
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      {(["AVAILABLE", "RESERVED", "MAINTENANCE"] as const).map((st) => (
                        <Button key={st} size="sm" variant={selSlot.status === st ? "default" : "outline"}
                          onClick={() => { p.setSlotStatus(selSlot.id, st); toast.success(`${selSlot.id} marked ${st.toLowerCase()}`); }}>
                          {st === "AVAILABLE" ? "Open" : st === "RESERVED" ? "Reserve" : "Maint."}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}

function F({ label, value, onChange, items }: { label: string; value: string; onChange: (v: string) => void; items: [string, string][] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-44 bg-card" aria-label={label}><SelectValue /></SelectTrigger>
      <SelectContent>{items.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
    </Select>
  );
}
