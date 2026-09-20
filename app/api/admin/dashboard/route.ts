import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireAdmin } from "@/lib/rbac";
import { getDashboardKpis } from "@/lib/reports";

export async function GET() {
  const session = await getSession();
  try {
    requireAdmin(session);
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [kpis, verificationQueue, activeTasks, recentActivity] = await Promise.all([
    getDashboardKpis(db),
    db.taskSubmission.findMany({
      where: { status: "PENDING" },
      include: { task: true, tasker: true },
      orderBy: { submittedAt: "asc" },
      take: 10,
    }),
    db.task.findMany({
      where: { status: { in: ["ACTIVE", "IN_PROGRESS"] } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    // "Recent Activity" is read directly from the audit log — it's already
    // the record of every state-changing event, so there's no separate
    // activity-feed table to keep in sync with it.
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  return NextResponse.json({ kpis, verificationQueue, activeTasks, recentActivity });
}
