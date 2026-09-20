import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireAdmin } from "@/lib/rbac";
import { setClientStatus } from "@/lib/client-requests";
import { z } from "zod";

export async function GET(
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
  const client = await db.client.findUnique({
    where: { id },
    include: {
      requests: { orderBy: { createdAt: "desc" } },
      tasks: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });

  const totalSpendKobo = client.tasks.reduce((sum, t) => sum + t.clientPriceKobo, 0);
  const paidRequests = client.requests.filter((r) => ["PAID", "LAUNCHED", "COMPLETED"].includes(r.status));
  const totalPaidKobo = paidRequests.reduce((sum, r) => sum + (r.clientPriceKobo ?? 0), 0);
  const outstandingKobo = client.requests
    .filter((r) => r.status === "AWAITING_PAYMENT")
    .reduce((sum, r) => sum + (r.clientPriceKobo ?? 0), 0);

  return NextResponse.json({
    client,
    financialSummary: { totalPaidKobo, totalSpendKobo, outstandingKobo },
    taskHistory: client.tasks,
    requestHistory: client.requests,
  });
}

const patchSchema = z.object({ status: z.enum(["ACTIVE", "PENDING", "INACTIVE"]) });

export async function PATCH(
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
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "A valid status is required." }, { status: 422 });

  const updated = await setClientStatus(db, session!.userId, id, parsed.data.status);
  return NextResponse.json(updated);
}
