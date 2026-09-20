import type { PrismaClient, Prisma } from "@prisma/client";

/**
 * Writes one AuditLog row. Call this inside the same transaction as the
 * state change it's recording, so a logged action and its effect are always
 * consistent (never "logged but didn't happen" or vice versa).
 */
export async function logAction(
  db: PrismaClient | Prisma.TransactionClient,
  params: {
    actorId: string;
    action: string;
    targetType: string;
    targetId: string;
    metadata?: Record<string, unknown>;
  }
) {
  return db.auditLog.create({
    data: {
      actorId: params.actorId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}
