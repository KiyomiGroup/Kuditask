import type { PrismaClient, AnnouncementAudience } from "@prisma/client";
import { logAction } from "./audit";

export class AnnouncementError extends Error {}

export interface CreateAnnouncementInput {
  title: string;
  body: string;
  audience: AnnouncementAudience;
  audienceTierId?: string; // required when audience = SPECIFIC_TIER
  recipientTaskerIds?: string[]; // required when audience = SPECIFIC_TASKERS
  publishAt?: Date; // if in the future, status starts SCHEDULED instead of PUBLISHED
}

export async function createAnnouncement(
  db: PrismaClient,
  adminId: string,
  input: CreateAnnouncementInput,
  publishNow: boolean
) {
  if (input.audience === "SPECIFIC_TIER" && !input.audienceTierId) {
    throw new AnnouncementError("Select a tier for tier-specific announcements.");
  }
  if (input.audience === "SPECIFIC_TASKERS" && !input.recipientTaskerIds?.length) {
    throw new AnnouncementError("Select at least one tasker for tasker-specific announcements.");
  }

  const status = !publishNow
    ? "DRAFT"
    : input.publishAt && input.publishAt.getTime() > Date.now()
    ? "SCHEDULED"
    : "PUBLISHED";

  return db.$transaction(async (tx) => {
    const announcement = await tx.announcement.create({
      data: {
        title: input.title,
        body: input.body,
        audience: input.audience,
        audienceTierId: input.audience === "SPECIFIC_TIER" ? input.audienceTierId : null,
        status,
        publishAt: input.publishAt,
        createdBy: adminId,
      },
    });

    if (input.audience === "SPECIFIC_TASKERS" && input.recipientTaskerIds) {
      await tx.announcementRecipient.createMany({
        data: input.recipientTaskerIds.map((taskerId) => ({ announcementId: announcement.id, taskerId })),
      });
    }

    await logAction(tx, {
      actorId: adminId,
      action: "ANNOUNCEMENT_CREATE",
      targetType: "Announcement",
      targetId: announcement.id,
      metadata: { status, audience: input.audience },
    });

    return announcement;
  });
}

/** DRAFT or SCHEDULED -> PUBLISHED. */
export async function publishAnnouncement(db: PrismaClient, adminId: string, id: string) {
  return db.$transaction(async (tx) => {
    const existing = await tx.announcement.findUniqueOrThrow({ where: { id } });
    if (existing.status === "PUBLISHED") {
      throw new AnnouncementError("Announcement is already published.");
    }
    const updated = await tx.announcement.update({
      where: { id },
      data: { status: "PUBLISHED", publishAt: existing.publishAt ?? new Date() },
    });
    await logAction(tx, { actorId: adminId, action: "ANNOUNCEMENT_PUBLISH", targetType: "Announcement", targetId: id });
    return updated;
  });
}
