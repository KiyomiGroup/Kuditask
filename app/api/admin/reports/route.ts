import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireAdmin } from "@/lib/rbac";
import { getReportsOverview, getPlatformBreakdown, getTaskerPerformance, getProofReviewSummary } from "@/lib/reports";

export async function GET(req: Request) {
  const session = await getSession();
  try {
    requireAdmin(session);
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const sinceParam = new URL(req.url).searchParams.get("since");
  const since = sinceParam ? new Date(sinceParam) : undefined;

  const [overview, platformBreakdown, taskerPerformance, proofReview] = await Promise.all([
    getReportsOverview(db, since),
    getPlatformBreakdown(db),
    getTaskerPerformance(db),
    getProofReviewSummary(db, since),
  ]);

  return NextResponse.json({ overview, platformBreakdown, taskerPerformance, proofReview });
}
