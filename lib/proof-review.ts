import type { PrismaClient, Prisma, RejectionReason } from "@prisma/client";
import { creditTaskReward, removePendingReward } from "./wallet";
import { determineFraudStage } from "./fraud";
import { notifications } from "./notifications";
import { logAction } from "./audit";
import { remainingCompletions } from "./tasks";

export class ReviewStateError extends Error {}

async function loadReviewableSubmission(
  tx: Prisma.TransactionClient,
  submissionId: string
) {
  const submission = await tx.taskSubmission.findUnique({
    where: { id: submissionId },
    include: { task: true, tasker: { include: { user: true } } },
  });
  if (!submission) throw new ReviewStateError("Submission not found.");

  // This is the primary guard against every "review the same submission
  // twice" edge case: approve-twice, reject-an-approved-proof,
  // approve-a-rejected-proof — all blocked by requiring PENDING here.
  // The ProofReview.submissionId unique constraint backs this up at the DB
  // level for the concurrent case (two admins reviewing at once).
  if (submission.status !== "PENDING") {
    throw new ReviewStateError(
      `Submission is already ${submission.status.toLowerCase()} — it cannot be reviewed again.`
    );
  }
  return submission;
}

/**
 * Approves a submission. Server-authoritative reward: pulled from
 * task.taskerRewardKobo, never from anything the client sends.
 */
export async function approveSubmission(
  db: PrismaClient,
  params: { submissionId: string; adminId: string; notes?: string }
) {
  return db.$transaction(async (tx) => {
    const submission = await loadReviewableSubmission(tx, params.submissionId);

    await tx.proofReview.create({
      data: {
        submissionId: submission.id,
        adminId: params.adminId,
        decision: "APPROVED",
        notes: params.notes,
      },
    });

    const updatedSubmission = await tx.taskSubmission.update({
      where: { id: submission.id },
      data: { status: "APPROVED" },
    });

    // verifiedCompletions increments ONLY here — on approval, never on
    // mere submission (submit-proof never touches this field).
    const updatedTask = await tx.task.update({
      where: { id: submission.taskId },
      data: { verifiedCompletions: { increment: 1 } },
    });

    let task = updatedTask;
    if (remainingCompletions(updatedTask) <= 0 && updatedTask.status !== "COMPLETED") {
      task = await tx.task.update({
        where: { id: updatedTask.id },
        data: { status: "COMPLETED" },
      });
    }

    await tx.taskerProfile.update({
      where: { id: submission.taskerId },
      data: { verifiedTaskCount: { increment: 1 } },
    });

    // Reward amount comes from the task row fetched server-side above —
    // there is no code path where a client-supplied amount reaches here.
    // creditTaskReward moves the amount from pending to available/lifetime
    // in the same call — no separate promotePending step needed.
    const { transaction: rewardTx } = await creditTaskReward(tx, {
      taskerId: submission.taskerId,
      taskId: submission.taskId,
      submissionId: submission.id,
      amountKobo: submission.task.taskerRewardKobo,
      description: `Approved: ${submission.task.title}`,
    });

    await notifications.proofApproved(tx, submission.tasker.userId, submission.task.title);
    await notifications.rewardCredited(
      tx,
      submission.tasker.userId,
      (submission.task.taskerRewardKobo / 100).toFixed(2),
      submission.task.title
    );
    if (task.status === "COMPLETED") {
      await notifications.taskCompleted(tx, submission.tasker.userId, submission.task.title);
    }

    await logAction(tx, {
      actorId: params.adminId,
      action: "PROOF_APPROVE",
      targetType: "TaskSubmission",
      targetId: submission.id,
      metadata: {
        taskId: submission.taskId,
        taskerId: submission.taskerId,
        rewardKobo: submission.task.taskerRewardKobo,
        taskStatus: task.status,
      },
    });

    return { submission: updatedSubmission, task, rewardTransactionId: rewardTx.id };
  }, { isolationLevel: "Serializable" });
}

/** Ordinary rejection — never creates a FraudViolation. */
export async function rejectSubmission(
  db: PrismaClient,
  params: {
    submissionId: string;
    adminId: string;
    reason: RejectionReason;
    notes?: string;
  }
) {
  return db.$transaction(async (tx) => {
    const submission = await loadReviewableSubmission(tx, params.submissionId);

    await tx.proofReview.create({
      data: {
        submissionId: submission.id,
        adminId: params.adminId,
        decision: "REJECTED",
        rejectionReason: params.reason,
        isFraudFlag: false,
        notes: params.notes,
      },
    });

    const updatedSubmission = await tx.taskSubmission.update({
      where: { id: submission.id },
      data: { status: "REJECTED" },
    });

    // Pending reward is removed WITHOUT ever creating a WalletTransaction —
    // per spec, a rejected pending reward is not a negative ledger event,
    // it's simply money that was never truly earned.
    await removePendingReward(tx, submission.taskerId, submission.task.taskerRewardKobo);

    // Deliberately untouched: task.verifiedCompletions, taskerProfile.verifiedTaskCount,
    // wallet available/lifetime balance — a normal rejection affects none of them.

    await notifications.proofRejected(
      tx,
      submission.tasker.userId,
      submission.task.title,
      params.reason.replace(/_/g, " ").toLowerCase()
    );

    await logAction(tx, {
      actorId: params.adminId,
      action: "PROOF_REJECT",
      targetType: "TaskSubmission",
      targetId: submission.id,
      metadata: { taskId: submission.taskId, taskerId: submission.taskerId, reason: params.reason },
    });

    return { submission: updatedSubmission };
  }, { isolationLevel: "Serializable" });
}

/**
 * Flags a submission as a fraud violation — a distinct action from
 * "Reject Proof", never triggered automatically by an ordinary rejection.
 * Applies the 1st/2nd/3rd-strike progression from lib/fraud.ts.
 */
export async function flagFraudViolation(
  db: PrismaClient,
  params: {
    submissionId: string;
    adminId: string;
    reason: RejectionReason;
    notes?: string;
  }
) {
  return db.$transaction(async (tx) => {
    const submission = await loadReviewableSubmission(tx, params.submissionId);

    const review = await tx.proofReview.create({
      data: {
        submissionId: submission.id,
        adminId: params.adminId,
        decision: "FRAUD_FLAGGED",
        rejectionReason: params.reason,
        isFraudFlag: true,
        notes: params.notes,
      },
    });

    const updatedSubmission = await tx.taskSubmission.update({
      where: { id: submission.id },
      data: { status: "FRAUD_FLAGGED" },
    });

    await removePendingReward(tx, submission.taskerId, submission.task.taskerRewardKobo);

    const existingViolationCount = await tx.fraudViolation.count({
      where: { taskerId: submission.taskerId },
    });
    const stage = determineFraudStage(existingViolationCount);

    const violation = await tx.fraudViolation.create({
      data: { taskerId: submission.taskerId, reviewId: review.id, stage },
    });

    if (stage === "TIER_LOCK") {
      await tx.taskerProfile.update({
        where: { id: submission.taskerId },
        data: { tierLocked: true },
      });
    }

    // Same as an ordinary rejection: no reward, no verified-count increase.

    await notifications.fraudViolation(
      tx,
      submission.tasker.userId,
      submission.task.title,
      stage.replace(/_/g, " ").toLowerCase()
    );

    await logAction(tx, {
      actorId: params.adminId,
      action: "FRAUD_FLAG",
      targetType: "TaskSubmission",
      targetId: submission.id,
      metadata: { taskId: submission.taskId, taskerId: submission.taskerId, stage },
    });

    return { submission: updatedSubmission, violation };
  }, { isolationLevel: "Serializable" });
}
