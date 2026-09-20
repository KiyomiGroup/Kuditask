import type { PrismaClient } from "@prisma/client";
import { spendableBalanceKobo } from "./wallet";
import { logAction } from "./audit";

export const MIN_WITHDRAWAL_KOBO = 5000 * 100; // ₦5,000 — LOCKED, do not change
export const MIN_VERIFIED_TASKS = 500; // LOCKED
export const MIN_ACTIVE_LOGIN_DAYS = 10; // LOCKED
export const NEXT_WITHDRAWAL_LABEL = "Next withdrawal: Sunday at 5:00 PM"; // LOCKED schedule — display only, see README

export class WithdrawalError extends Error {}

/**
 * Pure predicate — no DB, no I/O. All three conditions feed into this so
 * the combined rule ("balance AND tasks AND login-days") is unit-testable
 * in isolation from Prisma.
 */
export function isWithdrawalEligible(
  spendableKobo: number,
  verifiedTaskCount: number,
  loginDayCount: number
): boolean {
  return (
    spendableKobo >= MIN_WITHDRAWAL_KOBO &&
    verifiedTaskCount >= MIN_VERIFIED_TASKS &&
    loginDayCount >= MIN_ACTIVE_LOGIN_DAYS
  );
}

/**
 * Full eligibility breakdown for a tasker — the one authoritative place
 * this is computed. The UI (locked/eligible states, progress bars) consumes
 * this result; it never recomputes eligibility itself.
 */
export async function checkWithdrawalEligibility(db: PrismaClient, taskerId: string) {
  const profile = await db.taskerProfile.findUniqueOrThrow({
    where: { id: taskerId },
    include: { wallet: true },
  });
  if (!profile.wallet) throw new Error("Tasker has no wallet.");

  const [verifiedTaskCount, loginDayCount] = await Promise.all([
    db.taskSubmission.count({ where: { taskerId, status: "APPROVED" } }),
    db.loginDay.count({ where: { userId: profile.userId } }),
  ]);

  const spendable = spendableBalanceKobo(profile.wallet);
  const meetsBalance = spendable >= MIN_WITHDRAWAL_KOBO;
  const meetsTaskCount = verifiedTaskCount >= MIN_VERIFIED_TASKS;
  const meetsLoginDays = loginDayCount >= MIN_ACTIVE_LOGIN_DAYS;

  return {
    eligible: isWithdrawalEligible(spendable, verifiedTaskCount, loginDayCount),
    spendableKobo: spendable,
    verifiedTaskCount,
    loginDayCount,
    meetsBalance,
    meetsTaskCount,
    meetsLoginDays,
  };
}

/**
 * Requests a withdrawal. The requested amount is immediately moved out of
 * spendable balance via reservedForWithdrawalKobo (NOT a WalletTransaction —
 * that's only created on Paid, per spec) — this is what makes a second,
 * overlapping request fail its own balance check rather than needing a
 * separate "conflicting withdrawal" lookup. No WalletTransaction exists for
 * a REQUESTED withdrawal.
 */
export async function requestWithdrawal(
  db: PrismaClient,
  params: { taskerId: string; userId: string; amountKobo: number }
) {
  if (params.amountKobo < MIN_WITHDRAWAL_KOBO) {
    throw new WithdrawalError(`Minimum withdrawal is ₦${MIN_WITHDRAWAL_KOBO / 100}.`);
  }

  return db.$transaction(
    async (tx) => {
      const profile = await tx.taskerProfile.findUniqueOrThrow({
        where: { id: params.taskerId },
        include: { wallet: true },
      });
      if (!profile.wallet) throw new WithdrawalError("Tasker has no wallet.");
      if (profile.accountStatus !== "ACTIVE") {
        throw new WithdrawalError("Account is not in good standing — withdrawals are unavailable.");
      }

      const spendable = spendableBalanceKobo(profile.wallet);
      if (params.amountKobo > spendable) {
        throw new WithdrawalError(
          "Amount exceeds your available balance (after any pending withdrawal requests)."
        );
      }

      const [verifiedTaskCount, loginDayCount] = await Promise.all([
        tx.taskSubmission.count({ where: { taskerId: params.taskerId, status: "APPROVED" } }),
        tx.loginDay.count({ where: { userId: profile.userId } }),
      ]);
      if (!isWithdrawalEligible(spendable, verifiedTaskCount, loginDayCount)) {
        throw new WithdrawalError(
          "Not eligible for withdrawal yet — requires 500 verified tasks and 10 active login days."
        );
      }

      const withdrawal = await tx.withdrawal.create({
        data: {
          taskerId: params.taskerId,
          amountKobo: params.amountKobo,
          status: "REQUESTED",
          paymentProvider: "paystack",
        },
      });

      await tx.wallet.update({
        where: { id: profile.wallet.id },
        data: { reservedForWithdrawalKobo: { increment: params.amountKobo } },
      });

      await tx.notification.create({
        data: {
          userId: params.userId,
          title: "Withdrawal requested",
          body: `Your withdrawal request for ₦${(params.amountKobo / 100).toLocaleString()} has been received.`,
        },
      });

      await logAction(tx, {
        actorId: params.userId,
        action: "WITHDRAWAL_REQUEST",
        targetType: "Withdrawal",
        targetId: withdrawal.id,
        metadata: { amountKobo: params.amountKobo },
      });

      return withdrawal;
    },
    { isolationLevel: "Serializable" }
  );
}

/** Admin: REQUESTED -> PROCESSING. No balance change. */
export async function markWithdrawalProcessing(
  db: PrismaClient,
  params: { withdrawalId: string; adminId: string }
) {
  return db.$transaction(async (tx) => {
    const withdrawal = await tx.withdrawal.findUniqueOrThrow({
      where: { id: params.withdrawalId },
      include: { tasker: { include: { user: true } } },
    });
    if (withdrawal.status !== "REQUESTED") {
      throw new WithdrawalError(`Withdrawal is ${withdrawal.status.toLowerCase()}, not REQUESTED.`);
    }

    const updated = await tx.withdrawal.update({
      where: { id: withdrawal.id },
      data: { status: "PROCESSING", processingAt: new Date(), adminReviewerId: params.adminId },
    });

    await tx.notification.create({
      data: {
        userId: withdrawal.tasker.user.id,
        title: "Withdrawal is being processed",
        body: `Your withdrawal request for ₦${(withdrawal.amountKobo / 100).toLocaleString()} is now processing.`,
      },
    });

    await logAction(tx, {
      actorId: params.adminId,
      action: "WITHDRAWAL_PROCESSING",
      targetType: "Withdrawal",
      targetId: withdrawal.id,
    });

    return updated;
  });
}

/**
 * Admin: PROCESSING -> PAID. This is the ONLY function that creates a
 * WITHDRAWAL WalletTransaction and permanently reduces availableBalanceKobo.
 * Double-payment protection is layered exactly like creditTaskReward:
 *   1. Requires status === PROCESSING to even start — a second call after
 *      the first succeeds sees status === PAID and is rejected immediately.
 *   2. WalletTransaction.referenceWithdrawalId has a DB-level UNIQUE
 *      constraint as a second, independent guard against the same race.
 */
export async function markWithdrawalPaid(
  db: PrismaClient,
  params: { withdrawalId: string; adminId: string; paystackRef: string }
) {
  return db.$transaction(async (tx) => {
    const withdrawal = await tx.withdrawal.findUniqueOrThrow({
      where: { id: params.withdrawalId },
      include: { tasker: { include: { wallet: true, user: true } } },
    });
    if (withdrawal.status !== "PROCESSING") {
      throw new WithdrawalError(`Withdrawal is ${withdrawal.status.toLowerCase()}, not PROCESSING.`);
    }
    const wallet = withdrawal.tasker.wallet;
    if (!wallet) throw new WithdrawalError("Tasker has no wallet.");

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        taskerId: withdrawal.taskerId,
        type: "WITHDRAWAL",
        amountKobo: -withdrawal.amountKobo,
        balanceBeforeKobo: wallet.availableBalanceKobo,
        balanceAfterKobo: wallet.availableBalanceKobo - withdrawal.amountKobo,
        referenceWithdrawalId: withdrawal.id,
        reference: params.paystackRef,
        description: "Withdrawal paid via Paystack",
      },
    });

    await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        availableBalanceKobo: { decrement: withdrawal.amountKobo },
        reservedForWithdrawalKobo: { decrement: withdrawal.amountKobo },
      },
    });

    const updated = await tx.withdrawal.update({
      where: { id: withdrawal.id },
      data: { status: "PAID", paidAt: new Date(), paystackRef: params.paystackRef },
    });

    await tx.notification.create({
      data: {
        userId: withdrawal.tasker.user.id,
        title: "Withdrawal paid",
        body: `Your withdrawal of ₦${(withdrawal.amountKobo / 100).toLocaleString()} has been paid.`,
      },
    });

    await logAction(tx, {
      actorId: params.adminId,
      action: "WITHDRAWAL_PAID",
      targetType: "Withdrawal",
      targetId: withdrawal.id,
      metadata: { amountKobo: withdrawal.amountKobo, paystackRef: params.paystackRef },
    });

    return updated;
  }, { isolationLevel: "Serializable" });
}

/**
 * Admin: (REQUESTED|PROCESSING) -> FAILED. Releases the reservation so the
 * funds become spendable again — since nothing was ever deducted from
 * availableBalanceKobo (only reserved), "releasing" is just decrementing
 * reservedForWithdrawalKobo. No WalletTransaction is created or reversed
 * because none was ever created for this withdrawal.
 */
export async function markWithdrawalFailed(
  db: PrismaClient,
  params: { withdrawalId: string; adminId: string; failureReason: string }
) {
  if (!params.failureReason.trim()) {
    throw new WithdrawalError("A failure reason is required.");
  }
  return db.$transaction(async (tx) => {
    const withdrawal = await tx.withdrawal.findUniqueOrThrow({
      where: { id: params.withdrawalId },
      include: { tasker: { include: { wallet: true, user: true } } },
    });
    if (withdrawal.status !== "REQUESTED" && withdrawal.status !== "PROCESSING") {
      throw new WithdrawalError(`Withdrawal is already ${withdrawal.status.toLowerCase()}.`);
    }
    const wallet = withdrawal.tasker.wallet;
    if (!wallet) throw new WithdrawalError("Tasker has no wallet.");

    await tx.wallet.update({
      where: { id: wallet.id },
      data: { reservedForWithdrawalKobo: { decrement: withdrawal.amountKobo } },
    });

    const updated = await tx.withdrawal.update({
      where: { id: withdrawal.id },
      data: { status: "FAILED", failedAt: new Date(), failureReason: params.failureReason },
    });

    await tx.notification.create({
      data: {
        userId: withdrawal.tasker.user.id,
        title: "Withdrawal failed",
        body: `Your withdrawal of ₦${(withdrawal.amountKobo / 100).toLocaleString()} failed: ${params.failureReason}. The funds are available in your wallet again.`,
      },
    });

    await logAction(tx, {
      actorId: params.adminId,
      action: "WITHDRAWAL_FAILED",
      targetType: "Withdrawal",
      targetId: withdrawal.id,
      metadata: { failureReason: params.failureReason },
    });

    return updated;
  });
}
