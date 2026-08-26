import path from "node:path";

/**
 * 依存の向きを見る。grep は書かれた文字列を見るので `../` の数に縛られるが、
 * ここは解決したパスで判定するので、相対の深さが変わっても効き続ける
 */

const fileOf = (context) => context.filename ?? context.getFilename();

/** このファイルが属する feature 名。features/ の外なら undefined */
const featureOf = (file) => file.match(/[/\\]features[/\\]([^/\\]+)[/\\]/)?.[1];

/** 相対 import だけ解決する。パッケージやエイリアスは対象外 */
const resolveRelative = (file, specifier) =>
  specifier.startsWith(".")
    ? path.resolve(path.dirname(file), specifier)
    : null;

/** 解決先が features/<name>/<layer> なら、その組を返す */
const layerAt = (resolved, layer) =>
  resolved?.match(
    new RegExp(`[/\\\\]features[/\\\\]([^/\\\\]+)[/\\\\]${layer}$`),
  )?.[1];

/** route.ts か。features 配下のものだけを見る */
const isRouteFile = (file) =>
  /[/\\]features[/\\][^/\\]+[/\\]route\.ts$/.test(file);

/**
 * 式の根まで降りて `new Hono()` かどうかを見る。
 * `new Hono<AppEnv>().get(...).post(...)` はチェーンなので、
 * CallExpression と MemberExpression を剥がしてから判定する
 */
const rootsAtNewHono = (node) => {
  let cur = node;
  while (cur) {
    if (cur.type === "CallExpression") cur = cur.callee;
    else if (cur.type === "MemberExpression") cur = cur.object;
    else break;
  }
  return cur?.type === "NewExpression" && cur.callee?.name === "Hono";
};

/** その export 宣言が Hono インスタンスそのものか */
const isTheRouteExport = (node) =>
  node.exportKind !== "type" &&
  node.declaration?.type === "VariableDeclaration" &&
  node.declaration.declarations.length === 1 &&
  rootsAtNewHono(node.declaration.declarations[0].init);

const foreignLayerRule = ({ layer, appliesTo, message }) => ({
  create(context) {
    const file = fileOf(context);
    const self = featureOf(file);
    if (!self) return {};
    if (appliesTo && !appliesTo.test(file)) return {};

    return {
      ImportDeclaration(node) {
        const target = layerAt(resolveRelative(file, node.source.value), layer);
        if (target && target !== self) {
          context.report({ node, message: message(target) });
        }
      },
    };
  },
});

const plugin = {
  meta: { name: "hnk" },
  rules: {
    "no-foreign-repository": foreignLayerRule({
      layer: "repository",
      message: (t) =>
        `他 feature の storage に手を伸ばしている（${t}）。読みは自分の repository の join で、書きは相手の usecases/ で`,
    }),

    "no-foreign-service-from-service": foreignLayerRule({
      layer: "service",
      appliesTo: /[/\\]service\.ts$/,
      message: (t) =>
        `service が他 feature を連れている（${t}）。読みなら route から、書きなら相手の usecases/ から`,
    }),

    /**
     * route.ts の公開面は mount する 1 本だけ。ヘルパを export すると
     * 他 feature がそこから掴めてしまい、mount チェーンが公開 API の一覧でなくなる
     */
    "route-exports-only-the-route": {
      create(context) {
        const file = fileOf(context);
        if (!isRouteFile(file)) return {};

        const report = (node) =>
          context.report({
            node,
            message:
              "route.ts が Hono インスタンス以外を export している。組み立てヘルパはこのファイル内に留める",
          });

        return {
          ExportNamedDeclaration(node) {
            if (!isTheRouteExport(node)) report(node);
          },
          ExportDefaultDeclaration: report,
          ExportAllDeclaration: report,
        };
      },
    },

    "lib-stays-portable": {
      create(context) {
        const file = fileOf(context);
        if (!/[/\\]lib[/\\]/.test(file)) return {};

        return {
          ImportDeclaration(node) {
            const resolved = resolveRelative(file, node.source.value);
            if (/[/\\](features|middleware|db)[/\\]/.test(resolved ?? "")) {
              context.report({
                node,
                message:
                  "lib/ は次のプロジェクトへ cp -r できるもの。この依存があると持ち出せない",
              });
            }
          },
        };
      },
    },
  },
};

export default plugin;
