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

  const notifications = await db.notification.findMany({
    where: { userId: session!.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(notifications);
}

export async function PATCH(req: Request) {
  const session = await getSession();
  try {
    requireTasker(session);
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  // Mark all as read when no specific id is given — the common "clear the badge" action.
  await db.notification.updateMany({
    where: { userId: session!.userId, ...(body?.id ? { id: body.id } : {}) },
    data: { read: true },
  });
  return NextResponse.json({ ok: true });
}
