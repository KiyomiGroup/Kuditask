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
  const tierLevel = url.searchParams.get("tier");
  const platform = url.searchParams.get("platform");

  const taskers = await db.taskerProfile.findMany({
    where: {
      ...(status ? { accountStatus: status as never } : {}),
      ...(tierLevel ? { currentTier: { level: Number(tierLevel) } } : {}),
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: "insensitive" } },
              { username: { contains: search, mode: "insensitive" } },
              { user: { email: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
      ...(platform ? { socialAccounts: { some: { platform: platform as never, status: "ACTIVE" } } } : {}),
    },
    include: { user: true, currentTier: true, wallet: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    taskers.map((t) => ({
      id: t.id,
      fullName: t.fullName,
      username: t.username,
      email: t.user.email,
      tier: t.currentTier.level,
      verifiedTaskCount: t.verifiedTaskCount,
      availableBalanceKobo: t.wallet?.availableBalanceKobo ?? 0,
      accountStatus: t.accountStatus,
      joinedAt: t.createdAt,
    }))
  );
}
