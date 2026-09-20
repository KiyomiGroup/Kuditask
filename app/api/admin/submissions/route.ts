import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireAdmin } from "@/lib/rbac";
import { getSignedProofUrl } from "@/lib/storage";

export async function GET() {
  const session = await getSession();
  try {
    requireAdmin(session);
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const submissions = await db.taskSubmission.findMany({
    where: { status: "PENDING" },
    include: { task: true, tasker: true },
    orderBy: { submittedAt: "asc" },
  });

  const withSignedUrls = await Promise.all(
    submissions.map(async (s) => {
      let screenshotSignedUrl: string | null = null;
      try {
        screenshotSignedUrl = await getSignedProofUrl(s.screenshotUrl);
      } catch {
        // Storage not configured in this environment — leave null, the
        // admin UI shows a "preview unavailable" state rather than erroring
        // the whole queue out.
      }
      return { ...s, screenshotSignedUrl };
    })
  );

  return NextResponse.json(withSignedUrls);
}
