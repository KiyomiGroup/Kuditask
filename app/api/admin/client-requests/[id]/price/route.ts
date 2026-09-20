import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireAdmin } from "@/lib/rbac";
import { priceClientRequest, ClientRequestError } from "@/lib/client-requests";
import { z } from "zod";

const bodySchema = z.object({
  clientPriceKobo: z.number().int().positive(),
  taskerRewardKobo: z.number().int().positive(),
  requiredCompletions: z.number().int().positive(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  try {
    requireAdmin(session);
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Client price, tasker reward, and required completions are all required." }, { status: 422 });
  }
  try {
    const updated = await priceClientRequest(db, session!.userId, id, parsed.data);
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof ClientRequestError) return NextResponse.json({ error: err.message }, { status: 409 });
    throw err;
  }
}
