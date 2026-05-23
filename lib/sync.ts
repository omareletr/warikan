import { getSplits } from "@/lib/splits";
import { getFirestoreSplits, saveFirestoreSplit } from "@/lib/firestore-splits";

/**
 * On sign-in, upload any locally-saved splits that don't exist in Firestore yet.
 * This ensures splits made before signing in are preserved in the cloud.
 */
export async function mergeLocalSplitsToFirestore(userId: string): Promise<void> {
  const local = getSplits();
  if (local.length === 0) return;
  const remote = await getFirestoreSplits(userId);
  const remoteIds = new Set(remote.map((s) => s.id));
  await Promise.all(
    local
      .filter((s) => !remoteIds.has(s.id))
      .map((s) => saveFirestoreSplit(userId, s))
  );
}
