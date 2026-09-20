import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { hashPassword, createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { registerSchema, flattenZodError } from "@/lib/validation";

// Public tasker registration only. There is no `role` field accepted from
// the client anywhere in this handler — role is hardcoded to TASKER. Admin
// accounts are never created through this route (see prisma/seed.ts).
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { errors: flattenZodError(parsed.error) },
      { status: 422 }
    );
  }
  const { fullName, username, email, phone, password } = parsed.data;

  const [emailTaken, usernameTaken, phoneTaken] = await Promise.all([
    db.user.findUnique({ where: { email } }),
    db.taskerProfile.findUnique({ where: { username } }),
    db.user.findUnique({ where: { phone } }),
  ]);
  if (emailTaken) {
    return NextResponse.json({ errors: { email: "Email is already registered." } }, { status: 409 });
  }
  if (usernameTaken) {
    return NextResponse.json({ errors: { username: "Username is already taken." } }, { status: 409 });
  }
  if (phoneTaken) {
    return NextResponse.json({ errors: { phone: "Phone number is already registered." } }, { status: 409 });
  }

  const tierOne = await db.tier.findUnique({ where: { level: 1 } });
  if (!tierOne) {
    // Tiers must be seeded before registration can work — this is a server
    // misconfiguration, not a user error.
    return NextResponse.json(
      { error: "Server is not fully configured (tiers not seeded)." },
      { status: 500 }
    );
  }

  const passwordHash = await hashPassword(password);

  const user = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.user.create({
      data: {
        role: "TASKER",
        email,
        phone,
        passwordHash,
        taskerProfile: {
          create: {
            fullName,
            username,
            currentTierId: tierOne.id,
            wallet: { create: {} },
          },
        },
      },
    });
    return created;
  });

  const token = await createSessionToken({ userId: user.id, role: "TASKER" });
  const res = NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
