import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/calculate";
import type { Split } from "@/lib/types";
import { Users } from "lucide-react";

export function SplitCard({ split }: { split: Split }) {
  const date = new Date(split.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <Link href={`/split/${split.id}`}>
      <Card className="transition-all duration-150 active:scale-[0.98]">
        <CardContent className="flex items-center justify-between p-5">
          <div>
            <p className="text-base font-semibold">
              {split.restaurantName || `${date} Split`}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{date}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-lg font-semibold tabular-nums text-primary">
              {formatCurrency(split.totalAmount)}
            </p>
            <p className="mt-1 flex items-center justify-end gap-1 text-sm text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              {split.people.length}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
