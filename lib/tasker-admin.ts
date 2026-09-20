import type { PrismaClient, AccountStatus } from "@prisma/client";
import { logAction } from "./audit";

export class TaskerAdminError extends Error {}

async function setAccountStatus(
  db: PrismaClient,
  adminId: string,
  taskerId: string,
  status: AccountStatus,
  action: string,
  reason?: string
) {
  return db.$transaction(async (tx) => {
    const profile = await tx.taskerProfile.findUniqueOrThrow({
      where: { id: taskerId },
      include: { user: true },
    });

    const updated = await tx.taskerProfile.update({
      where: { id: taskerId },
      data: { accountStatus: status },
    });

    await tx.notification.create({
      data: {
        userId: profile.userId,
        title: `Account ${status.replace(/_/g, " ").toLowerCase()}`,
        body: reason
          ? `Your account status changed to ${status.replace(/_/g, " ").toLowerCase()}: ${reason}`
          : `Your account status changed to ${status.replace(/_/g, " ").toLowerCase()}.`,
      },
    });

    await logAction(tx, {
      actorId: adminId,
      action,
      targetType: "TaskerProfile",
      targetId: taskerId,
      metadata: { newStatus: status, reason },
    });

    return updated;
  });
}

export const putUnderReview = (db: PrismaClient, adminId: string, taskerId: string, reason?: string) =>
  setAccountStatus(db, adminId, taskerId, "UNDER_REVIEW", "TASKER_UNDER_REVIEW", reason);

export const suspendTasker = (db: PrismaClient, adminId: string, taskerId: string, reason?: string) =>
  setAccountStatus(db, adminId, taskerId, "SUSPENDED", "TASKER_SUSPEND", reason);

export const banTasker = (db: PrismaClient, adminId: string, taskerId: string, reason?: string) =>
  setAccountStatus(db, adminId, taskerId, "BANNED", "TASKER_BAN", reason);

export const restoreTasker = (db: PrismaClient, adminId: string, taskerId: string, reason?: string) =>
  setAccountStatus(db, adminId, taskerId, "ACTIVE", "TASKER_RESTORE", reason);
