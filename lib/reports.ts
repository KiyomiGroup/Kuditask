import type { PrismaClient } from "@prisma/client";

function startOfTodayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Section 2 — Admin Dashboard KPI cards. */
export async function getDashboardKpis(db: PrismaClient) {
  const today = startOfTodayUTC();

  const [
    activeTaskers,
    activeTasks,
    pendingVerification,
    pendingWithdrawals,
    todaysCompletions,
    todaysRewardTx,
  ] = await Promise.all([
    db.taskerProfile.count({ where: { accountStatus: "ACTIVE" } }),
    db.task.count({ where: { status: { in: ["ACTIVE", "IN_PROGRESS"] } } }),
    db.taskSubmission.count({ where: { status: "PENDING" } }),
    db.withdrawal.count({ where: { status: { in: ["REQUESTED", "PROCESSING"] } } }),
    db.taskSubmission.count({ where: { status: "APPROVED", submittedAt: { gte: today } } }),
    // "Today's Platform Revenue" — Client Price minus Tasker Reward, summed
    // over today's approved submissions. Computed from Task rows behind
    // today's approvals rather than stored anywhere, since margin is a
    // derived economics figure everywhere else in this codebase too.
    db.taskSubmission.findMany({
      where: { status: "APPROVED", submittedAt: { gte: today } },
      include: { task: true },
    }),
  ]);

  const todaysRevenueKobo = todaysRewardTx.reduce(
    (sum, s) => sum + (s.task.clientPriceKobo / s.task.requiredCompletions - s.task.taskerRewardKobo),
    0
  );

  return {
    activeTaskers,
    activeTasks,
    pendingVerification,
    pendingWithdrawals,
    todaysCompletions,
    todaysRevenueKobo: Math.round(todaysRevenueKobo),
  };
}

/** Section 17 — Overview numbers, date-range filterable. */
export async function getReportsOverview(db: PrismaClient, since?: Date) {
  const where = since ? { submittedAt: { gte: since } } : {};

  const [taskCompletions, verifiedTasks, allSubmissions, rewardTx] = await Promise.all([
    db.taskSubmission.count({ where: { ...where, status: "APPROVED" } }),
    db.taskSubmission.count({ where: { ...where, status: "APPROVED" } }),
    db.taskSubmission.count({ where }),
    db.walletTransaction.findMany({ where: { type: "TASK_REWARD", ...(since ? { createdAt: { gte: since } } : {}) } }),
  ]);

  const verificationRate = allSubmissions > 0 ? verifiedTasks / allSubmissions : 0;
  const taskerEarningsKobo = rewardTx.reduce((sum, tx) => sum + tx.amountKobo, 0);

  const tasksInRange = await db.task.findMany({
    where: since ? { createdAt: { gte: since } } : {},
  });
  const clientSpendKobo = tasksInRange.reduce((sum, t) => sum + t.clientPriceKobo, 0);
  const platformMarginKobo = tasksInRange.reduce(
    (sum, t) => sum + (t.clientPriceKobo - t.taskerRewardKobo * t.requiredCompletions),
    0
  );

  return {
    taskCompletions,
    verifiedTasks,
    verificationRate,
    taskerEarningsKobo,
    clientSpendKobo,
    platformMarginKobo,
  };
}

/** Section 17 — Platform Breakdown. */
export async function getPlatformBreakdown(db: PrismaClient) {
  const tasks = await db.task.findMany({ select: { platform: true, verifiedCompletions: true } });
  const byPlatform = new Map<string, { taskCount: number; verifiedCompletions: number }>();
  for (const t of tasks) {
    const key = t.platform ?? "UNSPECIFIED";
    const entry = byPlatform.get(key) ?? { taskCount: 0, verifiedCompletions: 0 };
    entry.taskCount += 1;
    entry.verifiedCompletions += t.verifiedCompletions;
    byPlatform.set(key, entry);
  }
  return Array.from(byPlatform.entries()).map(([platform, stats]) => ({ platform, ...stats }));
}

/** Section 17 — Tasker Performance. */
export async function getTaskerPerformance(db: PrismaClient) {
  const taskers = await db.taskerProfile.findMany({
    include: { currentTier: true, wallet: true },
  });
  const results = await Promise.all(
    taskers.map(async (t) => {
      const [verified, rejected] = await Promise.all([
        db.taskSubmission.count({ where: { taskerId: t.id, status: "APPROVED" } }),
        db.taskSubmission.count({ where: { taskerId: t.id, status: { in: ["REJECTED", "FRAUD_FLAGGED"] } } }),
      ]);
      return {
        taskerId: t.id,
        fullName: t.fullName,
        username: t.username,
        tier: t.currentTier.level,
        verifiedTasks: verified,
        rejectedTasks: rejected,
        lifetimeEarningsKobo: t.wallet?.lifetimeEarningsKobo ?? 0,
      };
    })
  );
  return results;
}

/** Section 17 — Proof Review summary. */
export async function getProofReviewSummary(db: PrismaClient, since?: Date) {
  const where = since ? { submittedAt: { gte: since } } : {};
  const [pending, approved, rejected, fraudFlagged] = await Promise.all([
    db.taskSubmission.count({ where: { ...where, status: "PENDING" } }),
    db.taskSubmission.count({ where: { ...where, status: "APPROVED" } }),
    db.taskSubmission.count({ where: { ...where, status: "REJECTED" } }),
    db.taskSubmission.count({ where: { ...where, status: "FRAUD_FLAGGED" } }),
  ]);
  return { pending, approved, rejected, fraudFlagged };
}
