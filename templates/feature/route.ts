import { Hono } from "hono";
import {
  create__Entity__InputSchema,
  update__Entity__InputSchema,
} from "@contract/__name__/schema";
import { wireDb } from "../../db";
import type { AppEnv } from "../../env";
import { validateBody } from "../../lib/validator";
import { requireAuth } from "../../middleware/auth";
import { to__Entity__, toList } from "./presenter";
import { wire__Name__ } from "./service";

// prettier-ignore
export const __name__Route = new Hono<AppEnv>()
  // 一覧
  .get(
    "/",
    requireAuth,
    async (c) => {
      const viewerId = c.get("authUserId");
      const db = wireDb(c.env.DB);
      const __name__ = wire__Name__(db);

      const rows = await __name__.listMine(viewerId);

      return c.json(toList(rows));
    }
  )
  // 1件
  .get(
    "/:id",
    requireAuth,
    async (c) => {
      const id = c.req.param("id");
      const viewerId = c.get("authUserId");
      const db = wireDb(c.env.DB);
      const __name__ = wire__Name__(db);

      const row = await __name__.get(id, viewerId);

      return c.json(to__Entity__(row));
    }
  )
  // 作成
  .post(
    "/",
    requireAuth,
    validateBody(create__Entity__InputSchema),
    async (c) => {
      const input = c.req.valid("json");
      const viewerId = c.get("authUserId");
      const db = wireDb(c.env.DB);
      const __name__ = wire__Name__(db);

      const row = await __name__.create(viewerId, input);

      return c.json(to__Entity__(row));
    }
  )
  // 更新
  .put(
    "/:id",
    requireAuth,
    validateBody(update__Entity__InputSchema),
    async (c) => {
      const id = c.req.param("id");
      const input = c.req.valid("json");
      const viewerId = c.get("authUserId");
      const db = wireDb(c.env.DB);
      const __name__ = wire__Name__(db);

      const row = await __name__.update(id, viewerId, input);

      return c.json(to__Entity__(row));
    }
  )
  // 削除
  .delete(
    "/:id",
    requireAuth,
    async (c) => {
      const id = c.req.param("id");
      const viewerId = c.get("authUserId");
      const db = wireDb(c.env.DB);
      const __name__ = wire__Name__(db);

      await __name__.remove(id, viewerId);

      return c.json({ ok: true });
    }
  );
