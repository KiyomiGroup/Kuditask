import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireAdmin } from "@/lib/rbac";
import { editTask, TaskAdminError } from "@/lib/task-admin";
import { remainingCompletions } from "@/lib/tasks";
import { calculateMargin } from "@/lib/economics";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  try {
    requireAdmin(session);
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const task = await db.task.findUnique({
    where: { id },
    include: {
      client: true,
      minTier: true,
      assignedTiers: { include: { tier: true } },
      assignedTaskers: { include: { tasker: true } },
      submissions: { include: { tasker: true }, orderBy: { submittedAt: "desc" } },
    },
  });
  if (!task) return NextResponse.json({ error: "Task not found." }, { status: 404 });

  const margin = calculateMargin({
    clientPriceKobo: task.clientPriceKobo,
    taskerRewardKobo: task.taskerRewardKobo,
    requiredCompletions: task.requiredCompletions,
  });

  return NextResponse.json({
    ...task,
    remainingCompletions: remainingCompletions(task),
    percentComplete: task.requiredCompletions > 0 ? task.verifiedCompletions / task.requiredCompletions : 0,
    economics: margin,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  try {
    requireAdmin(session);
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const updated = await editTask(db, session!.userId, id, body);
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof TaskAdminError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
