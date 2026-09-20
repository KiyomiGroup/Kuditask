import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE_NAME, type SessionPayload } from "./auth";

/**
 * Reads and verifies the session cookie for the current request. Returns
 * null if absent/invalid/expired — callers decide what to do about that
 * (redirect, throw, etc.) via lib/rbac.ts.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
