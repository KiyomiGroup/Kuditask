import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireTasker } from "@/lib/rbac";
import { requestWithdrawal, WithdrawalError } from "@/lib/withdrawal";
import { z } from "zod";

export async function GET() {
  const session = await getSession();
  try {
    requireTasker(session);
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const profile = await db.taskerProfile.findUnique({ where: { userId: session!.userId } });
  if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

  const withdrawals = await db.withdrawal.findMany({
    where: { taskerId: profile.id },
    orderBy: { requestedAt: "desc" },
  });
  return NextResponse.json(withdrawals);
}

const requestSchema = z.object({ amountKobo: z.number().int().positive() });

export async function POST(req: Request) {
  const session = await getSession();
  try {
    requireTasker(session);
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid amount is required." }, { status: 422 });
  }

  const profile = await db.taskerProfile.findUnique({ where: { userId: session!.userId } });
  if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

  try {
    const withdrawal = await requestWithdrawal(db, {
      taskerId: profile.id,
      userId: session!.userId,
      amountKobo: parsed.data.amountKobo,
    });
    return NextResponse.json(withdrawal, { status: 201 });
  } catch (err) {
    if (err instanceof WithdrawalError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
