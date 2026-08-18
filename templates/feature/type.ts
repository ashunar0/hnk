import type { z } from "zod";
import type {
  create__Entity__InputSchema,
  __entity__ResponseSchema,
  list__Name__ResponseSchema,
  update__Entity__InputSchema,
} from "./schema";

export type Create__Entity__Input = z.infer<typeof create__Entity__InputSchema>;
export type Update__Entity__Input = z.infer<typeof update__Entity__InputSchema>;
export type __Entity__Response = z.infer<typeof __entity__ResponseSchema>;
export type List__Name__Response = z.infer<typeof list__Name__ResponseSchema>;
