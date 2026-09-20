import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { loginSchema, flattenZodError } from "@/lib/validation";

function startOfDayUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: flattenZodError(parsed.error) }, { status: 422 });
  }
  const { email, password } = parsed.data;

  // Deliberately generic error message — never reveal whether the email
  // exists or the password was wrong; both fail the same way.
  const genericError = NextResponse.json(
    { error: "Invalid email or password." },
    { status: 401 }
  );

  const user = await db.user.findUnique({ where: { email } });
  if (!user) return genericError;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return genericError;

  const today = startOfDayUTC(new Date());
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
    db.loginDay.upsert({
      where: { userId_date: { userId: user.id, date: today } },
      update: {},
      create: { userId: user.id, date: today },
    }),
  ]);

  const token = await createSessionToken({ userId: user.id, role: user.role });
  const res = NextResponse.json({ id: user.id, role: user.role });
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
