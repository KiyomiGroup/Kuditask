import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireTasker } from "@/lib/rbac";

export async function GET() {
  const session = await getSession();
  try {
    requireTasker(session);
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const profile = await db.taskerProfile.findUnique({ where: { userId: session!.userId } });
  if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

  const [inProgress, pending, completed, rejected] = await Promise.all([
    // "In Progress" = an ACTIVE reservation with no submission yet.
    db.taskReservation.findMany({
      where: { taskerId: profile.id, status: "ACTIVE" },
      include: { task: true },
      orderBy: { createdAt: "desc" },
    }),
    db.taskSubmission.findMany({
      where: { taskerId: profile.id, status: "PENDING" },
      include: { task: true },
      orderBy: { submittedAt: "desc" },
    }),
    db.taskSubmission.findMany({
      where: { taskerId: profile.id, status: "APPROVED" },
      include: { task: true },
      orderBy: { submittedAt: "desc" },
    }),
    db.taskSubmission.findMany({
      where: { taskerId: profile.id, status: { in: ["REJECTED", "FRAUD_FLAGGED"] } },
      include: { task: true, review: true },
      orderBy: { submittedAt: "desc" },
    }),
  ]);

  return NextResponse.json({ inProgress, pending, completed, rejected });
}
