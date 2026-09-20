"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Alert } from "@/components/feedback/Alert";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { useToast } from "@/components/feedback/Toast";

const REASONS = [
  ["FAKE_SCREENSHOT", "Fake screenshot"],
  ["EDITED_SCREENSHOT", "Edited screenshot"],
  ["WRONG_ACCOUNT", "Wrong account"],
  ["TASK_NOT_COMPLETED", "Task not completed"],
  ["DUPLICATE_PROOF", "Duplicate proof"],
  ["UNCLEAR_PROOF", "Unclear proof"],
  ["OTHER", "Other"],
];

interface SubmissionDetail {
  id: string; status: string; submittedAt: string; submittedHandle: string | null; screenshotSignedUrl: string | null;
  task: { title: string; taskerRewardKobo: number; instructions: string };
  tasker: { fullName: string; username: string; socialAccounts: { platform: string; handle: string }[] };
  fraudHistory: { id: string; stage: string; createdAt: string }[];
}

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

export default function VerificationReviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("FAKE_SCREENSHOT");
  const [confirmMode, setConfirmMode] = useState<"reject" | "fraud" | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/submissions/${id}`);
    if (!res.ok) {
      setError("Could not load this submission.");
      return;
    }
    setSubmission(await res.json());
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function approve() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/submissions/${id}/approve`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        toast.push("error", body.error ?? "Could not approve.");
        return;
      }
      toast.push("settled", "Proof approved — reward credited.");
      router.push("/admin/verification");
    } finally {
      setBusy(false);
    }
  }

  async function rejectOrFlag(mode: "reject" | "fraud") {
    setBusy(true);
    try {
      const endpoint = mode === "reject" ? "reject" : "flag-fraud";
      const res = await fetch(`/api/admin/submissions/${id}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.push("error", body.error ?? "Action failed.");
        return;
      }
      toast.push("settled", mode === "reject" ? "Proof rejected." : "Fraud violation flagged.");
      setConfirmMode(null);
      router.push("/admin/verification");
    } finally {
      setBusy(false);
    }
  }

  if (error) return <ErrorState description={error} />;
  if (!submission) return <LoadingState label="Loading submission..." />;

  return (
    <div className="max-w-3xl flex flex-col gap-space-lg">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-headline-md text-headline-md text-on-surface">{submission.task.title}</h1>
          <p className="text-body-sm font-body-sm text-on-surface-variant">
            {submission.tasker.fullName} (@{submission.tasker.username}) · {naira(submission.task.taskerRewardKobo)}
          </p>
        </div>
        <Badge tone={submission.status === "PENDING" ? "warning" : "neutral"}>{submission.status.replace(/_/g, " ")}</Badge>
      </div>

      <Card className="p-space-md">
        <p className="font-title-sm text-title-sm text-on-surface mb-space-sm">Screenshot Proof</p>
        {submission.screenshotSignedUrl ? (
          <img src={submission.screenshotSignedUrl} alt="Submitted proof" className="w-full rounded-md border border-outline-variant" />
        ) : (
          <Alert tone="warning">Screenshot preview unavailable — Supabase Storage is not configured in this environment.</Alert>
        )}
      </Card>

      <Card className="p-space-md">
        <p className="font-title-sm text-title-sm text-on-surface mb-space-sm">Submission Details</p>
        <dl className="text-body-sm font-body-sm text-on-surface-variant flex flex-col gap-1">
          <div className="flex justify-between"><dt>Account used</dt><dd className="text-on-surface">{submission.submittedHandle ?? "Not specified"}</dd></div>
          <div className="flex justify-between"><dt>Submitted</dt><dd className="text-on-surface">{new Date(submission.submittedAt).toLocaleString()}</dd></div>
        </dl>
        {submission.tasker.socialAccounts.length > 0 && (
          <div className="flex flex-wrap gap-space-sm mt-space-sm">
            {submission.tasker.socialAccounts.map((a, i) => (
              <Badge key={i} tone="neutral">{a.platform}: {a.handle}</Badge>
            ))}
          </div>
        )}
      </Card>

      {submission.fraudHistory.length > 0 && (
        <Alert tone="error">
          This tasker has {submission.fraudHistory.length} prior fraud violation
          {submission.fraudHistory.length > 1 ? "s" : ""} (most recent: {submission.fraudHistory[0]?.stage.replace(/_/g, " ").toLowerCase()}).
        </Alert>
      )}

      {submission.status === "PENDING" && (
        <Card className="p-space-md flex flex-col gap-space-sm">
          <p className="font-title-sm text-title-sm text-on-surface">Review</p>
          <Select value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
          <p className="text-body-sm font-body-sm text-on-surface-variant">
            Reason applies only if you reject or flag fraud below.
          </p>
          <div className="flex gap-space-sm flex-wrap">
            <Button onClick={approve} disabled={busy}>Approve</Button>
            <Button variant="outline" onClick={() => setConfirmMode("reject")} disabled={busy}>Reject Proof</Button>
            <Button variant="outline" className="!text-status-error-fg" onClick={() => setConfirmMode("fraud")} disabled={busy}>
              Flag as Fraud Violation
            </Button>
          </div>
        </Card>
      )}

      <ConfirmDialog
        open={!!confirmMode}
        onClose={() => setConfirmMode(null)}
        onConfirm={() => confirmMode && rejectOrFlag(confirmMode)}
        title={confirmMode === "fraud" ? "Flag as Fraud Violation?" : "Reject Proof?"}
        description={
          confirmMode === "fraud"
            ? "This is a separate, more serious action than a normal rejection — it starts the fraud-strike progression for this tasker."
            : "The reward will not be paid. This is a normal rejection and will NOT create a fraud violation."
        }
        danger={confirmMode === "fraud"}
        confirmLabel={confirmMode === "fraud" ? "Flag Fraud" : "Reject"}
      />
    </div>
  );
}
