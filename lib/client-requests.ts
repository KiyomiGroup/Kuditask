import type { PrismaClient, Prisma, SocialPlatform, ClientStatus } from "@prisma/client";
import { logAction } from "./audit";

export class ClientRequestError extends Error {}

export interface SubmitClientRequestInput {
  contactName: string;
  companyName?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  taskType: string;
  platform?: SocialPlatform;
  goal: string;
  targetLink?: string;
  requestedCompletions?: number;
  preferredCompletionDate?: Date;
  requirements: string;
  additionalNotes?: string;
  preferredContactMethod?: string;
}

/**
 * Public entry point — no auth required (clients don't have accounts, see
 * schema.prisma comment on Role.CLIENT). Finds-or-creates the Client by
 * email (falling back to a fresh row if no email given), then creates a
 * REQUESTED ClientRequest. This NEVER creates a Task — task creation is a
 * separate, explicit Admin action (lib/task-admin.ts createTask) gated
 * behind pricing and payment.
 */
export async function submitClientRequest(db: PrismaClient, input: SubmitClientRequestInput) {
  return db.$transaction(async (tx) => {
    let client = input.email
      ? await tx.client.findFirst({ where: { email: input.email } })
      : null;

    if (!client) {
      client = await tx.client.create({
        data: {
          contactName: input.contactName,
          companyName: input.companyName,
          email: input.email,
          phone: input.phone,
          whatsapp: input.whatsapp,
          status: "PENDING",
        },
      });
    }

    const request = await tx.clientRequest.create({
      data: {
        clientId: client.id,
        taskType: input.taskType,
        platform: input.platform,
        goal: input.goal,
        targetLink: input.targetLink,
        requestedCompletions: input.requestedCompletions,
        preferredCompletionDate: input.preferredCompletionDate,
        requirements: input.requirements,
        additionalNotes: input.additionalNotes,
        preferredContactMethod: input.preferredContactMethod,
        description: input.goal,
        status: "REQUESTED",
      },
    });

    return { client, request };
  });
}

async function requireRequestInStatus(
  tx: PrismaClient | Prisma.TransactionClient,
  requestId: string,
  allowed: string[]
) {
  const request = await tx.clientRequest.findUniqueOrThrow({ where: { id: requestId } });
  if (!allowed.includes(request.status)) {
    throw new ClientRequestError(
      `Request is ${request.status.toLowerCase().replace(/_/g, " ")} — cannot transition from there.`
    );
  }
  return request;
}

/** Admin starts reviewing a freshly-submitted request. */
export async function markRequestReviewing(db: PrismaClient, adminId: string, requestId: string) {
  return db.$transaction(async (tx) => {
    await requireRequestInStatus(tx, requestId, ["REQUESTED"]);
    const updated = await tx.clientRequest.update({
      where: { id: requestId },
      data: { status: "REVIEWING" },
    });
    await logAction(tx, { actorId: adminId, action: "CLIENT_REQUEST_REVIEWING", targetType: "ClientRequest", targetId: requestId });
    return updated;
  });
}

/**
 * Admin confirms pricing (client price / tasker reward / required
 * completions) and moves the request to AWAITING_PAYMENT. Economics are
 * NOT validated here on purpose — a request can be priced with a margin
 * the admin intends to fix before launch; the hard block only happens at
 * actual task creation (lib/task-admin.ts), which is where publishing
 * really happens.
 */
export async function priceClientRequest(
  db: PrismaClient,
  adminId: string,
  requestId: string,
  pricing: { clientPriceKobo: number; taskerRewardKobo: number; requiredCompletions: number }
) {
  return db.$transaction(async (tx) => {
    await requireRequestInStatus(tx, requestId, ["REQUESTED", "REVIEWING"]);
    const updated = await tx.clientRequest.update({
      where: { id: requestId },
      data: { ...pricing, status: "AWAITING_PAYMENT" },
    });
    await logAction(tx, {
      actorId: adminId,
      action: "CLIENT_REQUEST_PRICED",
      targetType: "ClientRequest",
      targetId: requestId,
      metadata: pricing,
    });
    return updated;
  });
}

/** Admin records that the client has paid (payment collection itself is manual/off-platform for MVP). */
export async function markRequestPaid(db: PrismaClient, adminId: string, requestId: string) {
  return db.$transaction(async (tx) => {
    await requireRequestInStatus(tx, requestId, ["AWAITING_PAYMENT"]);
    const updated = await tx.clientRequest.update({
      where: { id: requestId },
      data: { status: "PAID" },
    });
    await logAction(tx, { actorId: adminId, action: "CLIENT_REQUEST_PAID", targetType: "ClientRequest", targetId: requestId });
    return updated;
  });
}
// Note: PAID -> LAUNCHED happens automatically inside lib/task-admin.ts
// createTask when called with this request's id — there is no separate
// "launch" transition function, so a request can never reach LAUNCHED
// without an actual Task row existing behind it.

export async function cancelClientRequest(db: PrismaClient, adminId: string, requestId: string, reason?: string) {
  return db.$transaction(async (tx) => {
    const request = await tx.clientRequest.findUniqueOrThrow({ where: { id: requestId } });
    if (request.status === "LAUNCHED" || request.status === "COMPLETED") {
      throw new ClientRequestError("Cannot cancel a request that has already launched.");
    }
    const updated = await tx.clientRequest.update({
      where: { id: requestId },
      data: { status: "CANCELLED" },
    });
    await logAction(tx, {
      actorId: adminId,
      action: "CLIENT_REQUEST_CANCEL",
      targetType: "ClientRequest",
      targetId: requestId,
      metadata: { reason },
    });
    return updated;
  });
}

export async function setClientStatus(
  db: PrismaClient,
  adminId: string,
  clientId: string,
  status: ClientStatus
) {
  return db.$transaction(async (tx) => {
    const updated = await tx.client.update({ where: { id: clientId }, data: { status } });
    await logAction(tx, {
      actorId: adminId,
      action: "CLIENT_STATUS_CHANGE",
      targetType: "Client",
      targetId: clientId,
      metadata: { newStatus: status },
    });
    return updated;
  });
}
