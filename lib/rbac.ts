import type { Role } from "@prisma/client";
import type { SessionPayload } from "./auth";

/**
 * Central permission table. Every server action / API route must call
 * requireRole() (or a more specific helper below) before touching data —
 * route-level UI hiding is not access control, it's a convenience.
 */
export function requireRole(
  session: SessionPayload | null,
  allowed: Role[]
): asserts session is SessionPayload {
  if (!session || !allowed.includes(session.role)) {
    throw new Error("Forbidden: insufficient role.");
  }
}

export function requireAdmin(session: SessionPayload | null) {
  requireRole(session, ["ADMIN"]);
}

export function requireTasker(session: SessionPayload | null) {
  requireRole(session, ["TASKER"]);
}

/**
 * Ownership check for tasker-scoped resources (a submission, a wallet, a
 * withdrawal, etc.) — role alone isn't enough, a TASKER must also own the
 * row they're touching.
 */
export function requireOwnerOrAdmin(
  session: SessionPayload | null,
  resourceUserId: string
) {
  if (!session) throw new Error("Forbidden: not authenticated.");
  if (session.role === "ADMIN") return;
  if (session.userId !== resourceUserId) {
    throw new Error("Forbidden: not the resource owner.");
  }
}
