import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireAdmin } from "@/lib/rbac";
import { markWithdrawalFailed, WithdrawalError } from "@/lib/withdrawal";
import { z } from "zod";

const bodySchema = z.object({ failureReason: z.string().min(1, "A failure reason is required.") });

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
    return NextResponse.json({ error: "A failure reason is required." }, { status: 422 });
  }

  try {
    const withdrawal = await markWithdrawalFailed(db, {
      withdrawalId: id,
      adminId: session!.userId,
      failureReason: parsed.data.failureReason,
    });
    return NextResponse.json(withdrawal);
  } catch (err) {
    if (err instanceof WithdrawalError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
