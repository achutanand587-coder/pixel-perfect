import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { CarFront, History, LayoutDashboard, LogIn, Map, ReceiptText, Settings, SquareParking } from "lucide-react";
import { cn } from "@/lib/utils";
import { useParking } from "@/lib/parking/store";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/parking", label: "Live Parking", icon: Map },
  { to: "/entry", label: "Vehicle Entry", icon: LogIn },
  { to: "/vehicles", label: "Vehicle Details", icon: CarFront },
  { to: "/exit", label: "Exit & Billing", icon: ReceiptText },
  { to: "/history", label: "Session History", icon: History },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { slots, ready } = useParking();
  const free = slots.filter((s) => s.status === "AVAILABLE").length;
  const isActive = (to: string) => (to === "/" ? path === "/" : path.startsWith(to));

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 z-30 border-b border-sidebar-border bg-sidebar text-sidebar-foreground lg:h-screen lg:border-r lg:border-b-0">
        <div className="flex items-center gap-3 px-5 py-4 lg:py-6">
          <span className="grid size-10 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <SquareParking className="size-5" />
          </span>
          <div className="leading-tight">
            <div className="font-display text-sm font-bold text-sidebar-accent-foreground">Smart Parking</div>
            <div className="text-[10px] uppercase tracking-[0.14em]">Management System</div>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to}
              className={cn("flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive(n.to) ? "bg-sidebar-primary text-sidebar-primary-foreground" : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")}>
              <n.icon className="size-4" />
              <span className="whitespace-nowrap">{n.label}</span>
            </Link>
          ))}
        </nav>
        <div className="absolute inset-x-0 bottom-0 hidden p-5 lg:block">
          <div className="rounded-xl border border-sidebar-border bg-sidebar-accent p-3">
            <div className="text-[10px] uppercase tracking-[0.14em]">Live availability</div>
            <div className="font-display text-2xl font-bold text-sidebar-accent-foreground">{ready ? free : "—"} <span className="text-sm font-medium">free bays</span></div>
            <div className="mt-2 text-[10px]">VIT Pune • CB2006 • Automated Parking Operations</div>
          </div>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-6 md:px-8 lg:py-8">
        <div key={path} className="page-enter mx-auto max-w-7xl">{children}</div>
        <p className="mx-auto mt-10 max-w-7xl text-center text-[11px] text-muted-foreground">Demo mode · sample data stored in this browser · payments are simulated</p>
      </main>
    </div>
  );
}
