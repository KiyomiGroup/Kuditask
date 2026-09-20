import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireAdmin } from "@/lib/rbac";
import { flagFraudViolation, ReviewStateError } from "@/lib/proof-review";
import { z } from "zod";

const bodySchema = z.object({
  reason: z.enum([
    "FAKE_SCREENSHOT",
    "EDITED_SCREENSHOT",
    "WRONG_ACCOUNT",
    "TASK_NOT_COMPLETED",
    "DUPLICATE_PROOF",
    "UNCLEAR_PROOF",
    "OTHER",
  ]),
  notes: z.string().optional(),
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
    return NextResponse.json({ error: "A reason is required to flag fraud." }, { status: 422 });
  }

  try {
    const result = await flagFraudViolation(db, {
      submissionId: id,
      adminId: session!.userId,
      reason: parsed.data.reason,
      notes: parsed.data.notes,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ReviewStateError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
