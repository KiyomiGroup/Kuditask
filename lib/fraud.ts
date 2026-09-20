import type { FraudStrikeStage } from "@prisma/client";

/**
 * Determines the strike stage from how many fraud violations the tasker
 * already has BEFORE this one. Pure function — no I/O — so it's directly
 * unit-testable.
 *
 *   0 existing -> this is the 1st  -> FIRST_WARNING
 *   1 existing -> this is the 2nd  -> FINAL_WARNING
 *   2+ existing -> this is the 3rd+ -> TIER_LOCK
 */
export function determineFraudStage(existingViolationCount: number): FraudStrikeStage {
  if (existingViolationCount <= 0) return "FIRST_WARNING";
  if (existingViolationCount === 1) return "FINAL_WARNING";
  return "TIER_LOCK";
}
