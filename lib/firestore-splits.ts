import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Split } from "@/lib/types";

function splitsRef(userId: string) {
  return collection(db, "users", userId, "splits");
}

export async function getFirestoreSplits(userId: string): Promise<Split[]> {
  const snap = await getDocs(query(splitsRef(userId), orderBy("date", "desc")));
  return snap.docs.map((d) => d.data() as Split);
}

export async function saveFirestoreSplit(userId: string, split: Split): Promise<void> {
  await setDoc(doc(splitsRef(userId), split.id), split);
}

export async function deleteFirestoreSplit(userId: string, splitId: string): Promise<void> {
  await deleteDoc(doc(splitsRef(userId), splitId));
}

export function subscribeToSplits(
  userId: string,
  onChange: (splits: Split[]) => void
): Unsubscribe {
  return onSnapshot(
    query(splitsRef(userId), orderBy("date", "desc")),
    (snap) => onChange(snap.docs.map((d) => d.data() as Split))
  );
}
