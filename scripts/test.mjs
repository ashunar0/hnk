#!/usr/bin/env node
/**
 * テンプレが規約から外れたことを、機械が気づくための唯一の手段。
 *
 * fixture を素に戻す → feature を生成する → 型検査を通す。
 * 単複が不規則な名前も通すため、2 本生成して両方が同居できることまで見る
 */
import { execFileSync } from "node:child_process";
import { rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE = resolve(ROOT, "fixture");

const FEATURES = ["invoices", "signupRequests"];

function run(cmd, args, cwd) {
  execFileSync(cmd, args, { cwd, stdio: "inherit" });
}

async function reset() {
  await rm(resolve(FIXTURE, "api/features"), { recursive: true, force: true });
  for (const name of FEATURES) {
    await rm(resolve(FIXTURE, "contract", name), {
      recursive: true,
      force: true,
    });
  }
  run("git", ["checkout", "--", "fixture/api/index.ts"], ROOT);
}

await reset();

for (const name of FEATURES) {
  run("node", [resolve(ROOT, "bin/hnk.mjs"), "g", "feature", name], FIXTURE);
}

run("pnpm", ["typecheck"], FIXTURE);
run("pnpm", ["lint"], FIXTURE);

// 入口だけ素に戻す。git status を汚さないため。
// 生成された feature は読めるように残す（gitignore 済み）
run("git", ["checkout", "--", "fixture/api/index.ts"], ROOT);

console.log("\n\x1b[32m✓\x1b[0m 生成物が型検査と依存の検査を通りました");
console.log(`  読むなら ${FEATURES.map((n) => `fixture/api/features/${n}/`).join("  ")}`);
