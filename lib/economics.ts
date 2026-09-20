/**
 * Client economics check — LOCKED rule.
 *
 * Estimated Tasker Cost = Tasker Reward × Required Completions
 * Expected Platform Margin = Client Price − Estimated Tasker Cost
 *
 * A task must NOT be publishable (Admin cannot create/activate it) when
 * margin is negative. All amounts in kobo.
 */
export function calculateMargin({
  clientPriceKobo,
  taskerRewardKobo,
  requiredCompletions,
}: {
  clientPriceKobo: number;
  taskerRewardKobo: number;
  requiredCompletions: number;
}) {
  const estimatedCostKobo = taskerRewardKobo * requiredCompletions;
  const marginKobo = clientPriceKobo - estimatedCostKobo;
  return { estimatedCostKobo, marginKobo, isViable: marginKobo >= 0 };
}

export function assertTaskIsPublishable(params: {
  clientPriceKobo: number;
  taskerRewardKobo: number;
  requiredCompletions: number;
}) {
  const { isViable, marginKobo, estimatedCostKobo } = calculateMargin(params);
  if (!isViable) {
    throw new Error(
      `Task cannot be published: negative margin (₦${(marginKobo / 100).toFixed(
        2
      )}). Estimated tasker cost ₦${(estimatedCostKobo / 100).toFixed(
        2
      )} exceeds client price ₦${(params.clientPriceKobo / 100).toFixed(2)}.`
    );
  }
}
