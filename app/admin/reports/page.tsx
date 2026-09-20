"use client";
import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Table, TableHead, TableRow, TableCell } from "@/components/ui/Table";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";

interface ReportsData {
  overview: { taskCompletions: number; verifiedTasks: number; verificationRate: number; taskerEarningsKobo: number; clientSpendKobo: number; platformMarginKobo: number };
  platformBreakdown: { platform: string; taskCount: number; verifiedCompletions: number }[];
  taskerPerformance: { taskerId: string; fullName: string; tier: number; verifiedTasks: number; rejectedTasks: number; lifetimeEarningsKobo: number }[];
  proofReview: { pending: number; approved: number; rejected: number; fraudFlagged: number };
}

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [since, setSince] = useState("");

  const load = useCallback(async () => {
    const params = since ? `?since=${since}` : "";
    const res = await fetch(`/api/admin/reports${params}`);
    if (!res.ok) {
      setError("Could not load reports.");
      return;
    }
    setData(await res.json());
  }, [since]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <ErrorState description={error} />;
  if (!data) return <LoadingState label="Loading reports..." />;

  return (
    <div className="flex flex-col gap-space-lg">
      <div className="flex items-center justify-between">
        <h1 className="font-headline-md text-headline-md text-on-surface">Reports</h1>
        <Input type="date" value={since} onChange={(e) => setSince(e.target.value)} className="sm:w-56" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-space-md">
        {[
          ["Task Completions", data.overview.taskCompletions],
          ["Verified Tasks", data.overview.verifiedTasks],
          ["Verification Rate", `${(data.overview.verificationRate * 100).toFixed(0)}%`],
          ["Tasker Earnings", naira(data.overview.taskerEarningsKobo)],
          ["Client Spend", naira(data.overview.clientSpendKobo)],
          ["Platform Margin", naira(data.overview.platformMarginKobo)],
        ].map(([label, value]) => (
          <Card key={label as string} className="p-space-md">
            <p className="text-label-sm font-label-sm text-on-surface-variant">{label}</p>
            <p className="font-headline-sm text-headline-sm text-on-surface mt-1">{value}</p>
          </Card>
        ))}
      </div>

      <div>
        <p className="font-title-sm text-title-sm text-on-surface mb-space-sm">Platform Breakdown</p>
        {data.platformBreakdown.length === 0 ? <EmptyState title="No task data yet" /> : (
          <Table>
            <TableHead>
              <TableRow><TableCell header>Platform</TableCell><TableCell header>Tasks</TableCell><TableCell header>Verified Completions</TableCell></TableRow>
            </TableHead>
            <tbody>
              {data.platformBreakdown.map((p) => (
                <TableRow key={p.platform} striped>
                  <TableCell>{p.platform}</TableCell>
                  <TableCell>{p.taskCount}</TableCell>
                  <TableCell>{p.verifiedCompletions}</TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        )}
      </div>

      <div>
        <p className="font-title-sm text-title-sm text-on-surface mb-space-sm">Tasker Performance</p>
        {data.taskerPerformance.length === 0 ? <EmptyState title="No taskers yet" /> : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell header>Tasker</TableCell><TableCell header>Tier</TableCell><TableCell header>Verified</TableCell>
                <TableCell header>Rejected</TableCell><TableCell header>Lifetime Earnings</TableCell>
              </TableRow>
            </TableHead>
            <tbody>
              {data.taskerPerformance.map((t) => (
                <TableRow key={t.taskerId} striped>
                  <TableCell>{t.fullName}</TableCell>
                  <TableCell>Tier {t.tier}</TableCell>
                  <TableCell>{t.verifiedTasks}</TableCell>
                  <TableCell>{t.rejectedTasks}</TableCell>
                  <TableCell>{naira(t.lifetimeEarningsKobo)}</TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        )}
      </div>

      <div>
        <p className="font-title-sm text-title-sm text-on-surface mb-space-sm">Proof Review</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-md">
          {[
            ["Pending", data.proofReview.pending],
            ["Approved", data.proofReview.approved],
            ["Rejected", data.proofReview.rejected],
            ["Fraud Flagged", data.proofReview.fraudFlagged],
          ].map(([label, value]) => (
            <Card key={label as string} className="p-space-md text-center">
              <p className="text-label-sm font-label-sm text-on-surface-variant">{label}</p>
              <p className="font-title-sm text-title-sm text-on-surface">{value}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
