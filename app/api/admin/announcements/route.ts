import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireAdmin } from "@/lib/rbac";
import { createAnnouncement, AnnouncementError } from "@/lib/announcements";
import { z } from "zod";

export async function GET() {
  const session = await getSession();
  try {
    requireAdmin(session);
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const announcements = await db.announcement.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(announcements);
}

const bodySchema = z.object({
  title: z.string().trim().min(2),
  body: z.string().trim().min(2),
  audience: z.enum(["ALL_TASKERS", "SPECIFIC_TIER", "SPECIFIC_TASKERS", "PLATFORM_WIDE"]),
  audienceTierId: z.string().optional(),
  recipientTaskerIds: z.array(z.string()).optional(),
  publishAt: z.string().optional(),
  publishNow: z.boolean().default(false),
});

export async function POST(req: Request) {
  const session = await getSession();
  try {
    requireAdmin(session);
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Title, body, and audience are required." }, { status: 422 });
  }
  const { publishNow, publishAt, ...rest } = parsed.data;

  try {
    const announcement = await createAnnouncement(
      db,
      session!.userId,
      { ...rest, publishAt: publishAt ? new Date(publishAt) : undefined },
      publishNow
    );
    return NextResponse.json(announcement, { status: 201 });
  } catch (err) {
    if (err instanceof AnnouncementError) return NextResponse.json({ error: err.message }, { status: 422 });
    throw err;
  }
}
