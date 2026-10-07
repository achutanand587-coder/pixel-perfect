import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Ban, CircleCheck, CreditCard, IndianRupee, ParkingSquare, ReceiptText, Smartphone, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useParking } from "@/lib/parking/store";
import { computeBill, formatDuration, inr } from "@/lib/parking/logic";
import type { PaymentMethod } from "@/lib/parking/types";
import { EmptyState, PageHeader, PageSkeleton, Panel, PaymentBadge, Plate, Row, fmtTime, vehicleMeta } from "@/components/parking/ui";

export const Route = createFileRoute("/exit")({
  validateSearch: (s: Record<string, unknown>) => ({ id: typeof s.id === "string" ? s.id : undefined }),
  head: () => ({
    meta: [
      { title: "Exit & Billing — Smart Parking Management System" },
      { name: "description", content: "Calculate duration, review the bill, take payment and release the bay." },
      { property: "og:title", content: "Exit & Billing — Smart Parking" },
      { property: "og:description", content: "Automated billing and checkout for parked vehicles." },
    ],
  }),
  component: Exit,
});

const METHODS: { k: PaymentMethod; l: string; icon: typeof Wallet }[] = [
  { k: "CASH", l: "Cash", icon: Wallet },
  { k: "UPI", l: "UPI", icon: Smartphone },
  { k: "CARD", l: "Card", icon: CreditCard },
];

function Exit() {
  const p = useParking();
  const { id } = Route.useSearch();
  const nav = useNavigate();
  const [lost, setLost] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [amount, setAmount] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [paidId, setPaidId] = useState<string | null>(null);

  if (!p.ready) return <PageSkeleton />;
  const rec = p.records.find((r) => r.id === (paidId ?? id));
  const queue = p.active.slice().sort((a, b) => a.entry - b.entry);
  const estimate = rec && !rec.bill ? computeBill(rec.vehicle.type, rec.entry, p.now, p.settings, lost) : undefined;
  const bill = rec?.bill ?? estimate;

  const select = (rid: string) => { setLost(false); setAmount(""); setPaidId(null); nav({ to: "/exit", search: { id: rid } }); };
  const generate = () => { if (rec) { p.checkout(rec.id, lost); setConfirmOpen(false); toast.message(`Bill generated for ${rec.vehicle.plate}`); } };
  const doPay = () => {
    if (!rec?.bill) return;
    const amt = Number(amount || 0);
    const res = p.pay(rec.id, method, amt);
    if (res === "SUCCESS") { setPaidId(rec.id); toast.success(`Payment received · ${rec.slotId} is now available`); }
    else toast.error(`Payment failed — amount is less than ${inr(rec.bill.total)}`);
  };

  return (
    <>
      <PageHeader eyebrow="Flow C" title="Exit & Billing" />
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <Panel title={`Active vehicles · ${queue.length}`} className="lg:max-h-[75vh] lg:overflow-auto">
          {queue.length === 0 ? (
            <EmptyState icon={ParkingSquare} title="No active parking sessions" text="Vehicles appear here once they enter." />
          ) : (
            <ul className="space-y-1">
              {queue.map((r) => (
                <li key={r.id}>
                  <button onClick={() => select(r.id)} className={cn("flex w-full items-center justify-between rounded-lg px-2 py-2 text-left transition-colors", r.id === rec?.id ? "bg-secondary" : "hover:bg-muted")}>
                    <span><Plate plate={r.vehicle.plate} size="sm" /><span className="mt-0.5 block text-xs text-muted-foreground">Bay {r.slotId} · {formatDuration(p.now - r.entry)}</span></span>
                    {r.payment && <PaymentBadge status={r.payment.status} />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {!rec || !bill ? (
          <EmptyState icon={ReceiptText} title="Select a vehicle to check out" text="Choose an active vehicle on the left, or pick one from the live map." action={<Button asChild variant="outline"><Link to="/parking">Open live map</Link></Button>} />
        ) : rec.payment?.status === "SUCCESS" ? (
          <Panel>
            <div className="py-6 text-center">
              <span className="mx-auto grid size-16 place-items-center rounded-full bg-available/15 text-available animate-in zoom-in"><CircleCheck className="size-8" /></span>
              <h2 className="mt-3 text-2xl font-bold">Checkout complete</h2>
              <p className="mt-1 text-sm text-muted-foreground">Bay {rec.slotId} has been released and is now available.</p>
              <div className="mx-auto mt-5 max-w-sm divide-y rounded-xl border p-4 text-left">
                <Row k="Paid" v={inr(rec.payment.amountPaid ?? 0)} strong />
                <Row k="Change due" v={inr((rec.payment.amountPaid ?? 0) - (rec.bill?.total ?? 0))} />
                <Row k="Method" v={rec.payment.method} />
                <Row k="Transaction" v={<span className="font-mono">{rec.payment.txnId}</span>} />
              </div>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Button variant="outline" onClick={() => nav({ to: "/parking", search: { highlight: rec.slotId } })}>View bay</Button>
                <Button asChild><Link to="/history">Session history</Link></Button>
              </div>
            </div>
          </Panel>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title={rec.bill ? "Bill" : "Bill review (estimate)"} action={<PaymentBadge status={rec.payment?.status} />}>
              <div className="mb-3 flex items-center gap-3"><Plate plate={rec.vehicle.plate} size="lg" /><span className="text-sm text-muted-foreground">{vehicleMeta[rec.vehicle.type].label}</span></div>
              <div className="divide-y">
                <Row k="Record" v={<span className="font-mono">{rec.id}</span>} />
                <Row k="Slot" v={rec.slotId} />
                <Row k="Entry" v={fmtTime(rec.entry)} />
                <Row k="Exit" v={rec.exit ? fmtTime(rec.exit) : "Now"} />
                <Row k="Duration" v={formatDuration((rec.exit ?? p.now) - rec.entry)} />
                <Row k={`Parking · ${bill.hours} h × ${inr(bill.rate)}`} v={inr(bill.subtotal)} />
                {bill.lostTicket > 0 && <Row k="Lost-ticket surcharge" v={inr(bill.lostTicket)} />}
                <Row k={`Tax (${p.settings.taxPercent}%)`} v={inr(bill.tax)} />
                <Row k="Total" v={inr(bill.total)} strong />
              </div>
              {!rec.bill && (
                <>
                  <label className="mt-4 flex items-center justify-between rounded-lg border p-3 text-sm">
                    <span>Lost ticket <span className="text-muted-foreground">(+{inr(p.settings.lostTicketFee)})</span></span>
                    <Switch checked={lost} onCheckedChange={setLost} />
                  </label>
                  <Button size="lg" className="mt-4 w-full" onClick={() => setConfirmOpen(true)}><ReceiptText />Generate bill & record exit</Button>
                </>
              )}
            </Panel>
            <Panel title="Payment">
              {!rec.bill ? (
                <p className="text-sm text-muted-foreground">Generate the bill first to take payment.</p>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl bg-secondary p-4 text-center">
                    <div className="text-xs text-muted-foreground">Amount due</div>
                    <div className="font-display text-4xl font-bold">{inr(rec.bill.total)}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {METHODS.map((m) => (
                      <button key={m.k} type="button" onClick={() => setMethod(m.k)} className={cn("flex flex-col items-center gap-1 rounded-xl border-2 py-3 text-sm font-semibold transition-all", method === m.k ? "border-primary bg-secondary" : "hover:border-sage")}>
                        <m.icon className="size-5" />{m.l}
                      </button>
                    ))}
                  </div>
                  <div>
                    <Label htmlFor="amt">Amount received</Label>
                    <div className="relative mt-1.5"><IndianRupee className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                      <Input id="amt" type="number" min={0} className="pl-9 font-mono" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(rec.bill.total)} />
                    </div>
                    <button type="button" className="mt-1 text-xs text-primary underline" onClick={() => setAmount(String(rec.bill!.total))}>Exact amount</button>
                  </div>
                  {rec.payment?.status === "FAILED" && (
                    <p role="alert" className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"><Ban className="size-4" />Last attempt failed ({inr(rec.payment.amountPaid ?? 0)} via {rec.payment.method}). Try again.</p>
                  )}
                  <Button size="lg" className="w-full" onClick={doPay}>Take payment & release bay</Button>
                  <p className="text-center text-[11px] text-muted-foreground">Simulated payment — no real gateway is connected.</p>
                </div>
              )}
            </Panel>
          </div>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Record exit for {rec?.vehicle.plate}?</AlertDialogTitle>
            <AlertDialogDescription>The exit time will be fixed now and a bill of {bill && inr(bill.total)} will be generated.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={generate}>Generate bill</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
