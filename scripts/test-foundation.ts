/**
 * Pure-logic tests — no database, no network. Run with:
 *   npx tsx scripts/test-foundation.ts
 *
 * These cover exactly the assertions the spec's Phase 1 "Testing" section
 * calls out for tier rewards and withdrawal eligibility, plus the client
 * economics guard. Anything requiring a live Postgres connection (auth
 * endpoints, social account CRUD, protected routes) is NOT covered here —
 * see README "Testing performed" for what that leaves untested.
 */
import { tierRewardKobo } from "../lib/tier";
import { isWithdrawalEligible, MIN_WITHDRAWAL_KOBO } from "../lib/withdrawal";
import { calculateMargin } from "../lib/economics";
import { determineFraudStage } from "../lib/fraud";
import { remainingCompletions } from "../lib/tasks";
import { spendableBalanceKobo } from "../lib/wallet";
import { requireAdmin, requireTasker } from "../lib/rbac";
import { readFileSync } from "fs";
import { join } from "path";

let failures = 0;

function assertEqual(actual: unknown, expected: unknown, label: string) {
  const pass = actual === expected;
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}  (got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)})`);
  if (!pass) failures++;
}

// --- Tier reward formula ---
assertEqual(tierRewardKobo(1), 1000, "Tier 1 = ₦10");
assertEqual(tierRewardKobo(2), 2000, "Tier 2 = ₦20");
assertEqual(tierRewardKobo(3), 2500, "Tier 3 = ₦25");
assertEqual(tierRewardKobo(4), 3000, "Tier 4 = ₦30");
assertEqual(tierRewardKobo(5), 3500, "Tier 5 = ₦35");
assertEqual(tierRewardKobo(10), 6000, "Tier 10 = ₦60");
assertEqual(tierRewardKobo(20), 11000, "Tier 20 = ₦110");
assertEqual(tierRewardKobo(50), 26000, "Tier 50 = ₦260");
assertEqual(tierRewardKobo(100), 51000, "Tier 100 = ₦510");

// --- Withdrawal eligibility (all three conditions required) ---
// Phase 3's critical tests, verbatim:
assertEqual(isWithdrawalEligible(500000, 499, 10), false, "CRITICAL 1: 499 verified + 10 active days (balance ok) = Locked");
assertEqual(isWithdrawalEligible(500000, 500, 9), false, "CRITICAL 2: 500 verified + 9 active days (balance ok) = Locked");
assertEqual(isWithdrawalEligible(499900, 500, 10), false, "CRITICAL 3: 500 verified + 10 active days + ₦4,999 = Locked");
assertEqual(isWithdrawalEligible(500000, 500, 10), true, "CRITICAL 4: 500 verified + 10 active days + ₦5,000 = Eligible");
assertEqual(isWithdrawalEligible(0, 0, 0), false, "0 everything = locked");
assertEqual(MIN_WITHDRAWAL_KOBO, 500000, "Minimum withdrawal = ₦5,000 (500000 kobo)");

// --- Client economics guard ---
assertEqual(
  calculateMargin({ clientPriceKobo: 150000, taskerRewardKobo: 2000, requiredCompletions: 100 }).isViable,
  false,
  "Spec's invalid example (₦1,500 price, ₦20×100 cost) is rejected"
);
assertEqual(
  calculateMargin({ clientPriceKobo: 250000, taskerRewardKobo: 2000, requiredCompletions: 100 }).isViable,
  true,
  "Spec's valid example (₦2,500 price, ₦20×100 cost) is accepted"
);
assertEqual(
  calculateMargin({ clientPriceKobo: 250000, taskerRewardKobo: 2000, requiredCompletions: 100 }).marginKobo,
  50000,
  "Valid example margin = ₦500 (50000 kobo)"
);

// --- Fraud strike progression ---
assertEqual(determineFraudStage(0), "FIRST_WARNING", "1st fraud violation = FIRST_WARNING");
assertEqual(determineFraudStage(1), "FINAL_WARNING", "2nd fraud violation = FINAL_WARNING");
assertEqual(determineFraudStage(2), "TIER_LOCK", "3rd fraud violation = TIER_LOCK");
assertEqual(determineFraudStage(5), "TIER_LOCK", "6th fraud violation stays TIER_LOCK");

// --- Derived remainingCompletions ---
assertEqual(remainingCompletions({ requiredCompletions: 100, verifiedCompletions: 62 }), 38, "62/100 verified -> 38 remaining");
assertEqual(remainingCompletions({ requiredCompletions: 10, verifiedCompletions: 10 }), 0, "10/10 verified -> 0 remaining");
assertEqual(remainingCompletions({ requiredCompletions: 10, verifiedCompletions: 11 }), 0, "over-verified never reports negative remaining");

// --- Spendable balance (available minus reserved-for-withdrawal) ---
assertEqual(spendableBalanceKobo({ availableBalanceKobo: 800000, reservedForWithdrawalKobo: 0 }), 800000, "₦8,000 available, nothing reserved -> ₦8,000 spendable");
assertEqual(spendableBalanceKobo({ availableBalanceKobo: 800000, reservedForWithdrawalKobo: 500000 }), 300000, "₦8,000 available, ₦5,000 reserved -> ₦3,000 spendable (CRITICAL 6 mechanism)");

// --- RBAC (Phase 6 critical tests: tasker cannot access admin routes / non-admin cannot create tasks) ---
function throws(fn: () => void): boolean {
  try {
    fn();
    return false;
  } catch {
    return true;
  }
}
const taskerSession = { userId: "u1", role: "TASKER" as const };
const adminSession = { userId: "u2", role: "ADMIN" as const };
assertEqual(throws(() => requireAdmin(taskerSession)), true, "CRITICAL: a TASKER session is rejected by requireAdmin (cannot reach admin routes)");
assertEqual(throws(() => requireAdmin(null)), true, "requireAdmin rejects an unauthenticated session");
assertEqual(throws(() => requireAdmin(adminSession)), false, "requireAdmin accepts an ADMIN session");
assertEqual(throws(() => requireTasker(adminSession)), true, "an ADMIN session is rejected by requireTasker");

// --- Structural: submitting a ClientRequest never creates a Task ---
// Genuinely automatable without a database: read the function's source and
// confirm it contains no db.task.create call anywhere in the file. Task
// creation only exists in lib/task-admin.ts's createTask, a separate,
// explicit Admin action.
const clientRequestsSource = readFileSync(join(__dirname, "../lib/client-requests.ts"), "utf-8");
assertEqual(
  /\.task\.create/.test(clientRequestsSource),
  false,
  "CRITICAL: lib/client-requests.ts contains no db.task.create call anywhere"
);

console.log(`\n${failures === 0 ? "All pure-logic tests passed." : `${failures} test(s) FAILED.`}`);
if (failures > 0) process.exit(1);
