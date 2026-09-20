import type { PrismaClient, SocialPlatform, TaskAssignmentScope } from "@prisma/client";
import { assertTaskIsPublishable } from "./economics";
import { logAction } from "./audit";

export class TaskAdminError extends Error {}

export interface CreateTaskInput {
  clientId: string;
  clientRequestId?: string;
  title: string;
  category: string;
  platform?: SocialPlatform;
  description: string;
  instructions: string;
  targetUrl?: string;
  clientPriceKobo: number;
  taskerRewardKobo: number;
  requiredCompletions: number;
  minTierId?: string;
  assignmentScope: TaskAssignmentScope;
  assignedTierIds?: string[]; // required when assignmentScope = SPECIFIC_TIERS
  assignedTaskerIds?: string[]; // required when assignmentScope = SPECIFIC_TASKERS
  startDate?: Date;
  endDate?: Date;
}

/**
 * Creates a task. Economics are validated server-side — the same
 * assertTaskIsPublishable used everywhere else — so a negative-margin task
 * can never be created via this path regardless of what a client sent.
 */
export async function createTask(db: PrismaClient, adminId: string, input: CreateTaskInput) {
  if (input.requiredCompletions <= 0) {
    throw new TaskAdminError("Required completions must be greater than zero.");
  }
  assertTaskIsPublishable({
    clientPriceKobo: input.clientPriceKobo,
    taskerRewardKobo: input.taskerRewardKobo,
    requiredCompletions: input.requiredCompletions,
  });

  if (input.assignmentScope === "SPECIFIC_TIERS" && !input.assignedTierIds?.length) {
    throw new TaskAdminError("Select at least one tier for tier-scoped assignment.");
  }
  if (input.assignmentScope === "SPECIFIC_TASKERS" && !input.assignedTaskerIds?.length) {
    throw new TaskAdminError("Select at least one tasker for tasker-scoped assignment.");
  }

  return db.$transaction(async (tx) => {
    const task = await tx.task.create({
      data: {
        clientId: input.clientId,
        clientRequestId: input.clientRequestId,
        title: input.title,
        category: input.category,
        platform: input.platform,
        description: input.description,
        instructions: input.instructions,
        targetUrl: input.targetUrl,
        clientPriceKobo: input.clientPriceKobo,
        taskerRewardKobo: input.taskerRewardKobo,
        requiredCompletions: input.requiredCompletions,
        minTierId: input.minTierId,
        assignmentScope: input.assignmentScope,
        startDate: input.startDate,
        endDate: input.endDate,
        createdByAdminId: adminId,
      },
    });

    if (input.assignmentScope === "SPECIFIC_TIERS" && input.assignedTierIds) {
      await tx.taskAssignedTier.createMany({
        data: input.assignedTierIds.map((tierId) => ({ taskId: task.id, tierId })),
      });
    }
    if (input.assignmentScope === "SPECIFIC_TASKERS" && input.assignedTaskerIds) {
      await tx.taskAssignedTasker.createMany({
        data: input.assignedTaskerIds.map((taskerId) => ({ taskId: task.id, taskerId })),
      });
    }

    if (input.clientRequestId) {
      await tx.clientRequest.update({
        where: { id: input.clientRequestId },
        data: { status: "LAUNCHED" },
      });
    }

    await logAction(tx, {
      actorId: adminId,
      action: "TASK_CREATE",
      targetType: "Task",
      targetId: task.id,
      metadata: {
        clientPriceKobo: input.clientPriceKobo,
        taskerRewardKobo: input.taskerRewardKobo,
        requiredCompletions: input.requiredCompletions,
      },
    });

    return task;
  });
}

export interface EditTaskInput {
  title?: string;
  category?: string;
  platform?: SocialPlatform;
  description?: string;
  instructions?: string;
  targetUrl?: string;
  clientPriceKobo?: number;
  taskerRewardKobo?: number;
  requiredCompletions?: number;
  minTierId?: string | null;
  endDate?: Date | null;
}

/**
 * Edits a task. If the edit touches economics-affecting fields, the
 * resulting numbers are re-validated against assertTaskIsPublishable using
 * whichever values are ending up in the row (new ones where given, existing
 * ones otherwise) — an edit can't sneak a task into negative margin any
 * more than creation can.
 */
export async function editTask(
  db: PrismaClient,
  adminId: string,
  taskId: string,
  input: EditTaskInput
) {
  return db.$transaction(async (tx) => {
    const existing = await tx.task.findUniqueOrThrow({ where: { id: taskId } });

    const nextClientPrice = input.clientPriceKobo ?? existing.clientPriceKobo;
    const nextReward = input.taskerRewardKobo ?? existing.taskerRewardKobo;
    const nextRequired = input.requiredCompletions ?? existing.requiredCompletions;
    if (
      input.clientPriceKobo !== undefined ||
      input.taskerRewardKobo !== undefined ||
      input.requiredCompletions !== undefined
    ) {
      assertTaskIsPublishable({
        clientPriceKobo: nextClientPrice,
        taskerRewardKobo: nextReward,
        requiredCompletions: nextRequired,
      });
    }

    const updated = await tx.task.update({
      where: { id: taskId },
      data: { ...input },
    });

    await logAction(tx, {
      actorId: adminId,
      action: "TASK_EDIT",
      targetType: "Task",
      targetId: taskId,
      metadata: input as Record<string, unknown>,
    });

    return updated;
  });
}

async function transitionTaskStatus(
  db: PrismaClient,
  adminId: string,
  taskId: string,
  from: string[],
  to: "ACTIVE" | "PAUSED" | "COMPLETED",
  action: string
) {
  return db.$transaction(async (tx) => {
    const task = await tx.task.findUniqueOrThrow({ where: { id: taskId } });
    if (!from.includes(task.status)) {
      throw new TaskAdminError(`Task is ${task.status.toLowerCase()} — cannot ${action.toLowerCase()} from there.`);
    }
    const updated = await tx.task.update({ where: { id: taskId }, data: { status: to } });
    await logAction(tx, { actorId: adminId, action, targetType: "Task", targetId: taskId });
    return updated;
  });
}

export const pauseTask = (db: PrismaClient, adminId: string, taskId: string) =>
  transitionTaskStatus(db, adminId, taskId, ["ACTIVE", "IN_PROGRESS"], "PAUSED", "TASK_PAUSE");

export const resumeTask = (db: PrismaClient, adminId: string, taskId: string) =>
  transitionTaskStatus(db, adminId, taskId, ["PAUSED"], "ACTIVE", "TASK_RESUME");

/** Manual admin close — distinct from the automatic close in lib/proof-review.ts. */
export const closeTask = (db: PrismaClient, adminId: string, taskId: string) =>
  transitionTaskStatus(db, adminId, taskId, ["ACTIVE", "IN_PROGRESS", "PAUSED"], "COMPLETED", "TASK_CLOSE");
