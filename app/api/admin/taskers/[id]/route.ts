import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireAdmin } from "@/lib/rbac";

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
  const profile = await db.taskerProfile.findUnique({
    where: { id },
    include: {
      user: true,
      currentTier: true,
      wallet: true,
      socialAccounts: { where: { status: "ACTIVE" } },
      fraudViolations: true,
    },
  });
  if (!profile) return NextResponse.json({ error: "Tasker not found." }, { status: 404 });

  const [verifiedTasks, rejectedTasks, recentSubmissions, walletActivity] = await Promise.all([
    db.taskSubmission.count({ where: { taskerId: id, status: "APPROVED" } }),
    db.taskSubmission.count({ where: { taskerId: id, status: { in: ["REJECTED", "FRAUD_FLAGGED"] } } }),
    db.taskSubmission.findMany({
      where: { taskerId: id },
      include: { task: true },
      orderBy: { submittedAt: "desc" },
      take: 20,
    }),
    db.walletTransaction.findMany({ where: { taskerId: id }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);

  return NextResponse.json({
    personal: {
      fullName: profile.fullName,
      username: profile.username,
      email: profile.user.email,
      phone: profile.user.phone,
      accountStatus: profile.accountStatus,
      joinedAt: profile.createdAt,
    },
    socialAccounts: profile.socialAccounts,
    performance: {
      currentTier: profile.currentTier.level,
      verifiedTasks,
      rejectedTasks,
      fraudViolations: profile.fraudViolations.length,
      tierLocked: profile.tierLocked,
      lifetimeEarningsKobo: profile.wallet?.lifetimeEarningsKobo ?? 0,
      availableBalanceKobo: profile.wallet?.availableBalanceKobo ?? 0,
      pendingEarningsKobo: profile.wallet?.pendingEarningsKobo ?? 0,
    },
    recentSubmissions,
    walletActivity,
  });
}
