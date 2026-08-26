#!/usr/bin/env node
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PKG_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CWD = process.cwd();

// ---------- utils ----------

export function log(...args) {
  console.log(...args);
}
export function ok(...args) {
  console.log("\x1b[32m✓\x1b[0m", ...args);
}
export function warn(...args) {
  console.warn("\x1b[33m!\x1b[0m", ...args);
}
export function err(...args) {
  console.error("\x1b[31m✗\x1b[0m", ...args);
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

// ---------- naming ----------

/** invoices -> invoice / categories -> category / signupRequests -> signupRequest */
function singular(s) {
  if (/ies$/.test(s)) return s.replace(/ies$/, "y");
  if (/(s|x|z|ch|sh)es$/.test(s)) return s.replace(/es$/, "");
  if (/s$/.test(s)) return s.replace(/s$/, "");
  return s;
}

function pascal(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** signupRequests -> signup_requests */
function snake(s) {
  return s.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

/** signupRequests -> signup-requests */
function kebab(s) {
  return s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

/** feature 名から、テンプレに差し込む語をすべて導出する。 */
function derive(name) {
  const entity = singular(name);
  return {
    __name__: name,
    __Name__: pascal(name),
    __entity__: entity,
    __Entity__: pascal(entity),
    __snake__: snake(name),
    __kebab__: kebab(name),
  };
}

// ---------- roots ----------

/**
 * ルートの名前は決め打ちにしない。フロントとバックエンドが 1 デプロイ単位か
 * 2 つかで構成が変わるため、プロジェクト側の hnk.json が答える
 */
const DEFAULT_ROOTS = { contract: "contract", api: "api", web: "web" };

async function roots() {
  const path = resolve(CWD, "hnk.json");
  if (!(await exists(path))) return DEFAULT_ROOTS;

  const config = JSON.parse(await readFile(path, "utf8"));
  return { ...DEFAULT_ROOTS, ...config.roots };
}

async function version() {
  const pkg = JSON.parse(await readFile(resolve(PKG_ROOT, "package.json"), "utf8"));
  return pkg.version;
}

const HELP = `
hnk - Hono backend kit

USAGE
  hnk <command> [options]

COMMANDS
  init                        土台を置く（lib / db / middleware / アプリ入口）
  g, generate <type> <name>   規約に沿ったコードを生成する
                              type: feature

OPTIONS
  -h, --help                  このヘルプを表示
  -v, --version               バージョンを表示

EXAMPLES
  hnk init
  hnk g feature invoices
`;

// ---------- commands ----------

/** テンプレ名 -> 出力先。schema/type は FE と共有するので contract に置く。 */
const FEATURE_FILES = [
  { tmpl: "schema.ts", out: (r, n) => `${r.contract}/${n}/schema.ts` },
  { tmpl: "type.ts", out: (r, n) => `${r.contract}/${n}/type.ts` },
  { tmpl: "table.ts", out: (r, n) => `${r.api}/features/${n}/table.ts` },
  { tmpl: "repository.ts", out: (r, n) => `${r.api}/features/${n}/repository.ts` },
  { tmpl: "service.ts", out: (r, n) => `${r.api}/features/${n}/service.ts` },
  { tmpl: "presenter.ts", out: (r, n) => `${r.api}/features/${n}/presenter.ts` },
  { tmpl: "route.ts", out: (r, n) => `${r.api}/features/${n}/route.ts` },
];

/**
 * アプリの入口へ 1 本足す。チェーンは途切れさせない。
 * 形が想定と違えば触らず、手で足す指示を返す
 */
async function mount(rootDir, name, words) {
  const path = resolve(CWD, rootDir, "index.ts");
  const line = `import { ${name}Route } from "./features/${name}/route";`;
  const call = `  .route("/api/${words.__kebab__}", ${name}Route)`;

  if (!(await exists(path))) return { done: false, line, call };

  const src = await readFile(path, "utf8");
  if (src.includes(line)) return { done: false, line, call };

  const lines = src.split("\n");
  const lastImport = lines.findLastIndex((l) => l.startsWith("import "));
  const onError = lines.findIndex((l) => /^\s*\.onError\(/.test(l));
  if (lastImport === -1 || onError === -1) return { done: false, line, call };

  lines.splice(onError, 0, call);
  lines.splice(lastImport + 1, 0, line);
  await writeFile(path, lines.join("\n"));

  return { done: true, path: relative(CWD, path) };
}

/**
 * 土台を置く。中身は fixture/api そのもので、別のテンプレートは持たない。
 * 二重に持つと必ず片方が古くなり、fixture は tsc が守っているほうだから
 */
const APP_FILES = [
  "db/index.ts",
  "env.ts",
  "index.ts",
  "lib/errors.ts",
  "lib/repository.ts",
  "lib/validator.ts",
  "middleware/auth.ts",
];

/** プロジェクトルートに置くもの。lint は サーバールートの外から中を見る */
const ROOT_FILES = [".oxlintrc.json", "hnk-lint-plugin.mjs", ".prettierrc"];

async function init() {
  const dirs = await roots();
  const created = [];
  const skipped = [];

  for (const rel of APP_FILES) {
    const outPath = resolve(CWD, dirs.api, rel);
    if (await exists(outPath)) {
      skipped.push(relative(CWD, outPath));
      continue;
    }

    const body = await readFile(resolve(PKG_ROOT, "fixture/api", rel), "utf8");
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, body);
    created.push(relative(CWD, outPath));
  }

  for (const rel of ROOT_FILES) {
    const outPath = resolve(CWD, rel);
    if (await exists(outPath)) {
      skipped.push(relative(CWD, outPath));
      continue;
    }

    // 設定の中の api/ は、このプロジェクトのサーバールートに読み替える
    const body = (await readFile(resolve(PKG_ROOT, "fixture", rel), "utf8"))
      .replaceAll('"api/**/*.ts"', `"${dirs.api}/**/*.ts"`);
    await writeFile(outPath, body);
    created.push(relative(CWD, outPath));
  }

  for (const rel of [dirs.contract, dirs.web]) {
    await mkdir(resolve(CWD, rel), { recursive: true });
  }

  for (const p of created) ok(`created  ${p}`);
  for (const p of skipped) warn(`skipped  ${p} (既にあります)`);

  if (created.length === 0) return;

  log("");
  log("残りは手で用意してください:");
  log(`  tsconfig の paths に @contract/* → ${dirs.contract}/*、@/* → ${dirs.web}/*`);
  log("  バンドラの resolve.alias に同じ 2 本（1 デプロイ単位のときは両方に要る）");
  log("  Env の束縛（wrangler types など）");
  log("  pnpm add -D oxlint prettier（依存の検査と整形はこの 2 つで走ります）");
}

/**
 * 置換のあとに整形する。
 *
 * テンプレを事前に整形しておくことはできない——Prettier は幅で折り返すので、
 * 名前を差し込んだ時点で正しい改行位置が変わる。短い名前なら 1 行に畳まれ、
 * 長い名前なら展開される。だから「生成した直後は整形済み」を保つには、
 * 差し込んだあとに通すしかない。
 *
 * Prettier はプロジェクトのものを使う。無ければ黙って飛ばす（hnk の依存にしない）
 */
async function formatGenerated(paths) {
  let prettier;
  try {
    const mod = await import(createRequire(resolve(CWD, "package.json")).resolve("prettier"));
    prettier = mod.resolveConfig ? mod : mod.default;
  } catch {
    return false;
  }
  if (!prettier?.format) return false;

  for (const path of paths) {
    const source = await readFile(path, "utf8");
    const options = await prettier.resolveConfig(path);
    await writeFile(path, await prettier.format(source, { ...options, filepath: path }));
  }
  return true;
}

async function generateFeature(name) {
  if (!/^[a-z][a-zA-Z0-9]*$/.test(name)) {
    err(`feature 名は camelCase で指定してください (例: invoices, signupRequests)`);
    process.exit(1);
  }

  const words = derive(name);
  const dirs = await roots();
  const created = [];
  const skipped = [];
  const written = [];

  for (const { tmpl, out } of FEATURE_FILES) {
    const outPath = resolve(CWD, out(dirs, name));
    if (await exists(outPath)) {
      skipped.push(relative(CWD, outPath));
      continue;
    }

    let body = await readFile(resolve(PKG_ROOT, "templates/feature", tmpl), "utf8");
    for (const [key, value] of Object.entries(words)) {
      body = body.replaceAll(key, value);
    }

    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, body);
    written.push(outPath);
    created.push(relative(CWD, outPath));
  }

  const formatted = await formatGenerated(written);

  for (const p of created) ok(`created  ${p}`);
  for (const p of skipped) warn(`skipped  ${p} (既にあります)`);
  if (!formatted && created.length > 0) {
    warn("prettier が見つからないので整形していません (pnpm add -D prettier)");
  }

  if (created.length === 0) return;

  const mounted = await mount(dirs.api, name, words);
  if (mounted.done) {
    ok(`mounted  ${mounted.path}`);
    return;
  }

  log("");
  log(`${dirs.api}/index.ts に mount してください:`);
  log("");
  log(`  ${mounted.line}`);
  log(`${mounted.call}`);
}

async function generate(args) {
  const [type, name] = args;

  if (!type) {
    err("生成する type を指定してください (例: hnk g feature invoices)");
    process.exit(1);
  }
  if (type !== "feature") {
    err(`未知の type: ${type}  (使えるのは: feature)`);
    process.exit(1);
  }
  if (!name) {
    err("feature 名を指定してください (例: hnk g feature invoices)");
    process.exit(1);
  }

  await generateFeature(name);
}

// ---------- entry ----------

async function main() {
  const argv = process.argv.slice(2);
  const [command, ...rest] = argv;

  if (!command || command === "-h" || command === "--help" || command === "help") {
    log(HELP.trim());
    return;
  }
  if (command === "-v" || command === "--version") {
    log(await version());
    return;
  }

  switch (command) {
    case "init":
      await init();
      break;
    case "g":
    case "generate":
      await generate(rest);
      break;
    default:
      err(`未知のコマンド: ${command}`);
      log(HELP.trim());
      process.exit(1);
  }
}

main().catch((e) => {
  err(e.message);
  process.exit(1);
});
