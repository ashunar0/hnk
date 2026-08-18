import { Hono } from "hono";
import type { AppEnv } from "./env";
import { onError } from "./lib/errors";
import { withViewer } from "./middleware/auth";

const app = new Hono<AppEnv>()
  .use("*", withViewer)
  .onError(onError);

export type ApiApp = typeof app;
export default app;
