import type { PrismaClient } from "@prisma/client";
import { assertReservationValidForSubmission } from "./reservation";
import { notifications } from "./notifications";
import { addPendingReward } from "./wallet";

export class SubmissionError extends Error {}

/**
 * Submits proof for a reservation. Duplicate-submission protection is
 * layered:
 *   1. assertReservationValidForSubmission re-checks the reservation is
 *      ACTIVE and unexpired against the server clock (blocks: expired
 *      reservation, wrong tasker, already-SUBMITTED reservation since its
 *      status won't be ACTIVE anymore).
 *   2. TaskSubmission.reservationId has a DB-level UNIQUE constraint
 *      (schema.prisma) — a second submission row for the same reservation
 *      physically cannot be created, which is what actually stops a
 *      double-click or a duplicate API request racing the first one.
 */
export async function submitProof(
  db: PrismaClient,
  params: {
    reservationId: string;
    taskerId: string; // TaskerProfile.id, already resolved from the session
    userId: string; // User.id, for the notification
    screenshotUrl: string;
    submittedHandle?: string;
    declaredGenuine: boolean;
  }
) {
  if (!params.declaredGenuine) {
    throw new SubmissionError("You must confirm the proof is genuine before submitting.");
  }

  return db.$transaction(
    async (tx) => {
      const reservation = await assertReservationValidForSubmission(
        tx as unknown as PrismaClient,
        params.reservationId,
        params.taskerId
      );

      const task = await tx.task.findUniqueOrThrow({ where: { id: reservation.taskId } });

      let submission;
      try {
        submission = await tx.taskSubmission.create({
          data: {
            taskId: reservation.taskId,
            taskerId: params.taskerId,
            reservationId: reservation.id,
            screenshotUrl: params.screenshotUrl,
            submittedHandle: params.submittedHandle,
            declaredGenuine: params.declaredGenuine,
            status: "PENDING",
          },
        });
      } catch (err) {
        // P2002 on reservationId's unique constraint = this reservation
        // already has a submission (double-click / duplicate request).
        throw new SubmissionError(
          "A submission already exists for this reservation."
        );
      }

      await tx.taskReservation.update({
        where: { id: reservation.id },
        data: { status: "SUBMITTED" },
      });

      // Reward goes into "pending" the moment proof is submitted — it must
      // NOT become available until Admin approves (see lib/proof-review.ts).
      await addPendingReward(tx, params.taskerId, task.taskerRewardKobo);

      await notifications.proofSubmitted(tx, params.userId, task.title);

      return submission;
    },
    { isolationLevel: "Serializable" }
  );
}
