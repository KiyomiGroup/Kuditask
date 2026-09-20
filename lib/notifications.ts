import type { PrismaClient, Prisma } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

async function notify(db: Db, userId: string, title: string, body: string) {
  return db.notification.create({ data: { userId, title, body } });
}

// One function per event in the spec's notification list — thin wrappers,
// but keeping the copy centralized here means it's never duplicated across
// the route handlers that trigger these events.
export const notifications = {
  taskStarted: (db: Db, userId: string, taskTitle: string) =>
    notify(db, userId, "Task started", `Your 10-minute reservation for "${taskTitle}" has started.`),

  reservationExpiringSoon: (db: Db, userId: string, taskTitle: string) =>
    notify(db, userId, "Reservation expiring soon", `Your reservation for "${taskTitle}" expires in 2 minutes — submit your proof now.`),

  reservationExpired: (db: Db, userId: string, taskTitle: string) =>
    notify(db, userId, "Reservation expired", `Your reservation for "${taskTitle}" expired and the slot was released.`),

  proofSubmitted: (db: Db, userId: string, taskTitle: string) =>
    notify(db, userId, "Proof submitted", `Your proof for "${taskTitle}" is pending verification.`),

  proofApproved: (db: Db, userId: string, taskTitle: string) =>
    notify(db, userId, "Proof approved", `Your proof for "${taskTitle}" was approved.`),

  proofRejected: (db: Db, userId: string, taskTitle: string, reason?: string) =>
    notify(db, userId, "Proof rejected", `Your proof for "${taskTitle}" was rejected.${reason ? ` Reason: ${reason}.` : ""}`),

  fraudViolation: (db: Db, userId: string, taskTitle: string, stage: string) =>
    notify(db, userId, "Fraud violation flagged", `Your submission for "${taskTitle}" was flagged as a fraud violation (${stage}).`),

  rewardCredited: (db: Db, userId: string, amountNaira: string, taskTitle: string) =>
    notify(db, userId, "Reward credited", `₦${amountNaira} was credited to your wallet for "${taskTitle}".`),

  taskCompleted: (db: Db, userId: string, taskTitle: string) =>
    notify(db, userId, "Task completed", `"${taskTitle}" has reached its required completions and is now closed.`),
};
