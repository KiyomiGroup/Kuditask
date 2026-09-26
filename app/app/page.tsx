"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";

interface WalletSummary {
  spendableBalanceKobo: number;
  pendingEarningsKobo: number;
  eligibility: { eligible: boolean; verifiedTaskCount: number; loginDayCount: number };
  thresholds: { minVerifiedTasks: number; minActiveLoginDays: number };
}
interface AvailableTask {
  id: string; title: string; taskerRewardKobo: number; remainingCompletions: number;
}

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

export default function TaskerHomePage() {
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [tasks, setTasks] = useState<AvailableTask[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/tasker/wallet").then((r) => (r.ok ? r.json() : Promise.reject())),
      fetch("/api/tasks?sort=newest").then((r) => (r.ok ? r.json() : Promise.reject())),
    ])
      .then(([w, t]) => {
        setWallet(w);
        setTasks(t.slice(0, 3));
      })
      .catch(() => setError("Could not load your dashboard."));
  }, []);

  if (error) return <ErrorState description={error} />;
  if (!wallet || !tasks) return <LoadingState label="Loading dashboard..." />;

  return (
    <div className="flex flex-col gap-space-lg">
      <h1 className="font-headline-md text-headline-md text-on-surface">Home</h1>

      <div className="grid grid-cols-2 gap-space-md">
        <Card className="p-space-md">
          <p className="text-label-sm font-label-sm text-on-surface-variant">Available Balance</p>
          <p className="font-headline-sm text-headline-sm text-on-surface mt-1">{naira(wallet.spendableBalanceKobo)}</p>
        </Card>
        <Card className="p-space-md">
          <p className="text-label-sm font-label-sm text-on-surface-variant">Pending Earnings</p>
          <p className="font-headline-sm text-headline-sm text-on-surface mt-1">{naira(wallet.pendingEarningsKobo)}</p>
        </Card>
      </div>

      <Card className="p-space-md">
        <div className="flex items-center justify-between mb-space-sm">
          <p className="font-title-sm text-title-sm text-on-surface">Withdrawal Progress</p>
          <Badge tone={wallet.eligibility.eligible ? "settled" : "warning"}>
            {wallet.eligibility.eligible ? "Eligible" : "Locked"}
          </Badge>
        </div>
        <div className="flex flex-col gap-space-sm">
          <div>
            <div className="flex justify-between text-body-sm font-body-sm text-on-surface-variant mb-1">
              <span>Verified tasks</span>
              <span>{wallet.eligibility.verifiedTaskCount} / {wallet.thresholds.minVerifiedTasks}</span>
            </div>
            <ProgressBar value={wallet.eligibility.verifiedTaskCount} max={wallet.thresholds.minVerifiedTasks} />
          </div>
          <div>
            <div className="flex justify-between text-body-sm font-body-sm text-on-surface-variant mb-1">
              <span>Active login days</span>
              <span>{wallet.eligibility.loginDayCount} / {wallet.thresholds.minActiveLoginDays}</span>
            </div>
            <ProgressBar value={wallet.eligibility.loginDayCount} max={wallet.thresholds.minActiveLoginDays} />
          </div>
        </div>
        <Link href="/app/wallet" className="text-body-sm font-body-sm text-secondary mt-space-sm inline-block">
          View wallet →
        </Link>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-space-sm">
          <p className="font-title-sm text-title-sm text-on-surface">Available Tasks</p>
          <Link href="/app/tasks" className="text-body-sm font-body-sm text-secondary">View all</Link>
        </div>
        {tasks.length === 0 ? (
          <EmptyState title="No tasks available right now" />
        ) : (
          <div className="flex flex-col gap-space-sm">
            {tasks.map((t) => (
              <Link key={t.id} href={`/app/tasks/${t.id}`}>
                <Card className="p-space-sm flex items-center justify-between hover:border-secondary transition">
                  <span className="text-body-md font-body-md text-on-surface">{t.title}</span>
                  <Badge tone="settled">{naira(t.taskerRewardKobo)}</Badge>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
