import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireTasker } from "@/lib/rbac";
import { socialAccountSchema, flattenZodError } from "@/lib/validation";

async function loadOwnedAccount(userId: string, accountId: string) {
  const profile = await db.taskerProfile.findUnique({ where: { userId } });
  if (!profile) return { profile: null, account: null };
  const account = await db.socialAccount.findFirst({
    where: { id: accountId, taskerId: profile.id },
  });
  return { profile, account };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  try {
    requireTasker(session);
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = socialAccountSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: flattenZodError(parsed.error) }, { status: 422 });
  }

  const { account } = await loadOwnedAccount(session!.userId, id);
  if (!account) {
    return NextResponse.json({ error: "Social account not found." }, { status: 404 });
  }

  const updated = await db.socialAccount.update({
    where: { id },
    data: {
      ...(parsed.data.platform ? { platform: parsed.data.platform } : {}),
      ...(parsed.data.handle ? { handle: parsed.data.handle } : {}),
      ...(parsed.data.profileUrl !== undefined
        ? { profileUrl: parsed.data.profileUrl || null }
        : {}),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  try {
    requireTasker(session);
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const { account } = await loadOwnedAccount(session!.userId, id);
  if (!account) {
    return NextResponse.json({ error: "Social account not found." }, { status: 404 });
  }

  // Soft delete — keeps history for fraud review even after removal.
  await db.socialAccount.update({ where: { id }, data: { status: "REMOVED" } });
  return NextResponse.json({ ok: true });
}
