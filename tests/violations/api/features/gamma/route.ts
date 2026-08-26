// ハンドラの形の違反をまとめて置く。動かない
import { Hono } from "hono";

declare const toList: (rows: unknown) => unknown;
declare const allowAnonymous: never;
declare const gamma: { list(): Promise<unknown>; count(): Promise<number> };

export const gammaRoute = new Hono()
  .get("/", allowAnonymous, async (c) => {
    // let-needs-a-contract-type: 注釈が無い
    let total = 0;
    total = await gamma.count();

    // 注釈があれば鳴らない。逃げ道は残してある
    let page: { items: unknown[] } = { items: [] };

    // one-c-json-per-handler: 成功形が 2 つある
    if (total === 0) return c.json(page);

    // no-await-in-call-arguments: 引数の中で待っている
    return c.json(toList(await gamma.list()));
  });
