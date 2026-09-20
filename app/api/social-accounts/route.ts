import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireTasker } from "@/lib/rbac";
import { socialAccountSchema, flattenZodError } from "@/lib/validation";

export async function GET() {
  const session = await getSession();
  try {
    requireTasker(session);
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const profile = await db.taskerProfile.findUnique({
    where: { userId: session!.userId },
  });
  if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

  const accounts = await db.socialAccount.findMany({
    where: { taskerId: profile.id, status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(accounts);
}

export async function POST(req: Request) {
  const session = await getSession();
  try {
    requireTasker(session);
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = socialAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: flattenZodError(parsed.error) }, { status: 422 });
  }

  const profile = await db.taskerProfile.findUnique({
    where: { userId: session!.userId },
  });
  if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

  // Deliberately no uniqueness check on (taskerId, platform) — multiple
  // accounts per platform are allowed per spec.
  const account = await db.socialAccount.create({
    data: {
      taskerId: profile.id,
      platform: parsed.data.platform,
      handle: parsed.data.handle,
      profileUrl: parsed.data.profileUrl || null,
    },
  });
  return NextResponse.json(account, { status: 201 });
}
