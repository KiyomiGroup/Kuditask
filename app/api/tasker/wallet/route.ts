import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireTasker } from "@/lib/rbac";
import { spendableBalanceKobo } from "@/lib/wallet";
import { checkWithdrawalEligibility, MIN_WITHDRAWAL_KOBO, MIN_VERIFIED_TASKS, MIN_ACTIVE_LOGIN_DAYS, NEXT_WITHDRAWAL_LABEL } from "@/lib/withdrawal";

export async function GET() {
  const session = await getSession();
  try {
    requireTasker(session);
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const profile = await db.taskerProfile.findUnique({
    where: { userId: session!.userId },
    include: { wallet: true },
  });
  if (!profile || !profile.wallet) {
    return NextResponse.json({ error: "Wallet not found." }, { status: 404 });
  }

  const eligibility = await checkWithdrawalEligibility(db, profile.id);

  return NextResponse.json({
    availableBalanceKobo: profile.wallet.availableBalanceKobo,
    spendableBalanceKobo: spendableBalanceKobo(profile.wallet),
    reservedForWithdrawalKobo: profile.wallet.reservedForWithdrawalKobo,
    pendingEarningsKobo: profile.wallet.pendingEarningsKobo,
    lifetimeEarningsKobo: profile.wallet.lifetimeEarningsKobo,
    eligibility,
    thresholds: {
      minWithdrawalKobo: MIN_WITHDRAWAL_KOBO,
      minVerifiedTasks: MIN_VERIFIED_TASKS,
      minActiveLoginDays: MIN_ACTIVE_LOGIN_DAYS,
    },
    nextWithdrawalLabel: NEXT_WITHDRAWAL_LABEL,
  });
}
