"use client";
import { useEffect, useState, useCallback } from "react";
import { Table, TableHead, TableRow, TableCell } from "@/components/ui/Table";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";

interface TxRow {
  id: string; createdAt: string; type: string; taskerName: string; amountKobo: number;
  description: string | null; reference: string | null;
}

function naira(kobo: number) {
  const sign = kobo < 0 ? "-" : "+";
  return `${sign}₦${Math.abs(kobo / 100).toLocaleString()}`;
}

export default function AdminTransactionsPage() {
  const [rows, setRows] = useState<TxRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState("");

  const load = useCallback(async () => {
    const params = type ? `?type=${type}` : "";
    const res = await fetch(`/api/admin/transactions${params}`);
    if (!res.ok) {
      setError("Could not load transactions.");
      return;
    }
    setRows(await res.json());
  }, [type]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <ErrorState description={error} />;

  return (
    <div className="flex flex-col gap-space-md">
      <h1 className="font-headline-md text-headline-md text-on-surface">Transactions</h1>
      <Select value={type} onChange={(e) => setType(e.target.value)} className="sm:w-56">
        <option value="">All types</option>
        <option value="TASK_REWARD">Task Rewards</option>
        <option value="DEDUCTION">Deductions</option>
        <option value="WITHDRAWAL">Withdrawals</option>
        <option value="ADJUSTMENT">Adjustments</option>
        <option value="CLIENT_PAYMENT">Client Payments</option>
      </Select>

      {rows === null && <LoadingState label="Loading transactions..." />}
      {rows && rows.length === 0 && <EmptyState title="No transactions match these filters" />}

      {rows && rows.length > 0 && (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell header>Date</TableCell>
              <TableCell header>Type</TableCell>
              <TableCell header>Tasker</TableCell>
              <TableCell header>Amount</TableCell>
              <TableCell header>Description</TableCell>
              <TableCell header>Reference</TableCell>
            </TableRow>
          </TableHead>
          <tbody>
            {rows.map((tx) => (
              <TableRow key={tx.id} striped>
                <TableCell>{new Date(tx.createdAt).toLocaleString()}</TableCell>
                <TableCell><Badge tone="neutral">{tx.type.replace(/_/g, " ")}</Badge></TableCell>
                <TableCell>{tx.taskerName}</TableCell>
                <TableCell className={tx.amountKobo >= 0 ? "text-status-settled-fg" : "text-status-error-fg"}>{naira(tx.amountKobo)}</TableCell>
                <TableCell>{tx.description ?? "—"}</TableCell>
                <TableCell>{tx.reference ?? "—"}</TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
