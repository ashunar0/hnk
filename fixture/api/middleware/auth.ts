import { createMiddleware } from "hono/factory";
import type { MiddlewareHandler } from "hono";
import type { AppEnv, AuthVariables } from "../env";
import { unauthorized } from "../lib/errors";

/**
 * 閲覧者を文脈に積む。未ログインでも通す。
 *
 * TODO: features/auth/ が cookie のセッションを解いて返すようになったら、
 * その結果を積む。認証提供元がまだ無いあいだは常に null
 */
export const withViewer: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.set("viewerId", null);
  await next();
};

/**
 * ログインを要求する。チェーンに置くと、その先の handler で
 * authUserId が string になる（viewerId は null を含んだまま）
 */
export const requireAuth = createMiddleware<{
  Variables: AuthVariables & { authUserId: string };
}>(async (c, next) => {
  const viewerId = c.get("viewerId");
  if (viewerId === null) throw unauthorized();

  c.set("authUserId", viewerId);
  await next();
});
