import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { CarFront, LogOut, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useParking } from "@/lib/parking/store";
import { computeBill, formatDuration, inr, normalizePlate } from "@/lib/parking/logic";
import { EmptyState, PageHeader, PageSkeleton, Panel, PaymentBadge, Plate, Row, fmtTime, vehicleMeta } from "@/components/parking/ui";

export const Route = createFileRoute("/vehicles")({
  validateSearch: (s: Record<string, unknown>) => ({ plate: typeof s.plate === "string" ? s.plate : undefined }),
  head: () => ({
    meta: [
      { title: "Vehicle Details — Smart Parking Management System" },
      { name: "description", content: "Vehicle profile with current parking status, live bill and history." },
      { property: "og:title", content: "Vehicle Details — Smart Parking" },
      { property: "og:description", content: "Operational profile for each registered vehicle." },
    ],
  }),
  component: Vehicles,
});

function Vehicles() {
  const p = useParking();
  const { plate } = Route.useSearch();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  if (!p.ready) return <PageSkeleton />;

  const vehicles = new Map<string, (typeof p.records)[number]["vehicle"]>();
  [...p.records].sort((a, b) => b.entry - a.entry).forEach((r) => !vehicles.has(r.vehicle.plate) && vehicles.set(r.vehicle.plate, r.vehicle));
  const list = [...vehicles.values()].filter((v) => v.plate.includes(normalizePlate(q)));
  const current = plate ?? list[0]?.plate;
  const v = current ? vehicles.get(current) : undefined;
  const hist = p.records.filter((r) => r.vehicle.plate === current).sort((a, b) => b.entry - a.entry);
  const active = hist.find((r) => r.payment?.status !== "SUCCESS");

  return (
    <>
      <PageHeader eyebrow="Monitor" title="Vehicle Details" />
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Panel className="lg:max-h-[75vh] lg:overflow-auto">
          <div className="relative mb-3"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search plate" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <ul className="space-y-1">
            {list.map((x) => {
              const parked = p.active.some((r) => r.vehicle.plate === x.plate);
              return (
                <li key={x.plate}>
                  <button onClick={() => nav({ to: "/vehicles", search: { plate: x.plate } })}
                    className={cn("flex w-full items-center justify-between rounded-lg px-2 py-2 text-left transition-colors", x.plate === current ? "bg-secondary" : "hover:bg-muted")}>
                    <span><Plate plate={x.plate} size="sm" /><span className="mt-0.5 block text-xs text-muted-foreground">{x.brand} {x.model}</span></span>
                    {parked && <span className="size-2 rounded-full bg-available" aria-label="Parked" />}
                  </button>
                </li>
              );
            })}
            {list.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No vehicles found</p>}
          </ul>
        </Panel>

        {!v ? (
          <EmptyState icon={CarFront} title="No vehicle selected" text="Pick a vehicle from the list or register one at the entry gate." action={<Button asChild><Link to="/entry">New entry</Link></Button>} />
        ) : (
          <div className="space-y-4">
            <section className="bg-hero rounded-2xl p-6 text-primary-foreground shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] opacity-80">{vehicleMeta[v.type].label} · {v.brand}</p>
                  <h2 className="mt-1 text-3xl font-bold">{v.model}</h2>
                  <div className="mt-3"><Plate plate={v.plate} size="lg" /></div>
                  {v.owner && <p className="mt-2 text-sm opacity-80">Owner: {v.owner}</p>}
                </div>
                <div className="rounded-xl bg-primary-foreground/10 p-4 text-right">
                  <div className="text-xs opacity-80">Status</div>
                  <div className="font-display text-xl font-bold">{active ? (active.exit ? "Awaiting payment" : "Parked") : "Not on site"}</div>
                  {active && <div className="mt-1 font-mono text-sm">Bay {active.slotId}</div>}
                </div>
              </div>
            </section>
            {active && (
              <Panel title="Current session">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div><div className="text-xs text-muted-foreground">Entry time</div><div className="font-display text-lg font-bold">{fmtTime(active.entry)}</div></div>
                  <div><div className="text-xs text-muted-foreground">Duration</div><div className="font-display text-lg font-bold">{formatDuration((active.exit ?? p.now) - active.entry)}</div></div>
                  <div><div className="text-xs text-muted-foreground">Estimated bill</div><div className="font-display text-lg font-bold text-primary">{inr(active.bill?.total ?? computeBill(v.type, active.entry, p.now, p.settings).total)}</div></div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild variant="outline"><Link to="/parking" search={{ highlight: active.slotId }}><MapPin />Show on map</Link></Button>
                  <Button asChild><Link to="/exit" search={{ id: active.id }}><LogOut />Exit & bill</Link></Button>
                </div>
              </Panel>
            )}
            <Panel title={`Parking history · ${hist.length}`}>
              <ul className="divide-y">
                {hist.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                    <span className="font-mono text-xs text-muted-foreground">{r.id}</span>
                    <span>Bay <b>{r.slotId}</b></span>
                    <span className="text-muted-foreground">{fmtTime(r.entry)}</span>
                    <span>{formatDuration((r.exit ?? p.now) - r.entry)}</span>
                    <span className="font-semibold">{r.bill ? inr(r.bill.total) : "—"}</span>
                    <PaymentBadge status={r.payment?.status} />
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        )}
      </div>
    </>
  );
}
