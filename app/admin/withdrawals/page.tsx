"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";

interface WithdrawalRow {
  id: string; amountKobo: number; status: string; requestedAt: string;
  tasker: { fullName: string; user: { email: string } };
  eligibility: { eligible: boolean; verifiedTaskCount: number; loginDayCount: number };
}

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

const STATUS_TONE: Record<string, "settled" | "warning" | "error" | "info" | "neutral"> = {
  REQUESTED: "warning", PROCESSING: "info", PAID: "settled", FAILED: "error",
};

export default function AdminWithdrawalsPage() {
  const [rows, setRows] = useState<WithdrawalRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    const params = status ? `?status=${status}` : "";
    const res = await fetch(`/api/admin/withdrawals${params}`);
    if (!res.ok) {
      setError("Could not load withdrawals.");
      return;
    }
    setRows(await res.json());
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <ErrorState description={error} />;

  return (
    <div className="flex flex-col gap-space-md">
      <h1 className="font-headline-md text-headline-md text-on-surface">Withdrawals</h1>
      <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-56">
        <option value="">All statuses</option>
        <option value="REQUESTED">Requested</option>
        <option value="PROCESSING">Processing</option>
        <option value="PAID">Paid</option>
        <option value="FAILED">Failed</option>
      </Select>

      {rows === null && <LoadingState label="Loading withdrawals..." />}
      {rows && rows.length === 0 && <EmptyState title="No withdrawals match these filters" />}

      <div className="flex flex-col gap-space-sm">
        {rows?.map((w) => (
          <Link key={w.id} href={`/admin/withdrawals/${w.id}`}>
            <Card className="p-space-md flex items-center justify-between hover:border-secondary transition">
              <div>
                <p className="text-body-md font-body-md text-on-surface">{w.tasker.fullName}</p>
                <p className="text-body-sm font-body-sm text-on-surface-variant">
                  {w.tasker.user.email} · Verified {w.eligibility.verifiedTaskCount}/500 · Login days {w.eligibility.loginDayCount}/10
                </p>
              </div>
              <div className="text-right">
                <p className="font-title-sm text-title-sm text-on-surface">{naira(w.amountKobo)}</p>
                <Badge tone={STATUS_TONE[w.status] ?? "neutral"}>{w.status}</Badge>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
