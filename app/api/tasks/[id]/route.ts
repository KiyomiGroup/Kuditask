import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireTasker } from "@/lib/rbac";
import { remainingCompletions, meetsMinTier, meetsAssignmentScope } from "@/lib/tasks";
import { expireStaleReservations, RESERVATION_MINUTES } from "@/lib/reservation";

// Viewing this page never creates a reservation — that only happens on the
// POST to /start.
export async function GET(
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

  // Sweep expired reservations for this task first so "available slots" is
  // never stale for the person about to decide whether to start it.
  await expireStaleReservations(db, id);

  const task = await db.task.findUnique({ where: { id }, include: { minTier: true } });
  if (!task) return NextResponse.json({ error: "Task not found." }, { status: 404 });

  const heldSlots = await db.taskReservation.count({ where: { taskId: id, status: "ACTIVE" } });
  const remaining = Math.max(0, remainingCompletions(task) - heldSlots);
  const scopeOk = await meetsAssignmentScope(db, task, profile.id, profile.currentTier.level);
  const eligible =
    (task.status === "ACTIVE" || task.status === "IN_PROGRESS") &&
    remaining > 0 &&
    meetsMinTier(task, profile.currentTier.level) &&
    scopeOk;

  return NextResponse.json({
    ...task,
    remainingCompletions: remaining,
    claimable: eligible,
    reservationMinutes: RESERVATION_MINUTES,
  });
}
