import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireAdmin } from "@/lib/rbac";
import { getSignedProofUrl } from "@/lib/storage";

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
  const submission = await db.taskSubmission.findUnique({
    where: { id },
    include: {
      task: true,
      tasker: { include: { socialAccounts: { where: { status: "ACTIVE" } } } },
      review: true,
    },
  });
  if (!submission) return NextResponse.json({ error: "Submission not found." }, { status: 404 });

  const fraudHistory = await db.fraudViolation.findMany({
    where: { taskerId: submission.taskerId },
    orderBy: { createdAt: "desc" },
  });

  let screenshotSignedUrl: string | null = null;
  try {
    screenshotSignedUrl = await getSignedProofUrl(submission.screenshotUrl);
  } catch {
    // Storage not configured in this environment — UI shows "preview unavailable".
  }

  return NextResponse.json({ ...submission, screenshotSignedUrl, fraudHistory });
}
