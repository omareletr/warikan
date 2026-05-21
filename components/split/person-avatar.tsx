import { Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { initials, formatCurrency } from "@/lib/calculate";
import type { Person } from "@/lib/types";

export const AVATAR_COLORS = [
  { bg: "bg-emerald-500/15", text: "text-emerald-400", ring: "ring-emerald-400", activeBg: "bg-emerald-500", outline: "outline-emerald-400" },
  { bg: "bg-sky-500/15", text: "text-sky-400", ring: "ring-sky-400", activeBg: "bg-sky-500", outline: "outline-sky-400" },
  { bg: "bg-violet-500/15", text: "text-violet-400", ring: "ring-violet-400", activeBg: "bg-violet-500", outline: "outline-violet-400" },
  { bg: "bg-amber-500/15", text: "text-amber-400", ring: "ring-amber-400", activeBg: "bg-amber-500", outline: "outline-amber-400" },
  { bg: "bg-rose-500/15", text: "text-rose-400", ring: "ring-rose-400", activeBg: "bg-rose-500", outline: "outline-rose-400" },
  { bg: "bg-cyan-500/15", text: "text-cyan-400", ring: "ring-cyan-400", activeBg: "bg-cyan-500", outline: "outline-cyan-400" },
];

interface PersonAvatarProps {
  person: Person;
  selected?: boolean;
  runningTotal?: number;
  onClick?: () => void;
  colorIndex?: number;
}

export function PersonAvatar({ person, selected, runningTotal, onClick, colorIndex = 0 }: PersonAvatarProps) {
  const color = person.covered
    ? { bg: "bg-amber-500/15", text: "text-amber-400", ring: "ring-amber-400", activeBg: "bg-amber-500", outline: "outline-amber-400" }
    : AVATAR_COLORS[colorIndex % AVATAR_COLORS.length];
  return (
    <button onClick={onClick} className={cn("flex flex-col items-center gap-1.5 transition-opacity duration-200",
      !selected && !person.covered && runningTotal !== undefined && runningTotal === 0 && "opacity-50"
    )}>
      <div className={cn(
        "relative flex h-14 w-14 items-center justify-center rounded-full text-base font-semibold transition-all duration-200",
        selected ? `${color.activeBg} text-white` : `${color.bg} ${color.text}`,
        selected && `ring-2 ${color.ring} ring-offset-2 ring-offset-background shadow-[0_0_16px_rgba(52,211,153,0.3)]`,
      )}>
        {person.covered ? <Gift className="h-5 w-5" /> : initials(person.name)}
      </div>
      <span className={cn("max-w-[72px] text-center text-sm leading-tight line-clamp-2", person.covered && "text-muted-foreground")}>{person.name}</span>
      {runningTotal !== undefined && (
        <span className={cn("text-sm tabular-nums", person.covered ? "text-amber-400" : runningTotal === 0 ? "text-muted-foreground" : "text-primary")}>
          {person.covered ? "Covered" : formatCurrency(runningTotal)}
        </span>
      )}
    </button>
  );
}
