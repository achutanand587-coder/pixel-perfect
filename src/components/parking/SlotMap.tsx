import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/parking/logic";
import type { ParkingRecord, ParkingSlot } from "@/lib/parking/types";
import { slotTypeMeta, statusMeta } from "./ui";

export function SlotTile({ slot, record, now, selected, highlight, onClick, compact }: {
  slot: ParkingSlot; record?: ParkingRecord; now: number; selected?: boolean; highlight?: boolean; onClick?: () => void; compact?: boolean;
}) {
  const m = statusMeta[slot.status];
  const T = slotTypeMeta[slot.type];
  const SIcon = m.icon;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label={`Slot ${slot.id}, ${m.label}, ${T.label}`}
          className={cn(
            "relative flex flex-col justify-between rounded-lg border-2 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            compact ? "h-14 p-1.5" : "h-20 p-2",
            m.tile,
            selected && "ring-2 ring-foreground ring-offset-2 ring-offset-card scale-[1.04]",
            highlight && "ring-2 ring-reserved ring-offset-2 ring-offset-card animate-pulse",
          )}
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-bold">{slot.id}</span>
            {slot.type !== "STANDARD" && <T.icon className="size-3 opacity-80" />}
          </div>
          {!compact && (
            <div className="flex items-center gap-1 text-[10px] font-semibold">
              <SIcon className="size-3 shrink-0" />
              <span className="truncate">{record ? record.vehicle.plate : m.label}</span>
            </div>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs">
          <div className="font-semibold">{slot.id} · {T.label}</div>
          <div>{m.label}{record && ` · ${record.vehicle.plate} · ${formatDuration(now - record.entry)}`}</div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function ZoneBlock({ zone, slots, records, now, selectedId, highlightId, onSelect, compact }: {
  zone: string; slots: ParkingSlot[]; records: Map<string, ParkingRecord>; now: number; selectedId?: string; highlightId?: string; onSelect?: (s: ParkingSlot) => void; compact?: boolean;
}) {
  const rows = [1, 2].map((r) => slots.filter((s) => s.row === r));
  const free = slots.filter((s) => s.status === "AVAILABLE").length;
  return (
    <div className="rounded-xl border bg-muted/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-display text-sm font-bold">Zone {zone}</span>
        <span className="font-mono text-[11px] text-muted-foreground">{free}/{slots.length} free</span>
      </div>
      {rows.map((row, i) => (
        <div key={i}>
          {i === 1 && (
            <div className="my-2 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
              <span className="h-px flex-1 border-t border-dashed border-muted-foreground/40" />drive aisle →<span className="h-px flex-1 border-t border-dashed border-muted-foreground/40" />
            </div>
          )}
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
            {row.map((s) => (
              <SlotTile key={s.id} slot={s} record={s.recordId ? records.get(s.recordId) : undefined} now={now} compact={compact}
                selected={s.id === selectedId} highlight={s.id === highlightId} onClick={() => onSelect?.(s)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Legend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs">
      {(Object.keys(statusMeta) as (keyof typeof statusMeta)[]).map((k) => {
        const m = statusMeta[k];
        return (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className={cn("grid size-5 place-items-center rounded border-2", m.tile)}><m.icon className="size-3" /></span>
            {m.label}
          </span>
        );
      })}
    </div>
  );
}
