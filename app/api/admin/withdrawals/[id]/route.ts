import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireAdmin } from "@/lib/rbac";
import { checkWithdrawalEligibility } from "@/lib/withdrawal";

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
  const withdrawal = await db.withdrawal.findUnique({
    where: { id },
    include: { tasker: { include: { user: true, wallet: true } } },
  });
  if (!withdrawal) return NextResponse.json({ error: "Withdrawal not found." }, { status: 404 });

  const eligibility = await checkWithdrawalEligibility(db, withdrawal.taskerId);

  return NextResponse.json({ ...withdrawal, eligibility });
}
