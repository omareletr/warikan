"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { ArrowLeft, Gift, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useSplitFlow } from "@/lib/split-flow-context";
import { initials } from "@/lib/calculate";
import { AVATAR_COLORS } from "@/components/split/person-avatar";
import type { Person } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function PeoplePage() {
  const router = useRouter();
  const { state, loaded, setPeople } = useSplitFlow();
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [listRef] = useAutoAnimate<HTMLDivElement>();

  useEffect(() => {
    if (loaded && state.lineItems.length === 0) router.replace("/");
  }, [loaded, state.lineItems.length, router]);
  const [editingName, setEditingName] = useState("");

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

  function startEditing(person: Person) {
    setEditingId(person.id);
    setEditingName(person.name);
  }

  function commitEdit(id: string) {
    const trimmed = editingName.trim();
    if (trimmed) {
      let finalName = trimmed;
      const existing = state.people.filter((p) => p.id !== id).map((p) => p.name);
      if (existing.includes(trimmed)) {
        let n = 2;
        while (existing.includes(`${trimmed} (${n})`)) n++;
        finalName = `${trimmed} (${n})`;
      }
      setPeople(state.people.map((p) => p.id === id ? { ...p, name: finalName } : p));
    }
    setEditingId(null);
  }

  return (
    <main className="flex h-full flex-col overflow-y-auto overscroll-contain px-6 pb-40">
      <div className="sticky-header -mx-6 px-6 pt-10 pb-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild aria-label="Go back">
            <Link href="/split/review"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <h1 className="text-xl font-bold">Who&apos;s splitting?</h1>
        </div>
      </div>

      {loaded && (
        <div className="mt-8 flex gap-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Add a name" onKeyDown={(e) => e.key === "Enter" && addPerson()} />
          <Button onClick={addPerson} disabled={!name.trim()}>Add</Button>
        </div>
      )}

      {loaded && state.people.length > 0 && (
        <div className="mt-8">
          <p className="mb-4 text-base font-semibold text-muted-foreground">In This Split</p>
          <div ref={listRef} className="flex flex-col gap-3">
            {state.people.map((person, i) => {
              const cannotCover = !person.covered && state.people.filter(p => !p.covered).length <= 2;
              return (<div key={person.id}
                className={cn(
                  "flex items-center gap-4 rounded-2xl border p-4",
                  person.covered ? "border-amber-500/40 bg-amber-500/5" : "border-border/30 bg-card/40"
                )}
              >
                <div className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full text-base font-semibold",
                  person.covered ? "bg-amber-500/15 text-amber-400" : `${AVATAR_COLORS[i % AVATAR_COLORS.length].bg} ${AVATAR_COLORS[i % AVATAR_COLORS.length].text}`
                )}>
                  {person.covered ? <Gift className="h-5 w-5" /> : initials(person.name)}
                </div>
                <div className="flex flex-1 items-center gap-2">
                  {editingId === person.id ? (
                    <Input
                      autoFocus
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => commitEdit(person.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEdit(person.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="h-8 flex-1 border-0 bg-transparent px-2 py-0 text-base font-medium focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  ) : (
                    <button
                      onClick={() => startEditing(person)}
                      className={cn("flex-1 text-left text-base font-medium", person.covered && "text-muted-foreground")}
                    >
                      {person.name}
                    </button>
                  )}
                  {person.covered && !editingId && <Badge variant="secondary" className="bg-amber-500/15 text-amber-400 text-xs">Covered</Badge>}
                </div>
                <Button variant="ghost" size="icon" disabled={cannotCover} className={cn("h-9 w-9 disabled:opacity-30", person.covered ? "text-amber-400" : "text-muted-foreground")} aria-label={cannotCover ? "Need at least 2 people to split — can't cover everyone" : person.covered ? "Remove birthday/covered mode" : "Mark as covered (birthday mode)"} onClick={() => toggleCovered(person.id)}>
                  <Gift className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" aria-label={`Remove ${person.name}`} onClick={() => removePerson(person.id)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>);
            })}
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 p-4">
        <div className="nav-blur rounded-3xl border border-border/30 bg-card/80 backdrop-blur-xl p-5 shadow-lg shadow-black/20">
          <Button className="h-14 w-full rounded-2xl text-base font-semibold" disabled={!loaded || state.people.length < 2} onClick={() => router.push("/split/assign")}>
            {!loaded ? "Loading..." : state.people.length < 2 ? "Add at least 2 people" : `Continue with ${state.people.length} people`}
          </Button>
        </div>
      </div>
    </main>
  );
}
