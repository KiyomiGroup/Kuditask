import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireTasker } from "@/lib/rbac";

export async function GET() {
  const session = await getSession();
  try {
    requireTasker(session);
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const profile = await db.taskerProfile.findUnique({ where: { userId: session!.userId } });
  if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

  const transactions = await db.walletTransaction.findMany({
    where: { taskerId: profile.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(transactions);
}
