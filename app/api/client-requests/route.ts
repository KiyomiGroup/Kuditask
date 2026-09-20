import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { submitClientRequest } from "@/lib/client-requests";
import { z } from "zod";

const bodySchema = z.object({
  contactName: z.string().trim().min(2),
  companyName: z.string().trim().optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().optional(),
  whatsapp: z.string().trim().optional(),
  taskType: z.string().trim().min(2),
  platform: z.enum(["INSTAGRAM", "FACEBOOK", "TIKTOK", "X", "YOUTUBE", "OTHER"]).optional(),
  goal: z.string().trim().min(5),
  targetLink: z.string().trim().url().optional().or(z.literal("")),
  requestedCompletions: z.number().int().positive().optional(),
  preferredCompletionDate: z.string().optional(),
  requirements: z.string().trim().min(5),
  additionalNotes: z.string().trim().optional(),
  preferredContactMethod: z.string().trim().optional(),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the form for missing or invalid fields." }, { status: 422 });
  }

  const { preferredCompletionDate, ...rest } = parsed.data;
  const { client, request } = await submitClientRequest(db, {
    ...rest,
    targetLink: rest.targetLink || undefined,
    preferredCompletionDate: preferredCompletionDate ? new Date(preferredCompletionDate) : undefined,
  });

  // Deliberately does not return anything implying a task is live —
  // the confirmation copy on the client page states this explicitly too.
  return NextResponse.json({ requestId: request.id, clientId: client.id, status: request.status }, { status: 201 });
}
