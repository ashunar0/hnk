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
