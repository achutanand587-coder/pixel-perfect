import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowUpDown, History, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useParking } from "@/lib/parking/store";
import { formatDuration, inr, normalizePlate } from "@/lib/parking/logic";
import type { ParkingRecord } from "@/lib/parking/types";
import { EmptyState, PageHeader, PageSkeleton, Panel, PaymentBadge, Plate, Row, fmtTime, vehicleMeta } from "@/components/parking/ui";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Session History — Smart Parking Management System" },
      { name: "description", content: "Search, filter and sort completed parking sessions and payments." },
      { property: "og:title", content: "Session History — Smart Parking" },
      { property: "og:description", content: "Every completed parking session with billing and payment status." },
    ],
  }),
  component: HistoryPage,
});

type SortKey = "exit" | "duration" | "amount";

function HistoryPage() {
  const p = useParking();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState<SortKey>("exit");
  const [desc, setDesc] = useState(true);
  const [open, setOpen] = useState<ParkingRecord | null>(null);

  const rows = useMemo(() => {
    const nq = normalizePlate(q);
    const f = from ? new Date(from).getTime() : 0;
    const t = to ? new Date(to).getTime() + 86_400_000 : Infinity;
    const val = (r: ParkingRecord) => (sort === "exit" ? r.exit! : sort === "duration" ? r.exit! - r.entry : r.bill?.total ?? 0);
    return p.closed
      .filter((r) => (!nq || r.vehicle.plate.includes(nq) || r.id.includes(q.toUpperCase()) || r.slotId.includes(q.toUpperCase())) && (status === "ALL" || r.payment?.status === status) && r.exit! >= f && r.exit! < t)
      .sort((a, b) => (desc ? val(b) - val(a) : val(a) - val(b)));
  }, [p.closed, q, status, from, to, sort, desc]);

  if (!p.ready) return <PageSkeleton />;
  const total = rows.filter((r) => r.payment?.status === "SUCCESS").reduce((a, r) => a + (r.bill?.total ?? 0), 0);
  const toggle = (k: SortKey) => (sort === k ? setDesc(!desc) : (setSort(k), setDesc(true)));
  const SortBtn = ({ k, children }: { k: SortKey; children: string }) => (
    <button onClick={() => toggle(k)} className="inline-flex items-center gap-1 hover:text-foreground">{children}<ArrowUpDown className="size-3" /></button>
  );

  return (
    <>
      <PageHeader eyebrow="Flow D" title="Session History" />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Panel><div className="text-xs text-muted-foreground">Sessions shown</div><div className="font-display text-2xl font-bold">{rows.length}</div></Panel>
        <Panel><div className="text-xs text-muted-foreground">Collected</div><div className="font-display text-2xl font-bold text-primary">{inr(total)}</div></Panel>
        <Panel><div className="text-xs text-muted-foreground">Failed / pending</div><div className="font-display text-2xl font-bold">{rows.filter((r) => r.payment?.status !== "SUCCESS").length}</div></Panel>
      </div>
      <Panel>
        <div className="mb-4 flex flex-wrap gap-2">
          <div className="relative min-w-52 flex-1"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input className="pl-9" placeholder="Plate, record ID or slot" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40" aria-label="Payment status"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="ALL">All payments</SelectItem><SelectItem value="SUCCESS">Paid</SelectItem><SelectItem value="PENDING">Pending</SelectItem><SelectItem value="FAILED">Failed</SelectItem></SelectContent>
          </Select>
          <Input type="date" className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
          <Input type="date" className="w-40" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
          {(q || status !== "ALL" || from || to) && <Button variant="ghost" onClick={() => { setQ(""); setStatus("ALL"); setFrom(""); setTo(""); }}>Clear</Button>}
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={History} title="No sessions found" text="Nothing matches your search or filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 font-medium">Record</th><th className="font-medium">Vehicle</th><th className="font-medium">Slot</th>
                  <th className="font-medium">Entry</th><th className="font-medium"><SortBtn k="exit">Exit</SortBtn></th>
                  <th className="font-medium"><SortBtn k="duration">Duration</SortBtn></th><th className="text-right font-medium"><SortBtn k="amount">Bill</SortBtn></th><th className="pl-4 font-medium">Payment</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} onClick={() => setOpen(r)} className="cursor-pointer border-b transition-colors last:border-0 hover:bg-muted/60">
                    <td className="py-2.5 font-mono text-xs">{r.id}</td>
                    <td><Plate plate={r.vehicle.plate} size="sm" /></td>
                    <td className="font-semibold">{r.slotId}</td>
                    <td className="text-muted-foreground">{fmtTime(r.entry)}</td>
                    <td className="text-muted-foreground">{fmtTime(r.exit)}</td>
                    <td>{formatDuration(r.exit! - r.entry)}</td>
                    <td className="text-right font-semibold">{r.bill ? inr(r.bill.total) : "—"}</td>
                    <td className="pl-4"><PaymentBadge status={r.payment?.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent>
          {open && (
            <>
              <SheetHeader><SheetTitle>Session {open.id}</SheetTitle></SheetHeader>
              <div className="px-4">
                <Plate plate={open.vehicle.plate} size="lg" />
                <p className="mt-1 text-sm text-muted-foreground">{vehicleMeta[open.vehicle.type].label} · {open.vehicle.brand} {open.vehicle.model}</p>
                <div className="mt-4 divide-y">
                  <Row k="Slot" v={open.slotId} />
                  <Row k="Entry" v={fmtTime(open.entry)} />
                  <Row k="Exit" v={fmtTime(open.exit)} />
                  <Row k="Duration" v={formatDuration(open.exit! - open.entry)} />
                  {open.bill && <>
                    <Row k={`${open.bill.hours} h × ${inr(open.bill.rate)}`} v={inr(open.bill.subtotal)} />
                    {open.bill.lostTicket > 0 && <Row k="Lost ticket" v={inr(open.bill.lostTicket)} />}
                    <Row k="Tax" v={inr(open.bill.tax)} />
                    <Row k="Total" v={inr(open.bill.total)} strong />
                  </>}
                  <Row k="Payment" v={<PaymentBadge status={open.payment?.status} />} />
                  <Row k="Method" v={open.payment?.method ?? "—"} />
                  <Row k="Transaction" v={<span className="font-mono">{open.payment?.txnId ?? "—"}</span>} />
                </div>
                <Button asChild variant="outline" className="mt-4 w-full"><Link to="/vehicles" search={{ plate: open.vehicle.plate }}>Vehicle profile</Link></Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
