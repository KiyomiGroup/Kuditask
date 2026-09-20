import { PrismaClient, Prisma, ReservationStatus } from "@prisma/client";

export const RESERVATION_MINUTES = 10; // LOCKED — the one source of truth other files should import instead of hardcoding

/**
 * Claim a task slot for a tasker. Server-authoritative: expiry is computed
 * here from the server clock and stored on the row, never trusted from the
 * client. Concurrency-safe: wraps the "count active reservations/assignments
 * vs requiredCompletions" check and the insert in a single serializable
 * transaction so two taskers racing for the last slot can't both win it.
 */
export async function startTask(
  db: PrismaClient,
  taskId: string,
  taskerId: string
) {
  return db.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const task = await tx.task.findUniqueOrThrow({ where: { id: taskId } });

      if (task.status !== "ACTIVE" && task.status !== "IN_PROGRESS") {
        throw new Error("Task is not open for new reservations.");
      }

      // Release any of this tasker's own stale reservations on this task
      // first so a retry doesn't pile up dead rows.
      await expireStaleReservations(tx, taskId);

      const heldSlots = await tx.taskReservation.count({
        where: { taskId, status: "ACTIVE" },
      });
      const takenSlots = task.verifiedCompletions + heldSlots;

      if (takenSlots >= task.requiredCompletions) {
        throw new Error("No slots remaining on this task.");
      }

      const existing = await tx.taskReservation.findFirst({
        where: { taskId, taskerId, status: "ACTIVE" },
      });
      if (existing) {
        throw new Error("You already have an active reservation on this task.");
      }

      const expiresAt = new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000);

      const reservation = await tx.taskReservation.create({
        data: { taskId, taskerId, status: "ACTIVE", expiresAt },
      });

      if (task.status === "ACTIVE") {
        await tx.task.update({
          where: { id: taskId },
          data: { status: "IN_PROGRESS" },
        });
      }

      return reservation;
    },
    { isolationLevel: "Serializable" }
  );
}

/**
 * Flips any ACTIVE reservations on a task whose expiresAt has passed to
 * EXPIRED, freeing the slot. Call this at the top of any read/write path
 * that depends on slot availability (starting a task, submitting proof,
 * admin task views) — do not rely solely on a background cron, since a
 * cron-only sweep leaves a window where an expired-but-unswept reservation
 * still looks ACTIVE.
 */
export async function expireStaleReservations(
  db: PrismaClient | Prisma.TransactionClient,
  taskId?: string
) {
  return db.taskReservation.updateMany({
    where: {
      status: "ACTIVE",
      expiresAt: { lt: new Date() },
      ...(taskId ? { taskId } : {}),
    },
    data: { status: "EXPIRED" },
  });
}

/**
 * Validates a reservation is still ACTIVE and unexpired before accepting a
 * proof submission. Never trust a client-supplied "time remaining" value —
 * this re-checks expiresAt against the server clock.
 */
export async function assertReservationValidForSubmission(
  db: PrismaClient,
  reservationId: string,
  taskerId: string
) {
  const reservation = await db.taskReservation.findUniqueOrThrow({
    where: { id: reservationId },
  });

  if (reservation.taskerId !== taskerId) {
    throw new Error("This reservation does not belong to you.");
  }
  if (reservation.status !== "ACTIVE" as ReservationStatus) {
    throw new Error("This reservation is no longer active.");
  }
  if (reservation.expiresAt.getTime() < Date.now()) {
    await db.taskReservation.update({
      where: { id: reservationId },
      data: { status: "EXPIRED" },
    });
    throw new Error("This reservation has expired.");
  }
  return reservation;
}
