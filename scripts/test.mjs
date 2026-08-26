#!/usr/bin/env node
/**
 * テンプレが規約から外れたことを、機械が気づくための唯一の手段。
 *
 * fixture を素に戻す → feature を生成する → 型検査を通す。
 * 単複が不規則な名前も通すため、2 本生成して両方が同居できることまで見る
 */
import { execFileSync } from "node:child_process";
import { readdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE = resolve(ROOT, "fixture");
const VIOLATIONS = resolve(ROOT, "tests/violations");
const OXLINT = resolve(FIXTURE, "node_modules/.bin/oxlint");

const FEATURES = ["invoices", "signupRequests"];

/** tests/violations/ にサンプルを持たせる規則。増やしたらここにも足す */
const RULES = [
  "no-foreign-repository",
  "no-foreign-service-from-service",
  "lib-stays-portable",
  "route-exports-only-the-route",
];

function run(cmd, args, cwd) {
  execFileSync(cmd, args, { cwd, stdio: "inherit" });
}

/** 落ちてよい前提で走らせ、出力を受け取る */
function capture(cmd, args, cwd) {
  try {
    return execFileSync(cmd, args, { cwd, encoding: "utf8" });
  } catch (err) {
    return `${err.stdout ?? ""}${err.stderr ?? ""}`;
  }
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

/**
 * 生成物を lint する。
 *
 * `oxlint .` では見られない——features/ は生成物なので gitignore してあり、
 * oxlint はディレクトリを歩くときに .gitignore を尊重する。しかも黙って緑を返す。
 * ファイルを1枚ずつ渡した時だけ ignore が外れるので、生成先を名指しする
 */
async function lintGenerated() {
  const files = [];
  for (const name of FEATURES) {
    const dir = `api/features/${name}`;
    for (const entry of await readdir(resolve(FIXTURE, dir))) {
      if (entry.endsWith(".ts")) files.push(`${dir}/${entry}`);
    }
  }
  if (files.length === 0) throw new Error("生成物が見つからない");
  run(OXLINT, files, FIXTURE);
}

/**
 * 規則が鳴ることを確かめる。
 *
 * 緑は「違反が無い」と「検査が壊れている」の両方から出る。区別する唯一の方法は、
 * 必ず違反しているコードを見せて、実際に鳴らせること。
 * tests/violations/ は各規則につき 1 件を持つ
 */
function lintViolations() {
  const out = capture(OXLINT, ["."], VIOLATIONS);
  const missing = RULES.filter((rule) => !out.includes(`hnk(${rule})`));

  if (missing.length > 0) {
    console.error(out);
    throw new Error(`違反サンプルに鳴らなかった規則がある: ${missing.join(", ")}`);
  }
}

await reset();

for (const name of FEATURES) {
  run("node", [resolve(ROOT, "bin/hnk.mjs"), "g", "feature", name], FIXTURE);
}

run("pnpm", ["typecheck"], FIXTURE);
run("pnpm", ["lint"], FIXTURE);
await lintGenerated();
lintViolations();

// 入口だけ素に戻す。git status を汚さないため。
// 生成された feature は読めるように残す（gitignore 済み）
run("git", ["checkout", "--", "fixture/api/index.ts"], ROOT);

console.log("\n\x1b[32m✓\x1b[0m 生成物が型検査と依存の検査を通り、依存の検査は違反に鳴りました");
console.log(`  読むなら ${FEATURES.map((n) => `fixture/api/features/${n}/`).join("  ")}`);
