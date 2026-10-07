import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Check, CircleCheck, MapPin, SearchX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useParking } from "@/lib/parking/store";
import { inr, normalizePlate, type Requirement } from "@/lib/parking/logic";
import type { ParkingRecord, ParkingSlot, VehicleType } from "@/lib/parking/types";
import { EmptyState, PageHeader, PageSkeleton, Panel, Plate, Row, slotTypeMeta, vehicleMeta } from "@/components/parking/ui";

export const Route = createFileRoute("/entry")({
  head: () => ({
    meta: [
      { title: "Vehicle Entry — Smart Parking Management System" },
      { name: "description", content: "Register a vehicle and get an automatically recommended parking slot." },
      { property: "og:title", content: "Vehicle Entry — Smart Parking" },
      { property: "og:description", content: "Guided vehicle registration with intelligent slot allocation." },
    ],
  }),
  component: Entry,
});

const STEPS = ["Vehicle", "Requirements", "Allocation", "Done"];
const PLATE_RE = /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}$/;

function Entry() {
  const p = useParking();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [plate, setPlate] = useState("");
  const [type, setType] = useState<VehicleType>("CAR");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [owner, setOwner] = useState("");
  const [req, setReq] = useState<Requirement>("NONE");
  const [zone, setZone] = useState("");
  const [slot, setSlot] = useState<ParkingSlot | undefined>();
  const [done, setDone] = useState<ParkingRecord | null>(null);
  const [err, setErr] = useState("");

  if (!p.ready) return <PageSkeleton />;
  const np = normalizePlate(plate);

  const next0 = () => {
    if (!PLATE_RE.test(np)) return setErr("Enter a valid registration number, e.g. MH12AB1234.");
    if (!brand.trim() || !model.trim()) return setErr("Brand and model are required.");
    if (p.active.some((r) => r.vehicle.plate === np)) return setErr(`${np} is already parked inside.`);
    setErr(""); setStep(1);
  };
  const find = () => { setSlot(p.recommend(type, req, zone || undefined)); setStep(2); };
  const confirm = () => {
    if (!slot) return;
    const res = p.enter({ plate: np, type, brand: brand.trim(), model: model.trim(), owner: owner.trim() || undefined }, slot.id);
    if (!res.ok) return toast.error(res.error);
    setDone(res.record); setStep(3);
    toast.success(`Vehicle successfully assigned to slot ${slot.id}`);
  };
  const restart = () => { setStep(0); setPlate(""); setBrand(""); setModel(""); setOwner(""); setReq("NONE"); setZone(""); setSlot(undefined); setDone(null); };

  return (
    <>
      <PageHeader eyebrow="Flow A" title="Vehicle Entry" />
      <ol className="mb-6 flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className={cn("flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
            i === step ? "border-primary bg-primary text-primary-foreground" : i < step ? "bg-secondary text-secondary-foreground" : "bg-card text-muted-foreground")}>
            <span className="grid size-5 place-items-center rounded-full bg-background/20 font-mono text-[11px]">{i < step ? <Check className="size-3" /> : i + 1}</span>{s}
          </li>
        ))}
      </ol>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel>
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <Label htmlFor="plate">Registration number</Label>
                <Input id="plate" value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} placeholder="MH12AB1234"
                  className="mt-1.5 h-14 border-2 font-mono text-2xl tracking-widest" autoFocus />
              </div>
              <div>
                <Label>Vehicle type</Label>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {(Object.keys(vehicleMeta) as VehicleType[]).map((t) => {
                    const M = vehicleMeta[t];
                    return (
                      <button key={t} type="button" onClick={() => setType(t)}
                        className={cn("flex flex-col items-center gap-1 rounded-xl border-2 py-4 text-sm font-semibold transition-all", type === t ? "border-primary bg-secondary" : "hover:border-sage")}>
                        <M.icon className="size-6" />{M.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label htmlFor="brand">Brand</Label><Input id="brand" className="mt-1.5" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Hyundai" /></div>
                <div><Label htmlFor="model">Model</Label><Input id="model" className="mt-1.5" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Creta" /></div>
              </div>
              <div><Label htmlFor="owner">Owner / customer (optional)</Label><Input id="owner" className="mt-1.5" value={owner} onChange={(e) => setOwner(e.target.value)} /></div>
              {err && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
              <Button size="lg" className="w-full" onClick={next0}>Continue</Button>
            </div>
          )}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <Label>Parking requirement</Label>
                <div className="mt-1.5 grid gap-2 sm:grid-cols-3">
                  {([["NONE", "None", "Best matching bay"], ["ACCESSIBLE", "Accessible", "Wider bay near lift"], ["VIP", "VIP", "Reserved VIP bays"]] as const).map(([k, l, d]) => (
                    <button key={k} type="button" onClick={() => setReq(k)} className={cn("rounded-xl border-2 p-3 text-left transition-all", req === k ? "border-primary bg-secondary" : "hover:border-sage")}>
                      <div className="font-semibold">{l}</div><div className="text-xs text-muted-foreground">{d}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Preferred zone</Label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {["", "A", "B", "C", "D"].map((z) => (
                    <Button key={z} type="button" variant={zone === z ? "default" : "outline"} size="sm" onClick={() => setZone(z)}>{z ? `Zone ${z}` : "Any"}</Button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2"><Button variant="outline" onClick={() => setStep(0)}>Back</Button><Button className="flex-1" size="lg" onClick={find}>Find suitable slot</Button></div>
            </div>
          )}
          {step === 2 && (
            slot ? (
              <div className="space-y-5 text-center">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">Recommended slot</p>
                <div className="mx-auto grid w-48 place-items-center rounded-2xl border-4 border-dashed border-available bg-available/10 py-8 animate-in zoom-in-90">
                  <span className="font-display text-6xl font-bold text-available">{slot.id}</span>
                  <span className="mt-1 text-sm font-medium">{slotTypeMeta[slot.type].label} · Zone {slot.zone}</span>
                </div>
                <div className="flex gap-2"><Button variant="outline" onClick={() => setStep(1)}>Change</Button><Button size="lg" className="flex-1" onClick={confirm}><CircleCheck />Confirm entry</Button></div>
              </div>
            ) : (
              <EmptyState icon={SearchX} title="No suitable slot available" text="Every compatible bay is taken. Try another zone or requirement."
                action={<Button variant="outline" onClick={() => setStep(1)}>Adjust requirements</Button>} />
            )
          )}
          {step === 3 && done && (
            <div className="space-y-4 text-center">
              <span className="mx-auto grid size-16 place-items-center rounded-full bg-available/15 text-available animate-in zoom-in"><CircleCheck className="size-8" /></span>
              <h2 className="text-2xl font-bold">Vehicle successfully assigned to slot {done.slotId}</h2>
              <p className="text-sm text-muted-foreground">Record {done.id} · entry logged at {new Date(done.entry).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="outline" onClick={restart}>Register another</Button>
                <Button onClick={() => nav({ to: "/parking", search: { highlight: done.slotId } })}><MapPin />View on live map</Button>
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Entry summary">
          <div className="mb-3">{np ? <Plate plate={np} size="lg" /> : <span className="text-sm text-muted-foreground">No plate entered yet</span>}</div>
          <div className="divide-y">
            <Row k="Type" v={vehicleMeta[type].label} />
            <Row k="Vehicle" v={brand || model ? `${brand} ${model}` : "—"} />
            <Row k="Requirement" v={req === "NONE" ? "None" : req.toLowerCase()} />
            <Row k="Zone" v={zone || "Any"} />
            <Row k="Slot" v={slot?.id ?? "—"} />
            <Row k="Rate" v={`${inr(p.settings.rates[type])} / hour`} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Bikes go to compact bays, EVs prefer EV bays, cars use standard bays. <Link to="/settings" className="underline">Rates</Link></p>
        </Panel>
      </div>
    </>
  );
}
