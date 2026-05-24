/**
 * RPC error handling for Hono route handlers.
 */

import { RPCError } from "./rpc.js";

export function handleRPCError(c: { json: Function }, err: unknown) {
  if (err instanceof RPCError) {
    const status =
      err.code === "unauthenticated"
        ? 401
        : err.code === "unavailable"
          ? 503
          : 500;
    return c.json({ error: err.message, code: err.code }, status);
  }
  const message = err instanceof Error ? err.message : String(err);
  return c.json({ error: message }, 500);
}
