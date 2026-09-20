import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { requireAdmin } from "@/lib/rbac";
import { MIN_WITHDRAWAL_KOBO, MIN_VERIFIED_TASKS, MIN_ACTIVE_LOGIN_DAYS, NEXT_WITHDRAWAL_LABEL } from "@/lib/withdrawal";
import { RESERVATION_MINUTES } from "@/lib/reservation";

export async function GET() {
  const session = await getSession();
  try {
    requireAdmin(session);
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return NextResponse.json({
    taskRules: {
      reservationMinutes: RESERVATION_MINUTES,
      claimOrder: "first-come, first-served",
      autoCloseOnRequiredVerifiedCompletions: true,
    },
    withdrawalRules: {
      minWithdrawalKobo: MIN_WITHDRAWAL_KOBO,
      minVerifiedTasks: MIN_VERIFIED_TASKS,
      minActiveLoginDays: MIN_ACTIVE_LOGIN_DAYS,
      payoutSchedule: NEXT_WITHDRAWAL_LABEL,
      paymentProvider: "paystack",
    },
    proofAndFraudRules: {
      screenshotProofRequired: true,
      fraudProgression: ["First violation: warning, reward withheld", "Second violation: final warning", "Third violation: tier progression locked pending appeal"],
    },
    // These three are locked and not admin-editable in V1 — surfaced for
    // visibility only, per the spec's "do not invent additional
    // eligibility rules" / "keep V1 operationally simple" instructions.
    editable: false,
  });
}
