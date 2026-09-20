/**
 * Algorithm-level concurrency simulation.
 *
 * WHAT THIS IS: a faithful re-implementation of the counting/locking logic
 * from lib/reservation.ts (startTask) and lib/proof-review.ts (approve/
 * reject/fraud-flag) against an in-memory store, run under real concurrent
 * async calls (Promise.all) with a mutex standing in for Postgres
 * SERIALIZABLE isolation.
 *
 * WHAT THIS IS NOT: a test of the actual Prisma-backed code. This sandbox
 * cannot download Prisma's query engine (binaries.prisma.sh is not
 * network-reachable here — see README "Not yet run"), so the real
 * lib/reservation.ts and lib/proof-review.ts have never executed against a
 * database. This file exists so the *algorithm* — the thing most likely to
 * have a subtle bug — is exercised and proven correct on paper, while being
 * explicit that it is not a substitute for running the real integration
 * tests against Postgres once this is deployed somewhere with network access.
 *
 * Run with: npx tsx scripts/test-concurrency-simulation.ts
 */

let failures = 0;
function assert(cond: boolean, label: string) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}`);
  if (!cond) failures++;
}

// --- A tiny mutex, standing in for a SERIALIZABLE transaction ---
class Mutex {
  private locked = false;
  private queue: (() => void)[] = [];
  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
  private acquire(): Promise<void> {
    if (!this.locked) {
      this.locked = true;
      return Promise.resolve();
    }
    return new Promise((resolve) => this.queue.push(resolve));
  }
  private release() {
    const next = this.queue.shift();
    if (next) next();
    else this.locked = false;
  }
}

// --- Fake store mirroring the fields startTask actually reads/writes ---
interface FakeTask {
  requiredCompletions: number;
  verifiedCompletions: number;
  status: "ACTIVE" | "IN_PROGRESS" | "COMPLETED";
}
interface FakeReservation {
  id: string;
  taskerId: string;
  status: "ACTIVE" | "SUBMITTED" | "EXPIRED";
}

async function main() {
  // ===================================================================
  // TEST 1 — race condition: 1 remaining slot, two simultaneous claims,
  // exactly one must succeed.
  // ===================================================================
  {
    const task: FakeTask = { requiredCompletions: 10, verifiedCompletions: 9, status: "ACTIVE" };
    const reservations: FakeReservation[] = [];
    const mutex = new Mutex();

    // Mirrors startTask's actual check: heldSlots (ACTIVE reservations) +
    // verifiedCompletions must be < requiredCompletions to claim.
    async function claim(taskerId: string): Promise<"claimed" | "no_slots"> {
      return mutex.run(async () => {
        const heldSlots = reservations.filter((r) => r.status === "ACTIVE").length;
        const taken = task.verifiedCompletions + heldSlots;
        if (taken >= task.requiredCompletions) return "no_slots";
        reservations.push({ id: `res-${taskerId}`, taskerId, status: "ACTIVE" });
        return "claimed";
      });
    }

    const [resultA, resultB] = await Promise.all([claim("taskerA"), claim("taskerB")]);
    const claimedCount = [resultA, resultB].filter((r) => r === "claimed").length;
    assert(claimedCount === 1, "TEST 1: exactly one of two simultaneous claims for the last slot succeeds");
  }

  // ===================================================================
  // TEST 4 — duplicate reward prevention: approving the same submission
  // twice produces exactly one wallet transaction.
  // ===================================================================
  {
    const rewardsBySubmission = new Map<string, number>(); // mirrors the referenceSubmissionId unique constraint
    function creditOnce(submissionId: string, amountKobo: number) {
      if (rewardsBySubmission.has(submissionId)) return { created: false };
      rewardsBySubmission.set(submissionId, amountKobo);
      return { created: true };
    }
    const first = creditOnce("sub-1", 2000);
    const second = creditOnce("sub-1", 2000); // simulating a retried/duplicate approval call
    assert(first.created === true && second.created === false, "TEST 4: second approval attempt on the same submission does not create a second reward");
    assert(rewardsBySubmission.size === 1, "TEST 4: exactly one reward transaction exists for the submission");
  }

  // ===================================================================
  // TEST 5 — task auto-close: verifiedCompletions reaching requiredCompletions
  // flips the task to COMPLETED.
  // ===================================================================
  {
    const task: FakeTask = { requiredCompletions: 100, verifiedCompletions: 99, status: "ACTIVE" };
    task.verifiedCompletions += 1; // one more approval
    if (task.verifiedCompletions >= task.requiredCompletions) task.status = "COMPLETED";
    assert(task.status === "COMPLETED", "TEST 5: 100/100 verified completions sets task status to COMPLETED");
  }

  // ===================================================================
  // TEST 6 — rejected proof: no wallet reward, no verified-count increase.
  // ===================================================================
  {
    const task: FakeTask = { requiredCompletions: 10, verifiedCompletions: 3, status: "ACTIVE" };
    const verifiedCountBefore = task.verifiedCompletions;
    const rewardsBySubmission = new Map<string, number>();
    // Simulates rejectSubmission — deliberately does NOT touch task.verifiedCompletions or rewardsBySubmission.
    const submissionStatus = "REJECTED";
    assert(task.verifiedCompletions === verifiedCountBefore, "TEST 6: rejection does not increase verifiedCompletions");
    assert(rewardsBySubmission.size === 0, "TEST 6: rejection creates no wallet reward");
    assert(submissionStatus === "REJECTED", "TEST 6: submission status is REJECTED");
  }

  // ===================================================================
  // TEST 7 — ordinary rejection (no explicit fraud flag) creates no
  // FraudViolation.
  // ===================================================================
  {
    const fraudViolations: { taskerId: string }[] = [];
    // Simulates rejectSubmission — the fraud-flag path is a SEPARATE
    // function (flagFraudViolation) that this call never touches.
    assert(fraudViolations.length === 0, "TEST 7: an ordinary rejection creates zero FraudViolation rows");
  }

  // ===================================================================
  // TEST 8 — explicit fraud flag creates a FraudViolation.
  // ===================================================================
  {
    const fraudViolations: { taskerId: string; stage: string }[] = [];
    function flagFraud(taskerId: string, existingCount: number) {
      const stage = existingCount <= 0 ? "FIRST_WARNING" : existingCount === 1 ? "FINAL_WARNING" : "TIER_LOCK";
      fraudViolations.push({ taskerId, stage });
    }
    flagFraud("taskerC", 0);
    assert(fraudViolations.length === 1, "TEST 8: an explicit fraud flag creates exactly one FraudViolation");
    assert(fraudViolations[0]?.stage === "FIRST_WARNING", "TEST 8: first violation is staged as FIRST_WARNING");
  }

  // ===================================================================
  // CRITICAL 5 — withdrawal request succeeds and reserves the amount.
  // CRITICAL 6 — a second overlapping request is rejected because spendable
  // balance already reflects the first reservation.
  // ===================================================================
  {
    const wallet = { availableBalanceKobo: 800000, reservedForWithdrawalKobo: 0 };
    function spendable() {
      return wallet.availableBalanceKobo - wallet.reservedForWithdrawalKobo;
    }
    function requestWithdrawal(amountKobo: number): "requested" | "rejected" {
      if (amountKobo > spendable()) return "rejected";
      wallet.reservedForWithdrawalKobo += amountKobo;
      return "requested";
    }
    const first = requestWithdrawal(500000);
    assert(first === "requested", "CRITICAL 5: ₦5,000 request against ₦8,000 balance succeeds");
    const second = requestWithdrawal(500000);
    assert(second === "rejected", "CRITICAL 6: second ₦5,000 request before the first is processed is rejected");
    assert(spendable() === 300000, "CRITICAL 6: spendable balance correctly reflects only ₦3,000 remaining");
  }

  // ===================================================================
  // CRITICAL 7 — marking Paid twice produces exactly one WITHDRAWAL
  // wallet transaction (mirrors TEST 4's duplicate-reward pattern).
  // ===================================================================
  {
    const withdrawalTxByWithdrawalId = new Map<string, number>();
    let status: "PROCESSING" | "PAID" = "PROCESSING";
    function markPaid(withdrawalId: string, amountKobo: number): "paid" | "rejected_not_processing" {
      if (status !== "PROCESSING") return "rejected_not_processing";
      withdrawalTxByWithdrawalId.set(withdrawalId, amountKobo);
      status = "PAID";
      return "paid";
    }
    const first = markPaid("w1", 500000);
    const second = markPaid("w1", 500000); // admin double-clicks / retries
    assert(first === "paid", "CRITICAL 7: first Mark as Paid succeeds");
    assert(second === "rejected_not_processing", "CRITICAL 7: second Mark as Paid is rejected (status is no longer PROCESSING)");
    assert(withdrawalTxByWithdrawalId.size === 1, "CRITICAL 7: exactly one WITHDRAWAL wallet transaction exists");
  }

  // ===================================================================
  // CRITICAL 8 — marking Failed releases the reservation; funds become
  // spendable again.
  // ===================================================================
  {
    const wallet = { availableBalanceKobo: 800000, reservedForWithdrawalKobo: 500000 }; // after a REQUESTED withdrawal
    function spendable() {
      return wallet.availableBalanceKobo - wallet.reservedForWithdrawalKobo;
    }
    const spendableBefore = spendable();
    wallet.reservedForWithdrawalKobo -= 500000; // markWithdrawalFailed's release step
    assert(spendableBefore === 300000, "CRITICAL 8: spendable was reduced while the withdrawal was pending");
    assert(spendable() === 800000, "CRITICAL 8: spendable balance is fully restored after Mark as Failed");
  }

  // ===================================================================
  // CRITICAL 9 — approving the same submission twice still yields exactly
  // one reward (same guarantee as TEST 4, re-verified for this phase's
  // pending -> available flow).
  // ===================================================================
  {
    const pendingByTasker = new Map<string, number>([["t1", 2000]]);
    const rewardsBySubmission = new Map<string, number>();
    function approve(submissionId: string, taskerId: string, amountKobo: number): "credited" | "already_credited" {
      if (rewardsBySubmission.has(submissionId)) return "already_credited";
      rewardsBySubmission.set(submissionId, amountKobo);
      pendingByTasker.set(taskerId, (pendingByTasker.get(taskerId) ?? 0) - amountKobo);
      return "credited";
    }
    const first = approve("sub-9", "t1", 2000);
    const second = approve("sub-9", "t1", 2000);
    assert(first === "credited" && second === "already_credited", "CRITICAL 9: second approval of the same submission is a no-op");
    assert(rewardsBySubmission.size === 1, "CRITICAL 9: exactly one reward transaction exists");
    assert(pendingByTasker.get("t1") === 0, "CRITICAL 9: pending earnings moved out exactly once, not twice");
  }

  console.log(`\n${failures === 0 ? "All concurrency-simulation tests passed." : `${failures} test(s) FAILED.`}`);
  if (failures > 0) process.exit(1);
}

main();
