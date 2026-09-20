"use client";
import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Alert } from "@/components/feedback/Alert";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/feedback/Toast";

interface WalletSummary {
  availableBalanceKobo: number;
  spendableBalanceKobo: number;
  reservedForWithdrawalKobo: number;
  pendingEarningsKobo: number;
  lifetimeEarningsKobo: number;
  eligibility: {
    eligible: boolean;
    spendableKobo: number;
    verifiedTaskCount: number;
    loginDayCount: number;
    meetsBalance: boolean;
    meetsTaskCount: boolean;
    meetsLoginDays: boolean;
  };
  thresholds: { minWithdrawalKobo: number; minVerifiedTasks: number; minActiveLoginDays: number };
  nextWithdrawalLabel: string;
}

interface WalletTx {
  id: string;
  type: "TASK_REWARD" | "DEDUCTION" | "WITHDRAWAL" | "ADJUSTMENT" | "CLIENT_PAYMENT";
  amountKobo: number;
  description: string | null;
  createdAt: string;
}

interface WithdrawalRow {
  id: string;
  amountKobo: number;
  status: string;
  requestedAt: string;
}

function naira(kobo: number) {
  const sign = kobo < 0 ? "-" : "+";
  return `${sign}₦${Math.abs(kobo / 100).toLocaleString()}`;
}

const TX_LABEL: Record<WalletTx["type"], string> = {
  TASK_REWARD: "Task Reward",
  DEDUCTION: "Deduction",
  WITHDRAWAL: "Withdrawal",
  ADJUSTMENT: "Adjustment",
  CLIENT_PAYMENT: "Client Payment",
};

export default function WalletPage() {
  const toast = useToast();
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [transactions, setTransactions] = useState<WalletTx[] | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [requesting, setRequesting] = useState(false);

  const load = useCallback(async () => {
    const [sRes, tRes, wRes] = await Promise.all([
      fetch("/api/tasker/wallet"),
      fetch("/api/tasker/wallet/transactions"),
      fetch("/api/tasker/withdrawals"),
    ]);
    if (!sRes.ok || !tRes.ok || !wRes.ok) {
      setError("Could not load your wallet.");
      return;
    }
    setSummary(await sRes.json());
    setTransactions(await tRes.json());
    setWithdrawals(await wRes.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRequest() {
    const amountKobo = Math.round(parseFloat(amount) * 100);
    if (!amountKobo || amountKobo <= 0) {
      toast.push("warning", "Enter an amount.");
      return;
    }
    setRequesting(true);
    try {
      const res = await fetch("/api/tasker/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountKobo }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.push("error", body.error ?? "Could not request withdrawal.");
        return;
      }
      toast.push("settled", "Withdrawal requested.");
      setAmount("");
      load();
    } finally {
      setRequesting(false);
    }
  }

  if (error) return <ErrorState description={error} />;
  if (!summary || !transactions || !withdrawals) return <LoadingState label="Loading wallet..." />;

  const hasOpenWithdrawal = withdrawals.some((w) => w.status === "REQUESTED" || w.status === "PROCESSING");
  const remainingAfter = amount
    ? summary.spendableBalanceKobo - Math.round(parseFloat(amount) * 100)
    : summary.spendableBalanceKobo;

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-space-lg">
      <h1 className="font-headline-md text-headline-md text-on-surface">Wallet</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
        <Card className="p-space-md">
          <p className="text-label-md font-label-md text-on-surface-variant">Available Balance</p>
          <p className="font-currency-display text-currency-display text-on-surface">
            {naira(summary.spendableBalanceKobo).replace("+", "")}
          </p>
        </Card>
        <Card className="p-space-md">
          <p className="text-label-md font-label-md text-on-surface-variant">Pending Earnings</p>
          <p className="font-headline-sm text-headline-sm text-on-surface-variant">
            {naira(summary.pendingEarningsKobo).replace("+", "")}
          </p>
        </Card>
        <Card className="p-space-md">
          <p className="text-label-md font-label-md text-on-surface-variant">Lifetime Earnings</p>
          <p className="font-headline-sm text-headline-sm text-on-surface-variant">
            {naira(summary.lifetimeEarningsKobo).replace("+", "")}
          </p>
        </Card>
      </div>

      <Card className="p-space-md flex flex-col gap-space-md">
        <div className="flex items-center justify-between">
          <h2 className="font-title-sm text-title-sm text-on-surface">Withdrawal</h2>
          <Badge tone={summary.eligibility.eligible ? "settled" : "warning"}>
            {summary.eligibility.eligible ? "Eligible" : "Locked"}
          </Badge>
        </div>

        {!summary.eligibility.eligible && (
          <div className="flex flex-col gap-space-sm">
            <p className="text-body-sm font-body-sm text-on-surface-variant">
              Complete {summary.thresholds.minVerifiedTasks} verified tasks, {summary.thresholds.minActiveLoginDays}{" "}
              active login days, and hold at least ₦{(summary.thresholds.minWithdrawalKobo / 100).toLocaleString()}{" "}
              available to unlock withdrawals.
            </p>
            <div>
              <div className="flex justify-between text-body-sm font-body-sm text-on-surface-variant mb-1">
                <span>Verified tasks</span>
                <span>
                  {summary.eligibility.verifiedTaskCount} / {summary.thresholds.minVerifiedTasks}
                </span>
              </div>
              <ProgressBar value={summary.eligibility.verifiedTaskCount} max={summary.thresholds.minVerifiedTasks} />
            </div>
            <div>
              <div className="flex justify-between text-body-sm font-body-sm text-on-surface-variant mb-1">
                <span>Active login days</span>
                <span>
                  {summary.eligibility.loginDayCount} / {summary.thresholds.minActiveLoginDays}
                </span>
              </div>
              <ProgressBar value={summary.eligibility.loginDayCount} max={summary.thresholds.minActiveLoginDays} />
            </div>
          </div>
        )}

        {summary.eligibility.eligible && !hasOpenWithdrawal && (
          <div className="flex flex-col gap-space-sm">
            <Input
              type="number"
              placeholder={`Minimum ₦${(summary.thresholds.minWithdrawalKobo / 100).toLocaleString()}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className="text-body-sm font-body-sm text-on-surface-variant">
              Available: ₦{(summary.spendableBalanceKobo / 100).toLocaleString()} · Remaining after: ₦
              {(Math.max(0, remainingAfter) / 100).toLocaleString()}
            </p>
            <Button onClick={handleRequest} disabled={requesting}>
              {requesting ? "Requesting..." : "Request Withdrawal"}
            </Button>
          </div>
        )}

        {hasOpenWithdrawal && (
          <Alert tone="info">You already have a withdrawal request in progress.</Alert>
        )}

        <p className="text-body-sm font-body-sm text-on-surface-variant">{summary.nextWithdrawalLabel}</p>
      </Card>

      <div>
        <h2 className="font-title-sm text-title-sm text-on-surface mb-space-sm">History</h2>
        {transactions.length === 0 ? (
          <EmptyState title="No transactions yet" />
        ) : (
          <div className="flex flex-col gap-space-sm">
            {transactions.map((tx) => (
              <Card key={tx.id} className="p-space-sm flex items-center justify-between">
                <div>
                  <p className="text-body-md font-body-md text-on-surface">{TX_LABEL[tx.type]}</p>
                  <p className="text-body-sm font-body-sm text-on-surface-variant">
                    {tx.description ?? ""} · {new Date(tx.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`font-label-lg text-label-lg ${
                    tx.amountKobo >= 0 ? "text-status-settled-fg" : "text-status-error-fg"
                  }`}
                >
                  {naira(tx.amountKobo)}
                </span>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
