"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PersonAvatar } from "@/components/split/person-avatar";
import { useSplitFlow } from "@/lib/split-flow-context";
import { formatCurrency, initials } from "@/lib/calculate";
import { cn } from "@/lib/utils";

export default function AssignPage() {
  const router = useRouter();
  const { state, updateLineItems } = useSplitFlow();
  const [selectedPersonId, setSelectedPersonId] = useState<string>(state.people[0]?.id ?? "");

  function toggleAssignment(itemId: string) {
    updateLineItems(state.lineItems.map((item) => {
      if (item.id !== itemId) return item;
      const assigned = item.assignedToIds.includes(selectedPersonId);
      return { ...item, assignedToIds: assigned ? item.assignedToIds.filter((id) => id !== selectedPersonId) : [...item.assignedToIds, selectedPersonId] };
    }));
  }

  function runningTotal(personId: string): number {
    return state.lineItems.reduce((sum, item) => {
      if (!item.assignedToIds.includes(personId)) return sum;
      return sum + (item.price * item.quantity) / item.assignedToIds.length;
    }, 0);
  }

  const allAssigned = state.lineItems.every((item) => item.assignedToIds.length > 0);

  return (
    <motion.main initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex min-h-dvh flex-col px-6 pb-32 pt-14">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link href="/split/people"><ArrowLeft className="h-5 w-5" /></Link></Button>
        <h1 className="text-xl font-bold">Assign Dishes</h1>
      </div>

      <div className="mt-8 flex gap-5 overflow-x-auto pb-4">
        {state.people.map((person) => (
          <PersonAvatar key={person.id} person={person} selected={person.id === selectedPersonId} runningTotal={runningTotal(person.id)} onClick={() => setSelectedPersonId(person.id)} />
        ))}
      </div>

      <p className="mb-3 mt-6 text-base font-semibold text-muted-foreground">
        Tap to assign to {state.people.find((p) => p.id === selectedPersonId)?.name}
      </p>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-2">
          {state.lineItems.map((item) => {
            const isAssigned = item.assignedToIds.includes(selectedPersonId);
            return (
              <button key={item.id} onClick={() => toggleAssignment(item.id)}
                className={cn(
                  "flex items-center justify-between rounded-xl border p-4 text-left transition-all duration-150",
                  isAssigned ? "border-primary/40 bg-primary/5" : "border-transparent hover:bg-secondary"
                )}
              >
                <div className="flex items-center gap-2.5">
                  {isAssigned && <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_6px_rgba(52,211,153,0.5)]" />}
                  <span className="text-base">
                    {item.quantity > 1 && <span className="mr-1 text-muted-foreground">{item.quantity}×</span>}
                    {item.name}
                  </span>
                  {item.assignedToIds.length > 0 && (
                    <div className="flex gap-1">
                      {item.assignedToIds.map((pid) => {
                        const person = state.people.find((p) => p.id === pid);
                        if (!person) return null;
                        return <Badge key={pid} variant="secondary" className="h-6 px-2 text-sm">{initials(person.name)}</Badge>;
                      })}
                    </div>
                  )}
                </div>
                <span className="text-base font-medium tabular-nums">{formatCurrency(item.price * item.quantity)}</span>
              </button>
            );
          })}
        </div>
      </ScrollArea>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border/50 bg-background/80 backdrop-blur-lg p-5">
        <Button className="h-14 w-full rounded-2xl text-base font-semibold" disabled={!allAssigned} onClick={() => router.push("/split/summary")}>
          {allAssigned ? "Continue" : "Assign all dishes to continue"}
        </Button>
      </div>
    </motion.main>
  );
}
