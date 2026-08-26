import type { __Entity__Response, List__Name__Response } from "@contract/__name__/type";
import type { __Entity__Row } from "./repository";

export function to__Entity__(row: __Entity__Row): __Entity__Response {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  };
}

export function toList(rows: __Entity__Row[]): List__Name__Response {
  return { items: rows.map(to__Entity__) };
}
