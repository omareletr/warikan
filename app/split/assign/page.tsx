"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PersonAvatar, AVATAR_COLORS } from "@/components/split/person-avatar";
import { useSplitFlow } from "@/lib/split-flow-context";
import { formatCurrency, initials } from "@/lib/calculate";
import { cn } from "@/lib/utils";

export default function AssignPage() {
  const router = useRouter();
  const { state, loaded, updateLineItems } = useSplitFlow();
  const [selectedPersonId, setSelectedPersonId] = useState<string>(state.people[0]?.id ?? "");

  useEffect(() => {
    if (loaded && state.lineItems.length === 0) router.replace("/");
  }, [loaded, state.lineItems.length, router]);

  if (!loaded) return null;

  function personColor(personId: string) {
    const person = state.people.find((p) => p.id === personId);
    if (person?.covered) return { bg: "bg-amber-500/15", text: "text-amber-400" };
    const idx = state.people.findIndex((p) => p.id === personId);
    return AVATAR_COLORS[idx % AVATAR_COLORS.length];
  }

  function toggleAssignment(itemId: string) {
    navigator.vibrate?.(10);
    updateLineItems(state.lineItems.map((item) => {
      if (item.id !== itemId) return item;

      if (item.quantity <= 1) {
        const assigned = item.assignedToIds.includes(selectedPersonId);
        return {
          ...item,
          assignedToIds: assigned
            ? item.assignedToIds.filter((id) => id !== selectedPersonId)
            : [...item.assignedToIds, selectedPersonId],
        };
      }

      // Multi-qty: claim-based
      const totalClaims = item.assignedToIds.length;
      const unclaimed = item.quantity - totalClaims;
      const personClaims = item.assignedToIds.filter((id) => id === selectedPersonId).length;

      if (unclaimed > 0) {
        return { ...item, assignedToIds: [...item.assignedToIds, selectedPersonId] };
      }
      if (personClaims > 0) {
        return { ...item, assignedToIds: item.assignedToIds.filter((id) => id !== selectedPersonId) };
      }
      return item;
    }));
  }

  function removeClaim(itemId: string, personId: string) {
    navigator.vibrate?.(10);
    updateLineItems(state.lineItems.map((item) => {
      if (item.id !== itemId) return item;
      const idx = item.assignedToIds.indexOf(personId);
      if (idx === -1) return item;
      const ids = [...item.assignedToIds];
      ids.splice(idx, 1);
      return { ...item, assignedToIds: ids };
    }));
  }

  function runningTotal(personId: string): number {
    return state.lineItems.reduce((sum, item) => {
      const personClaims = item.assignedToIds.filter((id) => id === personId).length;
      if (personClaims === 0) return sum;
      return sum + (item.price * item.quantity * personClaims) / item.assignedToIds.length;
    }, 0);
  }

  function assignAllToSelected() {
    updateLineItems(state.lineItems.map((item) => {
      if (item.quantity <= 1) {
        if (item.assignedToIds.includes(selectedPersonId)) return item;
        return { ...item, assignedToIds: [...item.assignedToIds, selectedPersonId] };
      }
      const unclaimed = item.quantity - item.assignedToIds.length;
      if (unclaimed <= 0) return item;
      return { ...item, assignedToIds: [...item.assignedToIds, ...Array(unclaimed).fill(selectedPersonId)] };
    }));
  }

  const allAssigned = state.lineItems.every((item) =>
    item.quantity <= 1 ? item.assignedToIds.length > 0 : item.assignedToIds.length >= item.quantity
  );

  const canAssignMore = state.lineItems.some((item) =>
    item.quantity <= 1
      ? !item.assignedToIds.includes(selectedPersonId)
      : item.quantity - item.assignedToIds.length > 0
  );

  return (
    <motion.main initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex min-h-dvh flex-col pb-40">
      <div className="sticky-header px-6 pt-10 pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild aria-label="Go back"><Link href="/split/people"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <h1 className="text-xl font-bold">Assign dishes</h1>
        </div>

        <div className="mt-4 -mx-3 rounded-3xl border border-border/30 bg-card/80 shadow-md shadow-black/10">
          <div
            className="flex gap-5 overflow-x-auto px-6 py-4"
            style={{ maskImage: "linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent)" }}
          >
            {state.people.map((person, i) => (
              <PersonAvatar key={person.id} person={person} selected={person.id === selectedPersonId} runningTotal={runningTotal(person.id)} onClick={() => setSelectedPersonId(person.id)} colorIndex={i} />
            ))}
          </div>
        </div>
      </div>

      <div className="px-6">
        <div className="mb-3 mt-6 flex items-center justify-between">
          <p className="text-base font-semibold text-muted-foreground">
            Tap to assign to {state.people.find((p) => p.id === selectedPersonId)?.name}
          </p>
          {canAssignMore && (
            <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={assignAllToSelected}>
              Assign All
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {state.lineItems.map((item) => {
            if (item.quantity > 1) {
              const totalClaims = item.assignedToIds.length;
              const unclaimed = item.quantity - totalClaims;
              const myClaims = item.assignedToIds.filter((id) => id === selectedPersonId).length;
              const isAssignedToMe = myClaims > 0;
              const isFullyClaimed = unclaimed <= 0;

              const claimsByPerson: Record<string, number> = {};
              for (const pid of item.assignedToIds) {
                claimsByPerson[pid] = (claimsByPerson[pid] || 0) + 1;
              }

              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleAssignment(item.id)}
                  onKeyDown={(e) => e.key === "Enter" && toggleAssignment(item.id)}
                  className={cn(
                    "flex flex-col gap-2 rounded-xl border p-4 transition-all duration-150 cursor-pointer select-none",
                    isAssignedToMe ? "border-primary/40 bg-primary/5" : "border-transparent hover:bg-secondary",
                    isFullyClaimed && !isAssignedToMe && "opacity-50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-6 w-8 items-center justify-center rounded-md bg-secondary text-sm font-medium tabular-nums">×{item.quantity}</span>
                      <span className="text-base">{item.name}</span>
                    </div>
                    <span className="text-base font-medium tabular-nums">{formatCurrency(item.price * item.quantity)}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <div className="flex gap-1">
                        {Array.from({ length: item.quantity }, (_, i) => (
                          <div
                            key={i}
                            className={cn(
                              "h-2 w-2 rounded-full transition-colors",
                              i < totalClaims ? "bg-primary" : "bg-muted"
                            )}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">{totalClaims}/{item.quantity}</span>
                    </div>

                    <div className="flex gap-1.5">
                      {Object.entries(claimsByPerson).map(([pid, count]) => {
                        const person = state.people.find((p) => p.id === pid);
                        if (!person) return null;
                        const color = personColor(pid);
                        return (
                          <button
                            key={pid}
                            onClick={(e) => { e.stopPropagation(); removeClaim(item.id, pid); }}
                            className={cn("flex h-6 items-center rounded-md px-2 text-sm font-medium active:opacity-70", color.bg, color.text)}
                          >
                            {initials(person.name)}{count > 1 ? ` ×${count}` : ""}
                          </button>
                        );
                      })}
                    </div>

                    <span className="ml-auto text-xs text-muted-foreground tabular-nums">{formatCurrency(item.price)}/ea</span>
                  </div>
                </div>
              );
            }

            // Single-quantity item
            const isAssignedToMe = item.assignedToIds.includes(selectedPersonId);

            return (
              <button
                key={item.id}
                onClick={() => toggleAssignment(item.id)}
                className={cn(
                  "flex items-center justify-between rounded-xl border p-4 text-left transition-all duration-150",
                  isAssignedToMe ? "border-primary/40 bg-primary/5" : "border-transparent hover:bg-secondary"
                )}
              >
                <div className="flex items-center gap-2.5">
                  {isAssignedToMe && <div className="h-2 w-2 flex-shrink-0 rounded-full bg-primary shadow-[0_0_6px_rgba(52,211,153,0.5)]" />}
                  <span className="text-base">{item.name}</span>
                  {item.assignedToIds.length > 0 && (
                    <div className="flex gap-1.5">
                      {item.assignedToIds.map((pid) => {
                        const person = state.people.find((p) => p.id === pid);
                        if (!person) return null;
                        const color = personColor(pid);
                        return (
                          <span key={pid} className={cn("flex h-6 items-center rounded-md px-2 text-sm font-medium", color.bg, color.text)}>
                            {initials(person.name)}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-base font-medium tabular-nums">{formatCurrency(item.price)}</span>
                  {item.assignedToIds.length > 1 && (
                    <p className="text-xs text-muted-foreground tabular-nums">{formatCurrency(item.price / item.assignedToIds.length)} ea</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

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
