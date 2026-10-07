import type { ReactNode } from "react";
import { Ban, Bike, Car, CircleCheck, Clock, Crown, Accessibility, Lock, Wrench, Zap, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PaymentStatus, SlotStatus, SlotType, VehicleType } from "@/lib/parking/types";
import { Skeleton } from "@/components/ui/skeleton";

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</p>
        <h1 className="mt-1 text-3xl font-bold text-foreground md:text-4xl">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border bg-card p-5 shadow-soft", className)}>
      {title && (
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Kpi({ label, value, hint, icon: Icon, tone = "default" }: { label: string; value: ReactNode; hint?: string; icon: LucideIcon; tone?: "default" | "good" | "primary" }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={cn("grid size-8 place-items-center rounded-lg", tone === "good" ? "bg-available/15 text-available" : tone === "primary" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground")}>
          <Icon className="size-4" />
        </span>
      </div>
      <div className="mt-2 font-display text-2xl font-bold">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export const statusMeta: Record<SlotStatus, { label: string; icon: LucideIcon; tile: string; dot: string }> = {
  AVAILABLE: { label: "Available", icon: CircleCheck, tile: "border-available/50 bg-available/10 text-available hover:bg-available/20", dot: "bg-available" },
  OCCUPIED: { label: "Occupied", icon: Car, tile: "border-occupied bg-occupied text-primary-foreground hover:opacity-90", dot: "bg-occupied" },
  RESERVED: { label: "Reserved", icon: Lock, tile: "border-reserved border-dashed bg-reserved/15 text-foreground hover:bg-reserved/25", dot: "bg-reserved" },
  MAINTENANCE: { label: "Maintenance", icon: Wrench, tile: "hatch border-maintenance/60 bg-muted text-muted-foreground", dot: "bg-maintenance" },
};

export const slotTypeMeta: Record<SlotType, { label: string; icon: LucideIcon }> = {
  STANDARD: { label: "Standard", icon: Car },
  COMPACT: { label: "Compact (2W)", icon: Bike },
  EV: { label: "EV bay", icon: Zap },
  ACCESSIBLE: { label: "Accessible", icon: Accessibility },
  VIP: { label: "VIP", icon: Crown },
};

export const vehicleMeta: Record<VehicleType, { label: string; icon: LucideIcon }> = {
  CAR: { label: "Car", icon: Car },
  BIKE: { label: "Bike", icon: Bike },
  EV: { label: "Electric", icon: Zap },
};

export function SlotStatusBadge({ status }: { status: SlotStatus }) {
  const m = statusMeta[status];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-0.5 text-xs font-medium">
      <span className={cn("size-2 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}

export function PaymentBadge({ status }: { status?: PaymentStatus }) {
  if (!status) return <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"><Clock className="size-3" />Parked</span>;
  const cls =
    status === "SUCCESS" ? "bg-available/15 text-available" : status === "FAILED" ? "bg-destructive/10 text-destructive" : "bg-reserved/20 text-foreground";
  const Icon = status === "SUCCESS" ? CircleCheck : status === "FAILED" ? Ban : Clock;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", cls)}>
      <Icon className="size-3" />
      {status === "SUCCESS" ? "Paid" : status === "FAILED" ? "Failed" : "Pending"}
    </span>
  );
}

export function Plate({ plate, size = "md" }: { plate: string; size?: "sm" | "md" | "lg" }) {
  const p = plate.replace(/^([A-Z]{2})(\d{2})([A-Z]{1,3})(\d{1,4})$/, "$1 $2 $3 $4");
  return (
    <span className={cn("inline-flex items-center rounded-md border-2 border-foreground/80 bg-card font-mono font-semibold tracking-wider text-foreground", size === "sm" && "px-1.5 text-xs", size === "md" && "px-2 py-0.5 text-sm", size === "lg" && "px-3 py-1 text-2xl")}>
      {p}
    </span>
  );
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/40 px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-secondary text-secondary-foreground"><Icon className="size-5" /></span>
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  );
}

export function Row({ k, v, strong }: { k: string; v: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className={cn("text-right", strong ? "font-display text-lg font-bold" : "font-medium")}>{v}</span>
    </div>
  );
}

export const fmtTime = (t?: number) =>
  t ? new Date(t).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
