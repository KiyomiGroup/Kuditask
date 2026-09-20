import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireTasker } from "@/lib/rbac";
import { startTask } from "@/lib/reservation";
import { meetsMinTier, meetsAssignmentScope } from "@/lib/tasks";
import { notifications } from "@/lib/notifications";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  try {
    requireTasker(session);
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const profile = await db.taskerProfile.findUnique({
    where: { userId: session!.userId },
    include: { currentTier: true },
  });
  if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

  if (profile.accountStatus !== "ACTIVE") {
    return NextResponse.json(
      { error: "Your account is not currently able to claim tasks." },
      { status: 403 }
    );
  }

  const task = await db.task.findUnique({ where: { id }, include: { minTier: true } });
  if (!task) return NextResponse.json({ error: "Task not found." }, { status: 404 });
  if (!meetsMinTier(task, profile.currentTier.level)) {
    return NextResponse.json({ error: "You do not meet the tier requirement for this task." }, { status: 403 });
  }
  if (!(await meetsAssignmentScope(db, task, profile.id, profile.currentTier.level))) {
    return NextResponse.json({ error: "This task is not available to you." }, { status: 403 });
  }

  try {
    // All race-condition handling (concurrent claims, slot counting,
    // duplicate-active-reservation) lives inside startTask's serializable
    // transaction — this route is a thin, auth-checked wrapper around it.
    const reservation = await startTask(db, id, profile.id);
    await notifications.taskStarted(db, session!.userId, task.title);
    return NextResponse.json(reservation, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not start task.";
    // Every failure mode from startTask (no slots, already active reservation,
    // task not open) is a 409 — a legitimate, expected conflict, not a server error.
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
