import { z } from "zod";

export const TITLE_MAX = 100;
export const BODY_MAX = 20000;

export const titleSchema = z
  .string()
  .trim()
  .min(1, "タイトルを入力してください")
  .max(TITLE_MAX, `タイトルは${TITLE_MAX}文字以内です`);

export const bodySchema = z
  .string()
  .min(1, "本文を入力してください")
  .max(BODY_MAX, `本文は${BODY_MAX}文字以内です`);

export const create__Entity__InputSchema = z.object({
  title: titleSchema,
  body: bodySchema,
});

export const update__Entity__InputSchema = create__Entity__InputSchema;

export const __entity__ResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const list__Name__ResponseSchema = z.object({
  items: z.array(__entity__ResponseSchema),
});
