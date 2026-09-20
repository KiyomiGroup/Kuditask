import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireAdmin } from "@/lib/rbac";
import { approveSubmission, ReviewStateError } from "@/lib/proof-review";

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
  const body = await req.json().catch(() => ({}));

  try {
    const result = await approveSubmission(db, {
      submissionId: id,
      adminId: session!.userId,
      notes: body?.notes,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ReviewStateError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
