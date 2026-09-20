import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireAdmin } from "@/lib/rbac";
import { markWithdrawalProcessing, WithdrawalError } from "@/lib/withdrawal";

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
    const withdrawal = await markWithdrawalProcessing(db, { withdrawalId: id, adminId: session!.userId });
    return NextResponse.json(withdrawal);
  } catch (err) {
    if (err instanceof WithdrawalError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
