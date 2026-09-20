import type { PrismaClient, Prisma, WalletTxType } from "@prisma/client";
import { Prisma as PrismaNS } from "@prisma/client";

export class WalletError extends Error {}

/** Spendable balance for eligibility/request checks — never availableBalanceKobo alone. */
export function spendableBalanceKobo(wallet: { availableBalanceKobo: number; reservedForWithdrawalKobo: number }) {
  return wallet.availableBalanceKobo - wallet.reservedForWithdrawalKobo;
}

/**
 * Bumps pendingEarningsKobo when a tasker submits proof. No WalletTransaction
 * is created here — per spec, the ledger entry only exists once Admin
 * approves (see creditTaskReward). This is purely a Wallet-row field change.
 */
export async function addPendingReward(
  db: PrismaClient | Prisma.TransactionClient,
  taskerId: string,
  amountKobo: number
) {
  const wallet = await db.wallet.findUniqueOrThrow({ where: { taskerId } });
  return db.wallet.update({
    where: { id: wallet.id },
    data: { pendingEarningsKobo: { increment: amountKobo } },
  });
}

/**
 * Removes a pending reward without ever creating a transaction or touching
 * available/lifetime — used on both ordinary rejection and fraud-flag.
 */
export async function removePendingReward(
  db: PrismaClient | Prisma.TransactionClient,
  taskerId: string,
  amountKobo: number
) {
  const wallet = await db.wallet.findUniqueOrThrow({ where: { taskerId } });
  return db.wallet.update({
    where: { id: wallet.id },
    data: { pendingEarningsKobo: { decrement: amountKobo } },
  });
}

/**
 * Credits a TASK_REWARD for exactly one approved submission — the only
 * function allowed to create a TASK_REWARD transaction. Moves the amount
 * from pending to available and bumps lifetime, all in one go.
 *
 * Double-reward protection: the WalletTransaction insert (which carries the
 * DB-level UNIQUE constraint on referenceSubmissionId) happens FIRST; the
 * balance mutation only happens if that insert succeeds. So a duplicate
 * call physically cannot double-credit — it fails at the insert, before
 * touching any balance, and this function returns the existing transaction
 * instead of throwing.
 */
export async function creditTaskReward(
  db: PrismaClient | Prisma.TransactionClient,
  params: {
    taskerId: string;
    taskId: string;
    submissionId: string;
    amountKobo: number;
    description?: string;
  }
) {
  const wallet = await db.wallet.findUniqueOrThrow({ where: { taskerId: params.taskerId } });

  try {
    const tx = await db.walletTransaction.create({
      data: {
        walletId: wallet.id,
        taskerId: params.taskerId,
        type: "TASK_REWARD",
        amountKobo: params.amountKobo,
        balanceBeforeKobo: wallet.availableBalanceKobo,
        balanceAfterKobo: wallet.availableBalanceKobo + params.amountKobo,
        taskId: params.taskId,
        referenceSubmissionId: params.submissionId,
        description: params.description,
      },
    });
    await db.wallet.update({
      where: { id: wallet.id },
      data: {
        pendingEarningsKobo: { decrement: params.amountKobo },
        availableBalanceKobo: { increment: params.amountKobo },
        lifetimeEarningsKobo: { increment: params.amountKobo },
      },
    });
    return { transaction: tx, alreadyCredited: false as const };
  } catch (err) {
    if (err instanceof PrismaNS.PrismaClientKnownRequestError && err.code === "P2002") {
      const existing = await db.walletTransaction.findUniqueOrThrow({
        where: { referenceSubmissionId: params.submissionId },
      });
      return { transaction: existing, alreadyCredited: true as const };
    }
    throw err;
  }
}

/**
 * Admin-applied deduction. MVP rule: never allowed to push the spendable
 * balance negative (section 6/23) — throws WalletError instead.
 */
export async function applyDeduction(
  db: PrismaClient | Prisma.TransactionClient,
  params: { taskerId: string; amountKobo: number; description: string; adminId: string }
) {
  if (params.amountKobo <= 0) throw new WalletError("Deduction amount must be positive.");
  const wallet = await db.wallet.findUniqueOrThrow({ where: { taskerId: params.taskerId } });
  const spendable = spendableBalanceKobo(wallet);
  if (params.amountKobo > spendable) {
    throw new WalletError("Deduction would take the tasker's balance negative — not permitted for MVP.");
  }

  const tx = await db.walletTransaction.create({
    data: {
      walletId: wallet.id,
      taskerId: params.taskerId,
      type: "DEDUCTION",
      amountKobo: -params.amountKobo,
      balanceBeforeKobo: wallet.availableBalanceKobo,
      balanceAfterKobo: wallet.availableBalanceKobo - params.amountKobo,
      description: params.description,
      reference: `admin:${params.adminId}`,
    },
  });
  await db.wallet.update({
    where: { id: wallet.id },
    data: { availableBalanceKobo: { decrement: params.amountKobo } },
  });
  return tx;
}

/**
 * General-purpose correction. Per spec: never edit or delete a past
 * transaction — a correction is always a new ADJUSTMENT row. Can be
 * positive or negative; a negative adjustment is still subject to the
 * no-negative-balance floor.
 */
export async function applyAdjustment(
  db: PrismaClient | Prisma.TransactionClient,
  params: { taskerId: string; amountKobo: number; description: string; adminId: string }
) {
  const wallet = await db.wallet.findUniqueOrThrow({ where: { taskerId: params.taskerId } });
  const spendable = spendableBalanceKobo(wallet);
  if (params.amountKobo < 0 && Math.abs(params.amountKobo) > spendable) {
    throw new WalletError("Adjustment would take the tasker's balance negative — not permitted for MVP.");
  }

  const tx = await db.walletTransaction.create({
    data: {
      walletId: wallet.id,
      taskerId: params.taskerId,
      type: "ADJUSTMENT",
      amountKobo: params.amountKobo,
      balanceBeforeKobo: wallet.availableBalanceKobo,
      balanceAfterKobo: wallet.availableBalanceKobo + params.amountKobo,
      description: params.description,
      reference: `admin:${params.adminId}`,
    },
  });
  await db.wallet.update({
    where: { id: wallet.id },
    data: { availableBalanceKobo: { increment: params.amountKobo } },
  });
  return tx;
}
