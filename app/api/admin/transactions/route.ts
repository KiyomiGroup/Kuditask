import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireAdmin } from "@/lib/rbac";

export async function GET(req: Request) {
  const session = await getSession();
  try {
    requireAdmin(session);
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const type = new URL(req.url).searchParams.get("type");
  const transactions = await db.walletTransaction.findMany({
    where: type ? { type: type as never } : undefined,
    include: { tasker: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(
    transactions.map((tx) => ({
      id: tx.id,
      createdAt: tx.createdAt,
      type: tx.type,
      taskerName: tx.tasker.fullName,
      amountKobo: tx.amountKobo,
      taskId: tx.taskId,
      description: tx.description,
      reference: tx.reference,
    }))
  );
}
