"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Gift, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useSplitFlow } from "@/lib/split-flow-context";
import { initials } from "@/lib/calculate";
import type { Person } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function PeoplePage() {
  const router = useRouter();
  const { state, setPeople } = useSplitFlow();
  const [name, setName] = useState("");

  function addPerson() {
    const trimmed = name.trim();
    if (!trimmed) return;
    let finalName = trimmed;
    const existing = state.people.map((p) => p.name);
    if (existing.includes(trimmed)) {
      let n = 2;
      while (existing.includes(`${trimmed} (${n})`)) n++;
      finalName = `${trimmed} (${n})`;
    }
    setPeople([...state.people, { id: crypto.randomUUID(), name: finalName }]);
    setName("");
  }

  function removePerson(id: string) {
    setPeople(state.people.filter((p) => p.id !== id));
  }

  function toggleCovered(id: string) {
    setPeople(state.people.map((p) => p.id === id ? { ...p, covered: !p.covered } : p));
  }

  return (
    <motion.main initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex min-h-dvh flex-col px-6 pb-36 pt-14">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/split/review"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <h1 className="text-xl font-bold">Who&apos;s Splitting?</h1>
      </div>

      <div className="mt-8 flex gap-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Add a name" onKeyDown={(e) => e.key === "Enter" && addPerson()} />
        <Button onClick={addPerson} disabled={!name.trim()}>Add</Button>
      </div>

      {state.people.length > 0 && (
        <div className="mt-8">
          <p className="mb-4 text-base font-semibold text-muted-foreground">In This Split</p>
          <div className="flex flex-col gap-3">
            {state.people.map((person, i) => (
              <motion.div key={person.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className={cn(
                  "flex items-center gap-4 rounded-2xl border p-4",
                  person.covered ? "border-amber-500/40 bg-amber-500/5" : "border-border/30 bg-card/40"
                )}
              >
                <div className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full text-base font-semibold",
                  person.covered ? "bg-amber-500/15 text-amber-400" : "bg-primary/15 text-primary"
                )}>
                  {person.covered ? <Gift className="h-5 w-5" /> : initials(person.name)}
                </div>
                <div className="flex-1">
                  <span className={cn("text-base font-medium", person.covered && "text-muted-foreground")}>{person.name}</span>
                  {person.covered && <Badge variant="secondary" className="ml-2 bg-amber-500/15 text-amber-400 text-xs">Covered</Badge>}
                </div>
                <Button variant="ghost" size="icon" className={cn("h-9 w-9", person.covered ? "text-amber-400" : "text-muted-foreground")} onClick={() => toggleCovered(person.id)}>
                  <Gift className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => removePerson(person.id)}>
                  <X className="h-4 w-4" />
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 p-4">
        <div className="rounded-3xl border border-border/30 bg-card/80 backdrop-blur-xl p-5 shadow-lg shadow-black/20">
          <Button className="h-14 w-full rounded-2xl text-base font-semibold" disabled={state.people.length < 2} onClick={() => router.push("/split/assign")}>
            {state.people.length < 2 ? "Add at least 2 people" : `Continue with ${state.people.length} people`}
          </Button>
        </div>
      </div>
    </motion.main>
  );
}
