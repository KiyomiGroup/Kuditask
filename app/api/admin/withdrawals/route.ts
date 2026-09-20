import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireAdmin } from "@/lib/rbac";
import { checkWithdrawalEligibility } from "@/lib/withdrawal";

export async function GET(req: Request) {
  const session = await getSession();
  try {
    requireAdmin(session);
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const status = new URL(req.url).searchParams.get("status");
  const withdrawals = await db.withdrawal.findMany({
    where: status ? { status: status as never } : undefined,
    include: { tasker: { include: { user: true } } },
    orderBy: { requestedAt: "asc" },
  });

  const withEligibility = await Promise.all(
    withdrawals.map(async (w) => ({
      ...w,
      eligibility: await checkWithdrawalEligibility(db, w.taskerId),
    }))
  );

  return NextResponse.json(withEligibility);
}
