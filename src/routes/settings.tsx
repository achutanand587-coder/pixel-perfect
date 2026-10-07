import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useParking } from "@/lib/parking/store";
import type { Settings, SlotType } from "@/lib/parking/types";
import { PageHeader, PageSkeleton, Panel, Row, slotTypeMeta } from "@/components/parking/ui";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Smart Parking Management System" },
      { name: "description", content: "Parking configuration, rate cards, tax and lost-ticket surcharge." },
      { property: "og:title", content: "Settings — Smart Parking" },
      { property: "og:description", content: "Configure rates, charges and facility details." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const p = useParking();
  const [f, setF] = useState<Settings>(p.settings);
  useEffect(() => setF(p.settings), [p.settings]);
  if (!p.ready) return <PageSkeleton />;

  const num = (v: string) => Math.max(0, Number(v) || 0);
  const save = () => { p.updateSettings(f); toast.success("Settings saved"); };
  const counts = (Object.keys(slotTypeMeta) as SlotType[]).map((t) => [t, p.slots.filter((s) => s.type === t).length] as const);

  return (
    <>
      <PageHeader eyebrow="System" title="Settings">
        <Button variant="outline" onClick={() => { p.reset(); toast.message("Demo data reset"); }}><RotateCcw />Reset demo data</Button>
        <Button onClick={save}><Save />Save changes</Button>
      </PageHeader>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Billing configuration">
          <div className="grid gap-3 sm:grid-cols-3">
            {(["CAR", "BIKE", "EV"] as const).map((k) => (
              <div key={k}><Label htmlFor={k}>{k === "EV" ? "EV" : k[0] + k.slice(1).toLowerCase()} · ₹/hour</Label>
                <Input id={k} type="number" className="mt-1.5 font-mono" value={f.rates[k]} onChange={(e) => setF({ ...f, rates: { ...f.rates, [k]: num(e.target.value) } })} /></div>
            ))}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div><Label htmlFor="tax">Tax / charges (%)</Label><Input id="tax" type="number" className="mt-1.5 font-mono" value={f.taxPercent} onChange={(e) => setF({ ...f, taxPercent: num(e.target.value) })} /></div>
            <div><Label htmlFor="lost">Lost-ticket surcharge (₹)</Label><Input id="lost" type="number" className="mt-1.5 font-mono" value={f.lostTicketFee} onChange={(e) => setF({ ...f, lostTicketFee: num(e.target.value) })} /></div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Billed per started hour, minimum one hour. Tax applies to parking and surcharge.</p>
        </Panel>
        <Panel title="Parking configuration">
          <div className="divide-y">
            <Row k="Total slots" v={p.slots.length} />
            <Row k="Zones" v="A · B · C (EV) · D (two-wheeler)" />
            {counts.map(([t, n]) => <Row key={t} k={slotTypeMeta[t].label} v={n} />)}
          </div>
        </Panel>
        <Panel title="System" className="lg:col-span-2">
          <div className="grid gap-x-8 sm:grid-cols-2">
            <div><Label htmlFor="fac">Facility name</Label><Input id="fac" className="mt-1.5" value={f.facilityName} onChange={(e) => setF({ ...f, facilityName: e.target.value })} /></div>
            <div className="divide-y">
              <Row k="Application" v="Smart Parking Management System · CB2006" />
              <Row k="Data source" v="Demo data (this browser)" />
              <Row k="Payments" v="Simulated" />
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}
