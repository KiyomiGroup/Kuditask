import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireTasker, requireOwnerOrAdmin } from "@/lib/rbac";
import { expireStaleReservations } from "@/lib/reservation";

// The UI countdown should poll this rather than trust a client-side timer —
// this is the server clock's answer to "how much time is actually left."
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
  const reservation = await db.taskReservation.findUnique({
    where: { id },
    include: { task: true, tasker: { include: { user: true } } },
  });
  if (!reservation) return NextResponse.json({ error: "Reservation not found." }, { status: 404 });

  try {
    requireOwnerOrAdmin(session, reservation.tasker.userId);
  } catch {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (reservation.status === "ACTIVE" && reservation.expiresAt.getTime() < Date.now()) {
    await expireStaleReservations(db, reservation.taskId);
  }

  const fresh = await db.taskReservation.findUniqueOrThrow({ where: { id } });
  const secondsRemaining = Math.max(
    0,
    Math.floor((fresh.expiresAt.getTime() - Date.now()) / 1000)
  );

  return NextResponse.json({
    id: fresh.id,
    status: fresh.status,
    expiresAt: fresh.expiresAt,
    secondsRemaining,
    task: { id: reservation.task.id, title: reservation.task.title },
  });
}
