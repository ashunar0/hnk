import type {
  Create__Entity__Input,
  Update__Entity__Input,
} from "@contract/__name__/type";
import type { Db } from "../../db";
import { forbidden, notFound } from "../../lib/errors";
import type {
  __Entity__Row,
  __Entity__UpdateValues,
  __Name__Repository,
} from "./repository";
import { __name__Repository } from "./repository";

export function __name__Service(repo: __Name__Repository) {
  const load = async (id: string): Promise<__Entity__Row> => {
    const row = await repo.findById(id);
    if (row === null) throw notFound();
    return row;
  };

  return {
    // 一覧。自分のものだけ、更新の新しい順
    async listMine(ownerId: string): Promise<__Entity__Row[]> {
      return repo.listByOwnerId(ownerId);
    },

    /** 他人のものは、在ることも知らせない */
    async get(id: string, viewerId: string): Promise<__Entity__Row> {
      const row = await load(id);
      if (row.ownerId !== viewerId) throw notFound();

      return row;
    },

    // 作成
    async create(
      ownerId: string,
      input: Create__Entity__Input,
    ): Promise<__Entity__Row> {
      const id = crypto.randomUUID();

      await repo.insert({
        id,
        ownerId,
        title: input.title,
        body: input.body,
      });

      return load(id);
    },

    /** 書き換えられるのは所有者だけ */
    async update(
      id: string,
      viewerId: string,
      input: Update__Entity__Input,
    ): Promise<__Entity__Row> {
      const current = await load(id);
      if (current.ownerId !== viewerId) throw forbidden();

      const values: __Entity__UpdateValues = {
        title: input.title,
        body: input.body,
        updatedAt: new Date(),
      };

      await repo.update(id, values);

      return load(id);
    },

    /** 消せるのは所有者だけ */
    async remove(id: string, viewerId: string): Promise<void> {
      const current = await load(id);
      if (current.ownerId !== viewerId) throw forbidden();

      await repo.deleteById(id);
    },
  };
}

export type __Name__Service = ReturnType<typeof __name__Service>;

export const wire__Name__ = (db: Db) => __name__Service(__name__Repository(db));
