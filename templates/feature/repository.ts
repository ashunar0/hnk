import { desc, eq } from "drizzle-orm";
import type { Db } from "../../db";
import { __snake__ } from "./table";

/** 保存されている 1 行。応答の形とは別 */
export type __Entity__Row = typeof __snake__.$inferSelect;

export type New__Entity__Row = typeof __snake__.$inferInsert;
export type __Entity__UpdateValues = Partial<New__Entity__Row>;

export type __Name__Repository = {
  listByOwnerId(ownerId: string): Promise<__Entity__Row[]>;
  findById(id: string): Promise<__Entity__Row | null>;
  insert(row: New__Entity__Row): Promise<void>;
  update(id: string, values: __Entity__UpdateValues): Promise<void>;
  deleteById(id: string): Promise<void>;
};

export function __name__Repository(db: Db): __Name__Repository {
  return {
    async listByOwnerId(ownerId) {
      return db
        .select()
        .from(__snake__)
        .where(eq(__snake__.ownerId, ownerId))
        .orderBy(desc(__snake__.updatedAt));
    },

    async findById(id) {
      const rows = await db
        .select()
        .from(__snake__)
        .where(eq(__snake__.id, id))
        .limit(1);

      return rows[0] ?? null;
    },

    async insert(row) {
      await db.insert(__snake__).values(row);
    },

    async update(id, values) {
      await db.update(__snake__).set(values).where(eq(__snake__.id, id));
    },

    async deleteById(id) {
      await db.delete(__snake__).where(eq(__snake__.id, id));
    },
  };
}
