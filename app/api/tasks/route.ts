import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireTasker } from "@/lib/rbac";
import { listAvailableTasksForTasker } from "@/lib/tasks";

export async function GET(req: Request) {
  const session = await getSession();
  try {
    requireTasker(session);
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const profile = await db.taskerProfile.findUnique({ where: { userId: session!.userId } });
  if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

  const url = new URL(req.url);
  const tasks = await listAvailableTasksForTasker(db, profile.id, {
    platform: url.searchParams.get("platform") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
    sort: (url.searchParams.get("sort") as "newest" | "reward" | "ending_soon" | null) ?? undefined,
  });

  return NextResponse.json(tasks);
}
