import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { tierRewardKobo, tierThresholdCount } from "../lib/tier";

const prisma = new PrismaClient();

async function seedTiers() {
  for (let level = 1; level <= 100; level++) {
    await prisma.tier.upsert({
      where: { level },
      update: { rewardKobo: tierRewardKobo(level) },
      create: {
        level,
        rewardKobo: tierRewardKobo(level),
        thresholdCount: tierThresholdCount(level),
      },
    });
  }
  console.log("Seeded tiers 1-100.");
}

async function seedAdmin() {
  const adminPassword = process.env.ADMIN_SEED_PASSWORD;
  const adminEmail = process.env.ADMIN_SEED_EMAIL;
  if (!adminPassword || !adminEmail) {
    console.log(
      "Skipped admin seed — set ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD to create one."
    );
    return null;
  }
  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, role: "ADMIN", passwordHash },
  });
  console.log(`Seeded admin account: ${adminEmail}`);
  return admin;
}

async function makeTasker(opts: {
  email: string;
  phone: string;
  fullName: string;
  username: string;
  tierLevel: number;
  password?: string;
  accountStatus?: "ACTIVE" | "UNDER_REVIEW" | "SUSPENDED" | "BANNED";
  verifiedTaskCount?: number;
  tierLocked?: boolean;
}) {
  const tier = await prisma.tier.findUniqueOrThrow({ where: { level: opts.tierLevel } });
  const passwordHash = await bcrypt.hash(opts.password ?? "Password123", 12);
  const user = await prisma.user.upsert({
    where: { email: opts.email },
    update: {},
    create: {
      email: opts.email,
      phone: opts.phone,
      role: "TASKER",
      passwordHash,
      taskerProfile: {
        create: {
          fullName: opts.fullName,
          username: opts.username,
          currentTierId: tier.id,
          accountStatus: opts.accountStatus ?? "ACTIVE",
          verifiedTaskCount: opts.verifiedTaskCount ?? 0,
          tierLocked: opts.tierLocked ?? false,
          wallet: { create: {} },
        },
      },
    },
    include: { taskerProfile: true },
  });
  return user;
}

async function main() {
  await seedTiers();
  const admin = await seedAdmin();

  // QA / manual-preview account — the literal credentials for click-through
  // testing. Kept separate from the fictional demo taskers below so it's
  // obvious which one to log in with.
  const qaTasker = await makeTasker({
    email: "tasker@test.local",
    phone: "+2348030000001",
    fullName: "QA Test Tasker",
    username: "qa_tasker",
    tierLevel: 2,
    password: "TestPassword123!",
    verifiedTaskCount: 0,
  });
  console.log("Seeded QA tasker account: tasker@test.local / TestPassword123!");

  const activeTasker = await makeTasker({
    email: "amaka.tasker@example.com",
    phone: "+2348031112222",
    fullName: "Amaka Eze",
    username: "amaka_e",
    tierLevel: 12,
    verifiedTaskCount: 340,
  });
  const eligibleTasker = await makeTasker({
    email: "chidi.tasker@example.com",
    phone: "+2348031113333",
    fullName: "Chidi Okafor",
    username: "chidi_o",
    tierLevel: 35,
    verifiedTaskCount: 520,
  });
  const suspendedTasker = await makeTasker({
    email: "bola.tasker@example.com",
    phone: "+2348031114444",
    fullName: "Bola Adeyemi",
    username: "bola_a",
    tierLevel: 5,
    accountStatus: "SUSPENDED",
    verifiedTaskCount: 40,
  });
  await makeTasker({
    email: "ngozi.tasker@example.com",
    phone: "+2348031115555",
    fullName: "Ngozi Umeh",
    username: "ngozi_u",
    tierLevel: 3,
    accountStatus: "UNDER_REVIEW",
    verifiedTaskCount: 12,
  });
  const tierLockedTasker = await makeTasker({
    email: "tunde.tasker@example.com",
    phone: "+2348031116666",
    fullName: "Tunde Bakare",
    username: "tunde_b",
    tierLevel: 8,
    verifiedTaskCount: 90,
    tierLocked: true,
  });
  console.log("Seeded 5 taskers with varied statuses.");

  const today = new Date();
  for (let i = 0; i < 10; i++) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const dayOnly = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    await prisma.loginDay.upsert({
      where: { userId_date: { userId: eligibleTasker.id, date: dayOnly } },
      update: {},
      create: { userId: eligibleTasker.id, date: dayOnly },
    });
  }
  for (let i = 0; i < 3; i++) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const dayOnly = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    await prisma.loginDay.upsert({
      where: { userId_date: { userId: activeTasker.id, date: dayOnly } },
      update: {},
      create: { userId: activeTasker.id, date: dayOnly },
    });
  }

  await prisma.socialAccount.createMany({
    data: [
      { taskerId: activeTasker.taskerProfile!.id, platform: "INSTAGRAM", handle: "@amaka.eze" },
      { taskerId: activeTasker.taskerProfile!.id, platform: "INSTAGRAM", handle: "@amaka.biz" },
      { taskerId: activeTasker.taskerProfile!.id, platform: "TIKTOK", handle: "@amakaeze" },
      { taskerId: eligibleTasker.taskerProfile!.id, platform: "X", handle: "@chidi_okafor" },
      { taskerId: eligibleTasker.taskerProfile!.id, platform: "YOUTUBE", handle: "Chidi Okafor Vlogs" },
    ],
  });
  console.log("Seeded social accounts.");

  const clientLagos = await prisma.client.create({
    data: {
      contactName: "Funmi Adebayo",
      companyName: "Lagos Fashion Hub",
      whatsapp: "+2348051234567",
      email: "hello@lagosfashionhub.example",
      status: "ACTIVE",
    },
  });
  const clientAbuja = await prisma.client.create({
    data: { contactName: "Ibrahim Musa", companyName: "Abuja Tech Reviews", whatsapp: "+2348059876543", status: "PENDING" },
  });

  const pricedRequest = await prisma.clientRequest.create({
    data: {
      clientId: clientLagos.id,
      taskType: "Instagram Follow Campaign",
      platform: "INSTAGRAM",
      goal: "Grow Instagram following ahead of a new collection launch",
      targetLink: "https://instagram.com/lagosfashionhub",
      requestedCompletions: 100,
      preferredContactMethod: "whatsapp",
      description: "Instagram follower growth campaign",
      requirements: "Follow @lagosfashionhub and like the pinned post. Screenshot required.",
      status: "AWAITING_PAYMENT",
      clientPriceKobo: 250000 * 100,
      taskerRewardKobo: tierRewardKobo(2),
      requiredCompletions: 100,
    },
  });
  await prisma.clientRequest.create({
    data: {
      clientId: clientAbuja.id,
      taskType: "App Testing",
      goal: "Validate the new fintech onboarding flow before public launch",
      requestedCompletions: 50,
      preferredContactMethod: "email",
      description: "App testing — new fintech onboarding flow",
      requirements: "Install the TestFlight build, complete onboarding, report bugs.",
      status: "REQUESTED",
    },
  });
  console.log("Seeded 2 clients and 2 client requests.");

  if (admin) {
    const activeTask = await prisma.task.create({
      data: {
        clientId: clientLagos.id,
        clientRequestId: pricedRequest.id,
        title: "Follow & Like — Lagos Fashion Hub",
        category: "Instagram",
        platform: "INSTAGRAM",
        description: "Grow @lagosfashionhub's Instagram following ahead of their new collection launch.",
        instructions: "Follow @lagosfashionhub on Instagram, like the pinned post, screenshot both.",
        targetUrl: "https://instagram.com/lagosfashionhub",
        clientPriceKobo: pricedRequest.clientPriceKobo!,
        taskerRewardKobo: pricedRequest.taskerRewardKobo!,
        requiredCompletions: pricedRequest.requiredCompletions!,
        verifiedCompletions: 1,
        status: "ACTIVE",
        createdByAdminId: admin.id,
      },
    });

    await prisma.task.create({
      data: {
        clientId: clientAbuja.id,
        title: "TikTok engagement — Abuja Tech Reviews",
        category: "TikTok",
        platform: "TIKTOK",
        description: "Boost engagement on Abuja Tech Reviews' latest phone review video.",
        instructions: "Follow, like and comment on the pinned TikTok video.",
        targetUrl: "https://tiktok.com/@abujatechreviews",
        clientPriceKobo: 60000 * 100,
        taskerRewardKobo: tierRewardKobo(1),
        requiredCompletions: 50,
        status: "PAUSED",
        createdByAdminId: admin.id,
      },
    });

    const completedTask = await prisma.task.create({
      data: {
        clientId: clientLagos.id,
        title: "Website usability testing — checkout flow",
        category: "Website Testing",
        description: "Test the new checkout flow on lagosfashionhub.example and report any friction.",
        instructions: "Complete a test purchase and report friction points.",
        clientPriceKobo: 30000 * 100,
        taskerRewardKobo: tierRewardKobo(5),
        requiredCompletions: 10,
        verifiedCompletions: 10,
        status: "COMPLETED",
        createdByAdminId: admin.id,
      },
    });

    const now = Date.now();

    const pendingReservation = await prisma.taskReservation.create({
      data: {
        taskId: activeTask.id,
        taskerId: activeTasker.taskerProfile!.id,
        status: "SUBMITTED",
        expiresAt: new Date(now + 10 * 60 * 1000),
      },
    });
    await prisma.taskSubmission.create({
      data: {
        taskId: activeTask.id,
        taskerId: activeTasker.taskerProfile!.id,
        reservationId: pendingReservation.id,
        screenshotUrl: "seed/proof/amaka-ig-follow.png",
        declaredGenuine: true,
        status: "PENDING",
      },
    });

    const approvedReservation = await prisma.taskReservation.create({
      data: {
        taskId: completedTask.id,
        taskerId: eligibleTasker.taskerProfile!.id,
        status: "SUBMITTED",
        expiresAt: new Date(now - 60 * 60 * 1000),
      },
    });
    const approvedSubmission = await prisma.taskSubmission.create({
      data: {
        taskId: completedTask.id,
        taskerId: eligibleTasker.taskerProfile!.id,
        reservationId: approvedReservation.id,
        screenshotUrl: "seed/proof/chidi-checkout-test.png",
        declaredGenuine: true,
        status: "APPROVED",
      },
    });
    await prisma.proofReview.create({
      data: { submissionId: approvedSubmission.id, adminId: admin.id, decision: "APPROVED" },
    });

    const rejectedReservation = await prisma.taskReservation.create({
      data: {
        taskId: activeTask.id,
        taskerId: suspendedTasker.taskerProfile!.id,
        status: "SUBMITTED",
        expiresAt: new Date(now - 30 * 60 * 1000),
      },
    });
    const rejectedSubmission = await prisma.taskSubmission.create({
      data: {
        taskId: activeTask.id,
        taskerId: suspendedTasker.taskerProfile!.id,
        reservationId: rejectedReservation.id,
        screenshotUrl: "seed/proof/bola-unclear.png",
        declaredGenuine: true,
        status: "REJECTED",
      },
    });
    await prisma.proofReview.create({
      data: {
        submissionId: rejectedSubmission.id,
        adminId: admin.id,
        decision: "REJECTED",
        rejectionReason: "UNCLEAR_PROOF",
        isFraudFlag: false,
      },
    });

    const fraudReservation = await prisma.taskReservation.create({
      data: {
        taskId: activeTask.id,
        taskerId: tierLockedTasker.taskerProfile!.id,
        status: "SUBMITTED",
        expiresAt: new Date(now - 45 * 60 * 1000),
      },
    });
    const fraudSubmission = await prisma.taskSubmission.create({
      data: {
        taskId: activeTask.id,
        taskerId: tierLockedTasker.taskerProfile!.id,
        reservationId: fraudReservation.id,
        screenshotUrl: "seed/proof/tunde-edited.png",
        declaredGenuine: true,
        status: "FRAUD_FLAGGED",
      },
    });
    const fraudReview = await prisma.proofReview.create({
      data: {
        submissionId: fraudSubmission.id,
        adminId: admin.id,
        decision: "FRAUD_FLAGGED",
        rejectionReason: "EDITED_SCREENSHOT",
        isFraudFlag: true,
      },
    });
    await prisma.fraudViolation.create({
      data: {
        taskerId: tierLockedTasker.taskerProfile!.id,
        reviewId: fraudReview.id,
        stage: "TIER_LOCK",
        appealStatus: "PENDING",
      },
    });
    console.log("Seeded reservations/submissions/reviews (pending, approved, rejected, fraud).");

    const chidiWallet = await prisma.wallet.findUniqueOrThrow({
      where: { taskerId: eligibleTasker.taskerProfile!.id },
    });
    const rewardKobo = completedTask.taskerRewardKobo;
    await prisma.walletTransaction.create({
      data: {
        walletId: chidiWallet.id,
        taskerId: eligibleTasker.taskerProfile!.id,
        type: "TASK_REWARD",
        amountKobo: rewardKobo,
        balanceBeforeKobo: chidiWallet.availableBalanceKobo,
        balanceAfterKobo: chidiWallet.availableBalanceKobo + rewardKobo,
        taskId: completedTask.id,
        referenceSubmissionId: approvedSubmission.id,
        description: "Approved: Website usability testing — checkout flow",
      },
    });
    // Bumping straight to a demo-worthy balance (bypassing the full reward
    // history that would realistically produce it) so the wallet dashboard
    // and withdrawal-eligible state have something to show in dev.
    const demoBalanceKobo = 824000; // ₦8,240 — matches the spec's own worked example
    await prisma.wallet.update({
      where: { id: chidiWallet.id },
      data: {
        availableBalanceKobo: { increment: demoBalanceKobo },
        lifetimeEarningsKobo: { increment: rewardKobo + demoBalanceKobo },
      },
    });

    // LOCKED/ELIGIBLE are computed states (checkWithdrawalEligibility), not
    // something ever stored on a Withdrawal row — a row only exists from
    // the moment a request is actually made. Chidi now has a demo balance
    // and meets both other conditions, so seed one real REQUESTED
    // withdrawal for the admin queue to show.
    await prisma.wallet.update({
      where: { id: chidiWallet.id },
      data: { reservedForWithdrawalKobo: { increment: 500000 } },
    });
    await prisma.withdrawal.create({
      data: { taskerId: eligibleTasker.taskerProfile!.id, amountKobo: 500000, status: "REQUESTED" },
    });
    console.log("Seeded wallet transaction and 2 withdrawals (eligible, locked).");

    await prisma.announcement.create({
      data: {
        title: "New withdrawal schedule",
        body: "Withdrawals now process every Sunday at 5:00 PM.",
        createdBy: admin.id,
      },
    });
  } else {
    console.log(
      "Skipped tasks/submissions/wallet/withdrawal/announcement seed data — requires an admin (set ADMIN_SEED_EMAIL/PASSWORD)."
    );
  }

  await prisma.notification.create({
    data: {
      userId: activeTasker.id,
      title: "Submission received",
      body: "Your proof for 'Follow & Like — Lagos Fashion Hub' is pending verification.",
    },
  });
  await prisma.notification.create({
    data: {
      userId: eligibleTasker.id,
      title: "Reward approved",
      body: "You earned ₦35.00 for 'Website usability testing — checkout flow'.",
      read: true,
    },
  });
  console.log("Seeded notifications.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
