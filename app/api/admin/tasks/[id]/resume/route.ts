import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireAdmin } from "@/lib/rbac";
import { resumeTask, TaskAdminError } from "@/lib/task-admin";

export async function POST(
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
  try {
    const updated = await resumeTask(db, session!.userId, id);
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof TaskAdminError) return NextResponse.json({ error: err.message }, { status: 409 });
    throw err;
  }
}
