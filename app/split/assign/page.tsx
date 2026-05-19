"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Check } from "lucide-react";
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
    navigator.vibrate?.(10);
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

  function assignAllToSelected() {
    updateLineItems(state.lineItems.map((item) => {
      if (item.assignedToIds.includes(selectedPersonId)) return item;
      return { ...item, assignedToIds: [...item.assignedToIds, selectedPersonId] };
    }));
  }

  const allAssigned = state.lineItems.every((item) => item.assignedToIds.length > 0);
  const allAssignedToMe = state.lineItems.every((item) => item.assignedToIds.includes(selectedPersonId));

  return (
    <motion.main initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex min-h-dvh flex-col px-6 pb-40 pt-14">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link href="/split/people"><ArrowLeft className="h-5 w-5" /></Link></Button>
        <h1 className="text-xl font-bold">Assign Dishes</h1>
      </div>

      <div
        className="-mx-6 mt-8 flex gap-5 overflow-x-auto px-7 py-2 pb-4"
        style={{ maskImage: "linear-gradient(to right, transparent, black 32px, black calc(100% - 32px), transparent)" }}
      >
        {state.people.map((person, i) => (
          <PersonAvatar key={person.id} person={person} selected={person.id === selectedPersonId} runningTotal={runningTotal(person.id)} onClick={() => setSelectedPersonId(person.id)} colorIndex={i} />
        ))}
      </div>

      <div className="mb-3 mt-6 flex items-center justify-between">
        <p className="text-base font-semibold text-muted-foreground">
          Tap to assign to {state.people.find((p) => p.id === selectedPersonId)?.name}
        </p>
        {!allAssignedToMe && (
          <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={assignAllToSelected}>
            Assign All
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-2">
          {state.lineItems.map((item) => {
            const isAssignedToMe = item.assignedToIds.includes(selectedPersonId);
            const isFullyClaimed = item.assignedToIds.length >= item.quantity && !isAssignedToMe;
            return (
              <button key={item.id} onClick={() => toggleAssignment(item.id)}
                className={cn(
                  "flex items-center justify-between rounded-xl border p-4 text-left transition-all duration-150",
                  isAssignedToMe ? "border-primary/40 bg-primary/5" : "border-transparent hover:bg-secondary",
                  isFullyClaimed && "opacity-50"
                )}
              >
                <div className="flex items-center gap-2.5">
                  {isAssignedToMe && <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_6px_rgba(52,211,153,0.5)]" />}
                  {isFullyClaimed && <Check className="h-4 w-4 text-primary" />}
                  {item.quantity > 1 && (
                    <span className="flex h-6 w-8 items-center justify-center rounded-md bg-secondary text-sm font-medium tabular-nums">{item.quantity}</span>
                  )}
                  <span className="text-base">{item.name}</span>
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
                <div className="text-right">
                  <span className="text-base font-medium tabular-nums">{formatCurrency(item.price * item.quantity)}</span>
                  {item.assignedToIds.length > 1 && (
                    <p className="text-xs text-muted-foreground tabular-nums">{formatCurrency(item.price * item.quantity / item.assignedToIds.length)} ea</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>

      <div className="fixed bottom-0 left-0 right-0 p-4">
        <div className="rounded-3xl border border-border/30 bg-card/80 backdrop-blur-xl p-5 shadow-lg shadow-black/20">
          <Button className="h-14 w-full rounded-2xl text-base font-semibold" disabled={!allAssigned} onClick={() => router.push("/split/summary")}>
            {allAssigned ? "Continue" : "Assign all dishes to continue"}
          </Button>
        </div>
      </div>
    </motion.main>
  );
}
