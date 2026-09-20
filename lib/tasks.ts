import type { PrismaClient, Task, Tier } from "@prisma/client";

/** remainingCompletions is derived, never stored — see schema.prisma comment on Task. */
export function remainingCompletions(task: Pick<Task, "requiredCompletions" | "verifiedCompletions">) {
  return Math.max(0, task.requiredCompletions - task.verifiedCompletions);
}

/**
 * A task is claimable when: it's ACTIVE or IN_PROGRESS (not PAUSED, not
 * COMPLETED, not REJECTED), and it still has remaining slots. Tier and
 * assignment-scope checks happen separately (meetsMinTier, meetsAssignmentScope)
 * since they need extra joined data this function doesn't have.
 */
export function isTaskClaimableByTasker(task: Task): boolean {
  if (task.status !== "ACTIVE" && task.status !== "IN_PROGRESS") return false;
  if (remainingCompletions(task) <= 0) return false;
  return true;
}

export function meetsMinTier(task: { minTier: Tier | null }, taskerTierLevel: number) {
  if (!task.minTier) return true;
  return taskerTierLevel >= task.minTier.level;
}

/**
 * Enforces Task.assignmentScope (Admin "Create Task" targeting). This is
 * the one place that decides "is this task open to this tasker" beyond the
 * ordinary tier gate — both the available-tasks list and the start-task
 * endpoint call it so they can never disagree.
 */
export async function meetsAssignmentScope(
  db: PrismaClient,
  task: Task,
  taskerProfileId: string,
  taskerTierLevel: number
): Promise<boolean> {
  switch (task.assignmentScope) {
    case "ALL_ELIGIBLE":
      return true;
    case "SPECIFIC_TIERS": {
      const match = await db.taskAssignedTier.findFirst({
        where: { taskId: task.id, tier: { level: taskerTierLevel } },
      });
      return !!match;
    }
    case "SPECIFIC_TASKERS": {
      const match = await db.taskAssignedTasker.findUnique({
        where: { taskId_taskerId: { taskId: task.id, taskerId: taskerProfileId } },
      });
      return !!match;
    }
    case "SPECIFIC_PLATFORM": {
      if (!task.platform) return true; // no platform set on the task — nothing to restrict against
      const account = await db.socialAccount.findFirst({
        where: { taskerId: taskerProfileId, platform: task.platform, status: "ACTIVE" },
      });
      return !!account;
    }
    default:
      return true;
  }
}

export interface AvailableTaskFilters {
  platform?: string;
  category?: string;
  sort?: "newest" | "reward" | "ending_soon";
  search?: string;
}

/**
 * Fetches the tasks a given tasker is currently eligible to see/claim,
 * applying the same claimability + tier + assignment-scope rules the
 * start-task endpoint enforces. Filtering/sorting happens in JS after the
 * DB fetch — fine at MVP scale, revisit if the task table gets large.
 */
export async function listAvailableTasksForTasker(
  db: PrismaClient,
  taskerProfileId: string,
  filters: AvailableTaskFilters = {}
) {
  const profile = await db.taskerProfile.findUniqueOrThrow({
    where: { id: taskerProfileId },
    include: { currentTier: true },
  });

  const tasks = await db.task.findMany({
    where: { status: { in: ["ACTIVE", "IN_PROGRESS"] } },
    include: { minTier: true },
    orderBy: { createdAt: "desc" },
  });

  const candidates = tasks.filter(
    (t) => isTaskClaimableByTasker(t) && meetsMinTier(t, profile.currentTier.level)
  );

  const scopeChecks = await Promise.all(
    candidates.map((t) => meetsAssignmentScope(db, t, taskerProfileId, profile.currentTier.level))
  );
  let eligible = candidates.filter((_, i) => scopeChecks[i]);

  if (filters.platform) {
    eligible = eligible.filter((t) => t.platform === filters.platform);
  }
  if (filters.category) {
    eligible = eligible.filter((t) => t.category === filters.category);
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    eligible = eligible.filter((t) => t.title.toLowerCase().includes(q));
  }

  switch (filters.sort) {
    case "reward":
      eligible.sort((a, b) => b.taskerRewardKobo - a.taskerRewardKobo);
      break;
    case "ending_soon":
      eligible.sort((a, b) => {
        if (!a.endDate) return 1;
        if (!b.endDate) return -1;
        return a.endDate.getTime() - b.endDate.getTime();
      });
      break;
    case "newest":
    default:
      eligible.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  return eligible.map((t) => ({ ...t, remainingCompletions: remainingCompletions(t) }));
}
