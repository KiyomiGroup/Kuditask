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

  const status = new URL(req.url).searchParams.get("status");
  const requests = await db.clientRequest.findMany({
    where: status ? { status: status as never } : undefined,
    include: { client: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(requests);
}
