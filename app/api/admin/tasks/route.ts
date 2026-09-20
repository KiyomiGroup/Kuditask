import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireAdmin } from "@/lib/rbac";
import { createTask, TaskAdminError } from "@/lib/task-admin";
import { remainingCompletions } from "@/lib/tasks";
import { z } from "zod";

export async function GET(req: Request) {
  const session = await getSession();
  try {
    requireAdmin(session);
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const status = new URL(req.url).searchParams.get("status");
  const tasks = await db.task.findMany({
    where: status ? { status: status as never } : undefined,
    include: { client: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tasks.map((t) => ({ ...t, remainingCompletions: remainingCompletions(t) })));
}

const createSchema = z.object({
  clientId: z.string(),
  clientRequestId: z.string().optional(),
  title: z.string().trim().min(3),
  category: z.string().trim().min(2),
  platform: z.enum(["INSTAGRAM", "FACEBOOK", "TIKTOK", "X", "YOUTUBE", "OTHER"]).optional(),
  description: z.string().trim().min(5),
  instructions: z.string().trim().min(5),
  targetUrl: z.string().trim().url().optional().or(z.literal("")),
  clientPriceKobo: z.number().int().positive(),
  taskerRewardKobo: z.number().int().positive(),
  requiredCompletions: z.number().int().positive(),
  minTierId: z.string().optional(),
  assignmentScope: z.enum(["ALL_ELIGIBLE", "SPECIFIC_TIERS", "SPECIFIC_TASKERS", "SPECIFIC_PLATFORM"]),
  assignedTierIds: z.array(z.string()).optional(),
  assignedTaskerIds: z.array(z.string()).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  try {
    requireAdmin(session);
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the task form for missing or invalid fields." }, { status: 422 });
  }
  const { startDate, endDate, targetUrl, ...rest } = parsed.data;

  try {
    const task = await createTask(db, session!.userId, {
      ...rest,
      targetUrl: targetUrl || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    if (err instanceof TaskAdminError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
