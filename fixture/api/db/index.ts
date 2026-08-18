import { drizzle } from "drizzle-orm/d1";

/** データベースドライバを名指しする、このプロジェクトで唯一の場所 */
export const wireDb = (binding: D1Database) => drizzle(binding);

export type Db = ReturnType<typeof wireDb>;
