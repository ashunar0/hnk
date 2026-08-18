import type { Context, MiddlewareHandler } from "hono";
import type { AppEnv } from "../env";
import { ApiError } from "../lib/errors";

/**
 * 閲覧者を文脈に積む。未ログインでも通す。
 *
 * 本物のプロジェクトでは features/auth/ が cookie のセッションを解いて渡す。
 * fixture は型検査しかしないので、認証提供元を持たず常に null を積む
 */
export const withViewer: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.set("viewerId", null);
  await next();
};

/** ログインを要求する。未ログインならここで 401 を投げる */
export const requireViewer = (c: Context<AppEnv>): string => {
  const viewerId = c.get("viewerId");
  if (viewerId === null) {
    throw new ApiError("UNAUTHORIZED", 401, "ログインが必要です");
  }
  return viewerId;
};
