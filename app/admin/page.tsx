"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";

interface DashboardData {
  kpis: {
    activeTaskers: number;
    activeTasks: number;
    pendingVerification: number;
    pendingWithdrawals: number;
    todaysCompletions: number;
    todaysRevenueKobo: number;
  };
  verificationQueue: {
    id: string;
    task: { title: string; taskerRewardKobo: number };
    tasker: { fullName: string };
    submittedAt: string;
    status: string;
  }[];
  activeTasks: {
    id: string;
    title: string;
    platform: string | null;
    requiredCompletions: number;
    verifiedCompletions: number;
    taskerRewardKobo: number;
    status: string;
  }[];
  recentActivity: { id: string; action: string; targetType: string; createdAt: string }[];
}

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

const KPI_LABELS: [keyof DashboardData["kpis"], string][] = [
  ["activeTaskers", "Active Taskers"],
  ["activeTasks", "Active Tasks"],
  ["pendingVerification", "Pending Verification"],
  ["pendingWithdrawals", "Pending Withdrawals"],
  ["todaysCompletions", "Today's Completions"],
  ["todaysRevenueKobo", "Today's Platform Revenue"],
];

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setError("Could not load the dashboard."));
  }, []);

  if (error) return <ErrorState description={error} />;
  if (!data) return <LoadingState label="Loading dashboard..." />;

  return (
    <div className="flex flex-col gap-space-lg">
      <h1 className="font-headline-md text-headline-md text-on-surface">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-space-md">
        {KPI_LABELS.map(([key, label]) => (
          <Card key={key} className="p-space-md">
            <p className="text-label-sm font-label-sm text-on-surface-variant">
              {label}
              {key === "todaysRevenueKobo" && <span className="text-status-warning-fg"> *</span>}
            </p>
            <p className="font-headline-sm text-headline-sm text-on-surface mt-1">
              {key === "todaysRevenueKobo" ? naira(data.kpis[key]) : data.kpis[key]}
            </p>
          </Card>
        ))}
      </div>
      <p className="text-body-sm font-body-sm text-on-surface-variant -mt-space-sm">
        * "Today's Platform Revenue" is an implementation assumption (per-completion margin on today's
        approvals), not a finalized accounting definition — see lib/reports.ts.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
        <div>
          <div className="flex items-center justify-between mb-space-sm">
            <h2 className="font-title-sm text-title-sm text-on-surface">Verification Queue</h2>
            <Link href="/admin/verification" className="text-body-sm font-body-sm text-secondary">
              View all
            </Link>
          </div>
          {data.verificationQueue.length === 0 ? (
            <EmptyState title="Nothing pending review" />
          ) : (
            <div className="flex flex-col gap-space-sm">
              {data.verificationQueue.map((s) => (
                <Card key={s.id} className="p-space-sm flex items-center justify-between">
                  <div>
                    <p className="text-body-md font-body-md text-on-surface">{s.task.title}</p>
                    <p className="text-body-sm font-body-sm text-on-surface-variant">
                      {s.tasker.fullName} · {naira(s.task.taskerRewardKobo)} · {new Date(s.submittedAt).toLocaleString()}
                    </p>
                  </div>
                  <Link href={`/admin/verification/${s.id}`}>
                    <Badge tone="warning">Review</Badge>
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-space-sm">
            <h2 className="font-title-sm text-title-sm text-on-surface">Active Tasks</h2>
            <Link href="/admin/tasks" className="text-body-sm font-body-sm text-secondary">
              View all
            </Link>
          </div>
          {data.activeTasks.length === 0 ? (
            <EmptyState title="No active tasks" />
          ) : (
            <div className="flex flex-col gap-space-sm">
              {data.activeTasks.map((t) => (
                <Card key={t.id} className="p-space-sm">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-body-md font-body-md text-on-surface">{t.title}</p>
                    <span className="text-body-sm font-body-sm text-on-surface-variant">
                      {t.verifiedCompletions}/{t.requiredCompletions}
                    </span>
                  </div>
                  <ProgressBar value={t.verifiedCompletions} max={t.requiredCompletions} />
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="font-title-sm text-title-sm text-on-surface mb-space-sm">Recent Activity</h2>
        {data.recentActivity.length === 0 ? (
          <EmptyState title="No recent activity" />
        ) : (
          <Card className="p-space-sm">
            <div className="flex flex-col divide-y divide-outline-variant">
              {data.recentActivity.map((a) => (
                <div key={a.id} className="py-space-sm flex items-center justify-between text-body-sm font-body-sm">
                  <span className="text-on-surface">{a.action.replace(/_/g, " ")}</span>
                  <span className="text-on-surface-variant">{new Date(a.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
