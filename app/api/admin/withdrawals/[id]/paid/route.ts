import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireAdmin } from "@/lib/rbac";
import { markWithdrawalPaid, WithdrawalError } from "@/lib/withdrawal";
import { z } from "zod";

const bodySchema = z.object({ paystackRef: z.string().min(1, "A payment reference is required.") });

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
    return NextResponse.json({ error: "A payment reference is required." }, { status: 422 });
  }

  try {
    const withdrawal = await markWithdrawalPaid(db, {
      withdrawalId: id,
      adminId: session!.userId,
      paystackRef: parsed.data.paystackRef,
    });
    return NextResponse.json(withdrawal);
  } catch (err) {
    if (err instanceof WithdrawalError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
