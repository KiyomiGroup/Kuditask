/**
 * Tier reward formula — LOCKED, do not modify.
 *
 * Tier 1  = ₦10
 * Tier 2  = ₦20
 * Tier N (N > 2) = ₦20 + ₦5 * (N - 2)
 *
 * Verified against spec examples:
 *   Tier 3   = ₦25
 *   Tier 10  = ₦60
 *   Tier 50  = ₦260
 *   Tier 100 = ₦510
 *
 * Amounts are returned in kobo (₦1 = 100 kobo) to match how money is stored
 * everywhere else in the schema.
 */
export function tierRewardKobo(level: number): number {
  if (level < 1 || !Number.isInteger(level)) {
    throw new Error(`Invalid tier level: ${level}`);
  }
  if (level === 1) return 10 * 100;
  if (level === 2) return 20 * 100;
  return (20 + 5 * (level - 2)) * 100;
}

/**
 * Tier progression thresholds (verified-task count required to REACH a tier)
 * are explicitly NOT defined by the spec except for one relationship:
 *   Tier 100 requirement = 2 * Tier 50 requirement
 *
 * The spec forbids inventing numeric values for these thresholds, so this
 * returns null for every tier until product/admin supplies real numbers.
 * The Tier model's `thresholdCount` column exists for when that data lands —
 * do not populate it with guessed numbers in the meantime.
 */
export function tierThresholdCount(_level: number): number | null {
  return null;
}
