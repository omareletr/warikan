// Builds the iOS app against the live API and uploads it to TestFlight.
// Signing and upload use the Apple account signed in to Xcode; the build
// number is a timestamp so every upload is accepted as newer.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const iosDir = join(root, "ios", "App");
const workDir = mkdtempSync(join(tmpdir(), "warikan-testflight-"));
const archivePath = join(workDir, "Warikan.xcarchive");
const buildNumber = new Date().toISOString().replace(/\D/g, "").slice(0, 12);

// CocoaPods fails with an encoding error unless the locale is UTF-8.
const env = { ...process.env, LANG: "en_US.UTF-8", LC_ALL: "en_US.UTF-8" };
// Never ship a build pointed at a local dev server.
delete env.NEXT_PUBLIC_APP_URL;

function run(command, args, cwd = root) {
  console.log(`\n> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { cwd, env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with ${result.status}`);
}

try {
  run("npm", ["run", "cap:sync:ios"]);
  run(
    "xcodebuild",
    [
      "-workspace", "App.xcworkspace",
      "-scheme", "App",
      "-configuration", "Release",
      "-destination", "generic/platform=iOS",
      "-archivePath", archivePath,
      "-allowProvisioningUpdates",
      `CURRENT_PROJECT_VERSION=${buildNumber}`,
      "archive",
    ],
    iosDir,
  );
  run(
    "xcodebuild",
    [
      "-exportArchive",
      "-archivePath", archivePath,
      "-exportOptionsPlist", join(iosDir, "ExportOptions.plist"),
      "-exportPath", join(workDir, "export"),
      "-allowProvisioningUpdates",
    ],
    iosDir,
  );
  console.log(`\nUploaded build ${buildNumber} to TestFlight. Apple takes ~5-15 minutes to process it.`);
} catch (error) {
  console.error(`\nTestFlight upload failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  rmSync(workDir, { force: true, recursive: true });
}
