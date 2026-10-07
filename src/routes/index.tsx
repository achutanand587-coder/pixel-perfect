import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowRight, Car, Clock, IndianRupee, LogIn, LogOut, ParkingSquare, SquareParking } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useParking } from "@/lib/parking/store";
import { formatDuration, HOUR, inr } from "@/lib/parking/logic";
import { EmptyState, Kpi, PageHeader, PageSkeleton, Panel, Plate } from "@/components/parking/ui";
import { ZoneBlock, Legend } from "@/components/parking/SlotMap";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Operations Dashboard — Smart Parking Management System" },
      { name: "description", content: "Live occupancy, today's entries, exits and parking revenue at a glance." },
      { property: "og:title", content: "Operations Dashboard — Smart Parking" },
      { property: "og:description", content: "Live occupancy, entries, exits and revenue for the parking facility." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const p = useParking();
  const stats = useMemo(() => {
    const dayStart = new Date(p.now).setHours(0, 0, 0, 0);
    const occupied = p.slots.filter((s) => s.status === "OCCUPIED").length;
    const avail = p.slots.filter((s) => s.status === "AVAILABLE").length;
    const usable = p.slots.filter((s) => s.status !== "MAINTENANCE").length;
    const exitsToday = p.closed.filter((r) => r.exit! >= dayStart);
    const entriesToday = p.records.filter((r) => r.entry >= dayStart).length;
    const revenue = exitsToday.filter((r) => r.payment?.status === "SUCCESS").reduce((a, r) => a + (r.bill?.total ?? 0), 0);
    const avg = p.closed.length ? p.closed.reduce((a, r) => a + (r.exit! - r.entry), 0) / p.closed.length : 0;
    // hourly occupancy-ish: entries per hour for last 12h
    const bars = Array.from({ length: 12 }, (_, i) => {
      const from = p.now - (12 - i) * HOUR;
      return p.records.filter((r) => r.entry >= from && r.entry < from + HOUR).length + p.closed.filter((r) => r.exit! >= from && r.exit! < from + HOUR).length;
    });
    return { occupied, avail, usable, exitsToday: exitsToday.length, entriesToday, revenue, avg, pct: usable ? Math.round((occupied / usable) * 100) : 0, bars };
  }, [p.slots, p.records, p.closed, p.now]);

  if (!p.ready) return <PageSkeleton />;
  const recMap = new Map(p.records.map((r) => [r.id, r]));
  const recent = [...p.records].sort((a, b) => (b.exit ?? b.entry) - (a.exit ?? a.entry)).slice(0, 7);
  const maxBar = Math.max(1, ...stats.bars);

  return (
    <>
      <PageHeader eyebrow="VIT Pune • CB2006 • Automated Parking Operations" title="Operations Dashboard">
        <Button asChild variant="outline"><Link to="/exit"><LogOut />Process exit</Link></Button>
        <Button asChild><Link to="/entry"><LogIn />New entry</Link></Button>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_2fr]">
        <section className="bg-hero relative overflow-hidden rounded-2xl p-6 text-primary-foreground shadow-soft">
          <div className="bay-lines absolute inset-y-0 right-0 w-1/2 opacity-20 [background-size:48px_100%]" />
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] opacity-80">Current occupancy</p>
          <div className="mt-2 font-display text-7xl font-bold">{stats.pct}<span className="text-3xl">%</span></div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-primary-foreground/20">
            <div className="h-full rounded-full bg-primary-foreground transition-all duration-700" style={{ width: `${stats.pct}%` }} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
            <div><div className="font-display text-xl font-bold">{p.slots.length}</div><div className="opacity-75">Capacity</div></div>
            <div><div className="font-display text-xl font-bold">{stats.avail}</div><div className="opacity-75">Available</div></div>
            <div><div className="font-display text-xl font-bold">{stats.occupied}</div><div className="opacity-75">Occupied</div></div>
          </div>
        </section>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <Kpi label="Active sessions" value={p.active.length} hint="vehicles inside" icon={Car} tone="primary" />
          <Kpi label="Entries today" value={stats.entriesToday} icon={LogIn} />
          <Kpi label="Exits today" value={stats.exitsToday} icon={LogOut} />
          <Kpi label="Revenue today" value={inr(stats.revenue)} hint="paid sessions" icon={IndianRupee} tone="good" />
          <Kpi label="Avg. duration" value={formatDuration(stats.avg)} icon={Clock} />
          <Kpi label="Free bays" value={stats.avail} hint={`of ${stats.usable} in service`} icon={SquareParking} tone="good" />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Panel title="Availability by zone" action={<Button asChild variant="ghost" size="sm"><Link to="/parking">Open live map <ArrowRight /></Link></Button>}>
          <div className="grid gap-3 md:grid-cols-2">
            {["A", "B", "C", "D"].map((z) => (
              <ZoneBlock key={z} zone={z} compact slots={p.slots.filter((s) => s.zone === z)} records={recMap} now={p.now} />
            ))}
          </div>
          <div className="mt-4"><Legend /></div>
        </Panel>
        <div className="space-y-4">
          <Panel title="Movements · last 12 hours">
            <div className="flex h-28 items-end gap-1.5">
              {stats.bars.map((b, i) => (
                <div key={i} className="flex-1 rounded-t bg-sage transition-all hover:bg-primary" style={{ height: `${(b / maxBar) * 100}%`, minHeight: 4 }} title={`${b} movements`} />
              ))}
            </div>
            <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground"><span>-12h</span><span>now</span></div>
          </Panel>
          <Panel title="Recent activity" action={<Link to="/history" className="text-xs font-medium text-primary hover:underline">All sessions</Link>}>
            {recent.length === 0 ? (
              <EmptyState icon={ParkingSquare} title="No activity yet" text="Entries and exits will appear here." />
            ) : (
              <ul className="space-y-2.5">
                {recent.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2">
                    <Link to="/vehicles" search={{ plate: r.vehicle.plate }} className="hover:opacity-80"><Plate plate={r.vehicle.plate} size="sm" /></Link>
                    <span className="text-xs text-muted-foreground">
                      {r.exit ? <span className="text-foreground">exited</span> : <span className="font-semibold text-available">entered</span>} · {r.slotId} · {formatDuration(p.now - (r.exit ?? r.entry))} ago
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
