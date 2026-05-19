import { cn } from "@/lib/utils";
import { initials, formatCurrency } from "@/lib/calculate";
import type { Person } from "@/lib/types";

interface PersonAvatarProps {
  person: Person;
  selected?: boolean;
  runningTotal?: number;
  onClick?: () => void;
}

export function PersonAvatar({ person, selected, runningTotal, onClick }: PersonAvatarProps) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5">
      <div className={cn(
        "flex h-14 w-14 items-center justify-center rounded-full text-base font-semibold transition-all duration-200",
        selected
          ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background shadow-[0_0_16px_rgba(52,211,153,0.3)]"
          : "bg-primary/15 text-primary"
      )}>
        {initials(person.name)}
      </div>
      <span className="max-w-[72px] text-center text-sm leading-tight line-clamp-2">{person.name}</span>
      {runningTotal !== undefined && (
        <span className="text-sm tabular-nums text-primary">{formatCurrency(runningTotal)}</span>
      )}
    </button>
  );
}
