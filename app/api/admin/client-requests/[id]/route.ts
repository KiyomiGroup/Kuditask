import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireAdmin } from "@/lib/rbac";

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
  const request = await db.clientRequest.findUnique({
    where: { id },
    include: { client: true, task: true },
  });
  if (!request) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  return NextResponse.json(request);
}
