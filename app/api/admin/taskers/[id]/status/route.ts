import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireAdmin } from "@/lib/rbac";
import { putUnderReview, suspendTasker, banTasker, restoreTasker, TaskerAdminError } from "@/lib/tasker-admin";
import { z } from "zod";

const bodySchema = z.object({
  action: z.enum(["under_review", "suspend", "ban", "restore"]),
  reason: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  try {
    requireAdmin(session);
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid action is required." }, { status: 422 });
  }

  const fn = {
    under_review: putUnderReview,
    suspend: suspendTasker,
    ban: banTasker,
    restore: restoreTasker,
  }[parsed.data.action];

  try {
    const updated = await fn(db, session!.userId, id, parsed.data.reason);
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof TaskerAdminError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
