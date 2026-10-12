# hnk

> [!IMPORTANT]
> **This project has moved to [hono-kit](https://github.com/ashunar0/hono-kit)** (`pnpm create hnk`). This repository is archived.
>
> **このプロジェクトは [hono-kit](https://github.com/ashunar0/hono-kit) に移りました**（`pnpm create hnk`）。このリポジトリはアーカイブ済みです。

Hono backend kit — 規約に沿った feature 一式を生成する CLI。

> **作りかけです。** 規約そのものを実プロジェクトで検証しながら育てている途中なので、
> 生成されるファイルの形も CLI のインターフェースも予告なく変わります。

Hono は意図的に unopinionated で、層の切り方も命名も持っていない。hnk はそこに規約を注入する。
`rails g` が Rails に対して持っている役割を、Hono に対して持たせるもの。

## なぜ作るか

規約を散文（ドキュメントや AI 向けの指示）で書いても、守られるかどうかは確率になる。
特にブレるのは **参照できる既存実装が無い瞬間** ——つまり feature の1本目を書くとき。

hnk は骨組みを決定論的に出力することで、その瞬間そのものを消す。
1本目が正しい形で出れば、2本目以降は「既存を真似る」で自然に揃う。

散文が要らなくなった分だけ、規約を書いたドキュメントは短くできる。

## インストール

```bash
npm i -g @ashunar0/hnk
```

## 使い方

```bash
hnk init                 # 土台。プロジェクトに 1 回だけ
hnk g feature invoices   # feature 一式。何度でも
```

feature 名は **camelCase の複数形**。ここから単数形・PascalCase・snake_case・kebab-case が
すべて導出されるので、指定するのはこれ 1 つだけ。

## 生成されるもの

### `hnk init` — 土台

feature が import する側。**中身は `fixture/api/` そのもの**で、別のテンプレートは持たない。
二重に持てば必ず片方が古くなり、`tsc` が守っているのは fixture のほうだから。

```
api/lib/errors.ts       ApiError と唯一の onError、失敗のファクトリ
api/lib/validator.ts    応答せず throw する validator
api/lib/repository.ts   loadById — 不在を失敗に変える
api/db/index.ts         wireDb と Db 型
api/env.ts              AppEnv
api/middleware/auth.ts  withViewer / requireAuth
api/index.ts            ルート 0 本のチェーン
```

### `hnk g feature <name>` — feature

CRUD 5 本（一覧 / 1件 / 作成 / 更新 / 削除）を持つ feature 一式と、アプリ入口への mount。

```
contract/invoices/schema.ts       request / response schema
contract/invoices/type.ts         z.infer の別名
api/features/invoices/table.ts        保存される形
api/features/invoices/repository.ts   SQL、行を返す
api/features/invoices/service.ts      ドメインルール。末尾に wireInvoices
api/features/invoices/presenter.ts    行 → 応答型、純関数
api/features/invoices/route.ts        Hono のチェーン
api/index.ts                          .route(...) を 1 行足す
```

**出さないもの**にも意味がある。

- `policy.ts` — 述語を 2 つの層が読むようになってから作る。1 人しか読まないうちは呼び出し側に置く
- `usecases/` — 他ドメインが状態を変えに来るときだけ作る
- ページング — 要るかどうかは画面が決める

## ルートの名前

`contract/` `api/` `web/` が既定。フロントとバックエンドが 1 デプロイ単位か 2 つかで
構成が変わるので、決め打ちにはしない。変えるときはプロジェクト直下に `hnk.json` を置く。

```json
{
  "roots": { "contract": "contract", "api": "server", "web": "src" }
}
```

## 開発

依存ゼロ・ビルドなしの単一 `.mjs`。`bin/hnk.mjs` を直接編集する。

```bash
pnpm link --global   # ローカルの変更が即 hnk に反映される
```

### fixture とテスト

`fixture/` は生成先の最小プロジェクト。`lib` と `db` と `middleware` だけを持ち、
feature は 1 つも入っていない。

```bash
cd fixture && pnpm install
pnpm test            # fixture を素に戻す → 2 本生成する → tsc を通す
```

**テンプレが規約から外れたことに機械が気づく唯一の手段がこれ。**
散文のテンプレートには真似できないので、規約を直したらまずここを赤くしてから直す。

fixture は同時に、規約が指す参照実装を兼ねる。
`middleware/auth.ts` の `withViewer` だけは本物と違い、認証提供元を持たず常に `null` を積む。
