import { existsSync, mkdtempSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const tempRoot = mkdtempSync(join(tmpdir(), "warikan-native-build-"));
const outDir = join(root, "out");
const hiddenPaths = [
  { source: join(root, "app", "api"), target: join(tempRoot, "api") },
  { source: join(root, "app", "join"), target: join(tempRoot, "join") },
];

const movedPaths = [];

try {
  for (const path of hiddenPaths) {
    if (existsSync(path.source)) {
      renameSync(path.source, path.target);
      movedPaths.push(path);
    }
  }

  const result = spawnSync("next", ["build"], {
    cwd: root,
    env: {
      ...process.env,
      NEXT_OUTPUT: "export",
      NEXT_PUBLIC_NATIVE_BUILD: "true",
    },
    shell: process.platform === "win32",
    stdio: "inherit",
  });

  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  for (const path of movedPaths.reverse()) {
    renameSync(path.target, path.source);
  }
  rmSync(tempRoot, { force: true, recursive: true });
}
