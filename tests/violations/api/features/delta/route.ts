// 認証の指定が無い opener。動かない
import { Hono } from "hono";

declare const requireAuth: never;
declare const allowAnonymous: never;

export const deltaRoute = new Hono()
  // route-declares-auth: 所有者で絞らないので authUserId を読まない。
  // guard が無くても tsc は通る —— ここが今まで silent だった穴
  .get("/stats", async (c) => {
    return c.json({ total: 0 });
  })
  // 明示すれば通る
  .get("/public", allowAnonymous, async (c) => {
    return c.json({ ok: true });
  })
  // 認証ありも通る
  .get("/", requireAuth, async (c) => {
    return c.json({ items: [] });
  });
