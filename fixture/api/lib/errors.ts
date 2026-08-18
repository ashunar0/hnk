import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL";

/** 失敗は必ず throw する。返り値にすると RPC の推論に混ざる */
export class ApiError extends HTTPException {
  constructor(
    readonly code: ApiErrorCode,
    readonly httpStatus: ContentfulStatusCode,
    message: string,
  ) {
    super(httpStatus, { message });
  }
}

/** 全ての失敗の唯一の出口 */
export const onError: ErrorHandler = (err, c) => {
  if (err instanceof ApiError) {
    return c.json(
      { error: { code: err.code, message: err.message } },
      err.httpStatus,
    );
  }
  if (err instanceof HTTPException) {
    return c.json(
      { error: { code: "INTERNAL", message: err.message } },
      err.status as ContentfulStatusCode,
    );
  }
  console.error("[unhandled]", err);
  return c.json(
    { error: { code: "INTERNAL", message: "Internal Server Error" } },
    500,
  );
};
