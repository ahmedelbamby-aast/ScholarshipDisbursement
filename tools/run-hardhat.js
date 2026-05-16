/**
 * Hardhat CLI wrapper.
 *
 * Responsibilities:
 * - Launches local project hardhat CLI with inherited stdio.
 * - Overrides `LOCALAPPDATA` so Hardhat v3 cache paths remain project-scoped on Windows.
 *
 * Why this exists:
 * - Avoids host-global cache/path collisions in multi-project environments.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const hardhatBin = path.join("node_modules", "hardhat", "dist", "src", "cli.js");
const hardhatArgs = process.argv.slice(2);

const child = spawn(
  process.execPath,
  [hardhatBin, ...hardhatArgs],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      // Hardhat v3 cache path is derived from OS app-data; isolate it per-project on Windows.
      LOCALAPPDATA: path.resolve(process.cwd(), ".hardhat-localappdata"),
    },
  }
);

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
