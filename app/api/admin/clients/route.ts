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

  const url = new URL(req.url);
  const search = url.searchParams.get("search");
  const status = url.searchParams.get("status");

  const clients = await db.client.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ...(search
        ? {
            OR: [
              { contactName: { contains: search, mode: "insensitive" } },
              { companyName: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { requests: true, tasks: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    clients.map((c) => ({
      id: c.id,
      contactName: c.contactName,
      companyName: c.companyName,
      status: c.status,
      requestCount: c.requests.length,
      activeTaskCount: c.tasks.filter((t) => t.status === "ACTIVE" || t.status === "IN_PROGRESS").length,
      completedTaskCount: c.tasks.filter((t) => t.status === "COMPLETED").length,
      totalSpendKobo: c.tasks.reduce((sum, t) => sum + t.clientPriceKobo, 0),
    }))
  );
}
