"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { useToast } from "@/components/feedback/Toast";

interface WithdrawalDetail {
  id: string; amountKobo: number; status: string; requestedAt: string; processingAt: string | null; paidAt: string | null; failedAt: string | null;
  tasker: { fullName: string; wallet: { availableBalanceKobo: number } | null };
  eligibility: { eligible: boolean; spendableKobo: number; verifiedTaskCount: number; loginDayCount: number; meetsBalance: boolean; meetsTaskCount: boolean; meetsLoginDays: boolean };
}

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

const TIMELINE = ["REQUESTED", "PROCESSING", "PAID"];

export default function AdminWithdrawalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [w, setW] = useState<WithdrawalDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [payRef, setPayRef] = useState("");
  const [failReason, setFailReason] = useState("");
  const [payModal, setPayModal] = useState(false);
  const [failModal, setFailModal] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/withdrawals/${id}`);
    if (!res.ok) {
      setError("Could not load this withdrawal.");
      return;
    }
    setW(await res.json());
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function process() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/withdrawals/${id}/processing`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        toast.push("error", body.error ?? "Could not process.");
        return;
      }
      toast.push("settled", "Marked as processing.");
      load();
    } finally {
      setBusy(false);
    }
  }

  async function markPaid() {
    if (!payRef.trim()) {
      toast.push("warning", "A payment reference is required.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/withdrawals/${id}/paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paystackRef: payRef }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.push("error", body.error ?? "Could not mark as paid.");
        return;
      }
      toast.push("settled", "Marked as paid.");
      setPayModal(false);
      load();
    } finally {
      setBusy(false);
    }
  }

  async function markFailed() {
    if (!failReason.trim()) {
      toast.push("warning", "A failure reason is required.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/withdrawals/${id}/failed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ failureReason: failReason }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.push("error", body.error ?? "Could not mark as failed.");
        return;
      }
      toast.push("settled", "Marked as failed — funds released back to the tasker.");
      setFailModal(false);
      load();
    } finally {
      setBusy(false);
    }
  }

  if (error) return <ErrorState description={error} />;
  if (!w) return <LoadingState label="Loading withdrawal..." />;

  const checklist: [string, boolean][] = [
    ["Minimum withdrawal", w.eligibility.spendableKobo >= 500000],
    ["500 verified tasks", w.eligibility.meetsTaskCount],
    ["10 active login days", w.eligibility.meetsLoginDays],
    ["Sufficient available balance", w.eligibility.meetsBalance],
  ];

  return (
    <div className="max-w-2xl flex flex-col gap-space-lg">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-headline-md text-headline-md text-on-surface">{w.tasker.fullName}</h1>
          <p className="text-body-sm font-body-sm text-on-surface-variant">Requested {new Date(w.requestedAt).toLocaleString()}</p>
        </div>
        <p className="font-headline-sm text-headline-sm text-on-surface">{naira(w.amountKobo)}</p>
      </div>

      <Card className="p-space-md">
        <p className="font-title-sm text-title-sm text-on-surface mb-space-sm">Status Timeline</p>
        <div className="flex items-center gap-space-xs">
          {(w.status === "FAILED" ? ["REQUESTED", "PROCESSING", "FAILED"] : TIMELINE).map((step, i, arr) => (
            <div key={step} className="flex items-center gap-space-xs flex-1">
              <Badge tone={step === w.status ? (step === "FAILED" ? "error" : "settled") : "neutral"}>{step}</Badge>
              {i < arr.length - 1 && <div className="flex-1 h-px bg-outline-variant" />}
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-space-md">
        <p className="font-title-sm text-title-sm text-on-surface mb-space-sm">Eligibility Checklist</p>
        <ul className="flex flex-col gap-1 text-body-sm font-body-sm">
          {checklist.map(([label, pass]) => (
            <li key={label} className={pass ? "text-status-settled-fg" : "text-status-error-fg"}>
              {pass ? "✓" : "✗"} {label}
            </li>
          ))}
        </ul>
        <dl className="text-body-sm font-body-sm text-on-surface-variant flex flex-col gap-1 mt-space-sm">
          <div className="flex justify-between"><dt>Available balance</dt><dd className="text-on-surface">{naira(w.tasker.wallet?.availableBalanceKobo ?? 0)}</dd></div>
          <div className="flex justify-between"><dt>Verified tasks</dt><dd className="text-on-surface">{w.eligibility.verifiedTaskCount}/500</dd></div>
          <div className="flex justify-between"><dt>Active login days</dt><dd className="text-on-surface">{w.eligibility.loginDayCount}/10</dd></div>
        </dl>
      </Card>

      {w.status !== "PAID" && w.status !== "FAILED" && (
        <div className="flex gap-space-sm flex-wrap">
          {w.status === "REQUESTED" && <Button onClick={process} disabled={busy}>Mark as Processing</Button>}
          {w.status === "PROCESSING" && <Button onClick={() => setPayModal(true)} disabled={busy}>Mark as Paid</Button>}
          <Button variant="outline" className="!text-status-error-fg" onClick={() => setFailModal(true)} disabled={busy}>
            Mark as Failed
          </Button>
        </div>
      )}

      <Modal open={payModal} onClose={() => setPayModal(false)} title="Mark as Paid">
        <div className="flex flex-col gap-space-sm">
          <Input placeholder="Paystack payment reference" value={payRef} onChange={(e) => setPayRef(e.target.value)} />
          <Button onClick={markPaid} disabled={busy}>Confirm Paid</Button>
        </div>
      </Modal>
      <Modal open={failModal} onClose={() => setFailModal(false)} title="Mark as Failed">
        <div className="flex flex-col gap-space-sm">
          <Input placeholder="Failure reason (required)" value={failReason} onChange={(e) => setFailReason(e.target.value)} />
          <Button onClick={markFailed} disabled={busy}>Confirm Failed</Button>
        </div>
      </Modal>
    </div>
  );
}
