"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Table, TableHead, TableRow, TableCell } from "@/components/ui/Table";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";

interface TaskerRow {
  id: string;
  fullName: string;
  username: string;
  email: string;
  tier: number;
  verifiedTaskCount: number;
  availableBalanceKobo: number;
  accountStatus: string;
  joinedAt: string;
}

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

const STATUS_TONE: Record<string, "settled" | "warning" | "error" | "neutral"> = {
  ACTIVE: "settled",
  UNDER_REVIEW: "warning",
  SUSPENDED: "warning",
  BANNED: "error",
};

export default function AdminTaskersPage() {
  const [taskers, setTaskers] = useState<TaskerRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    const res = await fetch(`/api/admin/taskers?${params}`);
    if (!res.ok) {
      setError("Could not load taskers.");
      return;
    }
    setTaskers(await res.json());
  }, [search, status]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <ErrorState description={error} />;

  return (
    <div className="flex flex-col gap-space-md">
      <div className="flex items-center justify-between">
        <h1 className="font-headline-md text-headline-md text-on-surface">Taskers</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-space-sm">
        <Input placeholder="Search name, username, email..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-48">
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="BANNED">Banned</option>
        </Select>
      </div>

      {taskers === null && <LoadingState label="Loading taskers..." />}
      {taskers && taskers.length === 0 && <EmptyState title="No taskers match these filters" />}

      {taskers && taskers.length > 0 && (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell header>Tasker</TableCell>
              <TableCell header>Tier</TableCell>
              <TableCell header>Verified Tasks</TableCell>
              <TableCell header>Available Balance</TableCell>
              <TableCell header>Status</TableCell>
              <TableCell header>Joined</TableCell>
              <TableCell header>Actions</TableCell>
            </TableRow>
          </TableHead>
          <tbody>
            {taskers.map((t) => (
              <TableRow key={t.id} striped>
                <TableCell>
                  <p className="text-on-surface font-body-md">{t.fullName}</p>
                  <p className="text-on-surface-variant text-body-sm">@{t.username} · {t.email}</p>
                </TableCell>
                <TableCell>Tier {t.tier}</TableCell>
                <TableCell>{t.verifiedTaskCount}</TableCell>
                <TableCell>{naira(t.availableBalanceKobo)}</TableCell>
                <TableCell>
                  <Badge tone={STATUS_TONE[t.accountStatus] ?? "neutral"}>{t.accountStatus.replace(/_/g, " ")}</Badge>
                </TableCell>
                <TableCell>{new Date(t.joinedAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Link href={`/admin/taskers/${t.id}`}>
                    <Button size="sm" variant="outline">View</Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
