import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireTasker } from "@/lib/rbac";
import { validateProofFile, safeProofStorageKey, UploadValidationError } from "@/lib/upload";
import { uploadProofScreenshot } from "@/lib/storage";
import { submitProof, SubmissionError } from "@/lib/submission";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  try {
    requireTasker(session);
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id: reservationId } = await params;
  const profile = await db.taskerProfile.findUnique({ where: { userId: session!.userId } });
  if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

  // Ownership check happens here (not just deep in lib/reservation.ts) so we
  // fail fast with a clear 403 before doing any file work.
  const reservation = await db.taskReservation.findUnique({ where: { id: reservationId } });
  if (!reservation) return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
  if (reservation.taskerId !== profile.id) {
    return NextResponse.json({ error: "This reservation does not belong to you." }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid form submission." }, { status: 400 });

  const file = form.get("screenshot");
  const declaredGenuine = form.get("declaredGenuine") === "true";
  const submittedHandle = (form.get("submittedHandle") as string | null) ?? undefined;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A screenshot file is required." }, { status: 422 });
  }

  try {
    validateProofFile({ type: file.type, size: file.size });
  } catch (err) {
    if (err instanceof UploadValidationError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }

  const key = safeProofStorageKey(profile.id, file.type);
  const bytes = Buffer.from(await file.arrayBuffer());

  try {
    await uploadProofScreenshot(key, bytes, file.type);
  } catch (err) {
    // Storage not configured in this environment — surface a clear 503
    // rather than a generic 500, see README "Explicitly pending".
    const message = err instanceof Error ? err.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  try {
    const submission = await submitProof(db, {
      reservationId,
      taskerId: profile.id,
      userId: session!.userId,
      screenshotUrl: key,
      submittedHandle,
      declaredGenuine,
    });
    return NextResponse.json(submission, { status: 201 });
  } catch (err) {
    if (err instanceof SubmissionError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
