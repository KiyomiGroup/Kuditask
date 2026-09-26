"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/feedback/Alert";
import { LoadingState, ErrorState } from "@/components/ui/States";

interface WalletSummary {
  eligibility: { verifiedTaskCount: number };
}

function tierRewardKobo(level: number) {
  if (level === 1) return 1000;
  if (level === 2) return 2000;
  return (20 + 5 * (level - 2)) * 100;
}
function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

const HIGHLIGHT_LEVELS = [1, 2, 3, 5, 10, 20, 50, 100];

export default function TierPage() {
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/tasker/wallet")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setWallet)
      .catch(() => setError("Could not load your tier."));
  }, []);

  if (error) return <ErrorState description={error} />;
  if (!wallet) return <LoadingState label="Loading tier..." />;

  return (
    <div className="max-w-xl flex flex-col gap-space-md">
      <h1 className="font-headline-md text-headline-md text-on-surface">Tier</h1>

      <Card className="p-space-md">
        <p className="text-label-sm font-label-sm text-on-surface-variant">Verified tasks so far</p>
        <p className="font-headline-sm text-headline-sm text-on-surface">{wallet.eligibility.verifiedTaskCount}</p>
      </Card>

      <Card className="p-space-md">
        <p className="font-title-sm text-title-sm text-on-surface mb-space-sm">Reward by Tier (locked formula)</p>
        <div className="flex flex-col gap-1">
          {HIGHLIGHT_LEVELS.map((level) => (
            <div key={level} className="flex justify-between text-body-sm font-body-sm py-1 border-b border-outline-variant last:border-0">
              <span className="text-on-surface-variant">Tier {level}</span>
              <Badge tone="settled">{naira(tierRewardKobo(level))}</Badge>
            </div>
          ))}
        </div>
      </Card>

      <Alert tone="info">
        Exactly how many verified tasks are needed to reach each tier hasn't been finalized yet, so it
        isn't shown here — your tier updates automatically as that's defined.
      </Alert>
    </div>
  );
}
