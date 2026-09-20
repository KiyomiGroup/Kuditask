"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/feedback/Toast";

interface TaskDetail {
  id: string; title: string; category: string; platform: string | null; targetUrl: string | null;
  instructions: string; taskerRewardKobo: number; clientPriceKobo: number; requiredCompletions: number;
  verifiedCompletions: number; remainingCompletions: number; percentComplete: number; status: string;
  assignmentScope: string; client: { contactName: string; companyName: string | null };
  economics: { estimatedCostKobo: number; marginKobo: number; isViable: boolean };
  submissions: { id: string; status: string; submittedAt: string; tasker: { fullName: string } }[];
}

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

export default function AdminTaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/tasks/${id}`);
    if (!res.ok) {
      setError("Could not load this task.");
      return;
    }
    setTask(await res.json());
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function runAction(action: "pause" | "resume" | "close") {
    const res = await fetch(`/api/admin/tasks/${id}/${action}`, { method: "POST" });
    const body = await res.json();
    if (!res.ok) {
      toast.push("error", body.error ?? "Action failed.");
      return;
    }
    toast.push("settled", `Task ${action === "close" ? "closed" : action + "d"}.`);
    setConfirmClose(false);
    load();
  }

  if (error) return <ErrorState description={error} />;
  if (!task) return <LoadingState label="Loading task..." />;

  return (
    <div className="max-w-3xl flex flex-col gap-space-lg">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-headline-md text-headline-md text-on-surface">{task.title}</h1>
          <p className="text-body-sm font-body-sm text-on-surface-variant">
            {task.client.companyName ?? task.client.contactName} · {task.platform ?? task.category}
          </p>
        </div>
        <Badge tone={task.status === "COMPLETED" ? "settled" : task.status === "PAUSED" ? "neutral" : "info"}>
          {task.status.replace(/_/g, " ")}
        </Badge>
      </div>

      <div className="flex gap-space-sm">
        {(task.status === "ACTIVE" || task.status === "IN_PROGRESS") && (
          <Button variant="outline" onClick={() => runAction("pause")}>Pause</Button>
        )}
        {task.status === "PAUSED" && <Button variant="outline" onClick={() => runAction("resume")}>Resume</Button>}
        {task.status !== "COMPLETED" && (
          <Button variant="outline" className="!text-status-error-fg" onClick={() => setConfirmClose(true)}>Close</Button>
        )}
      </div>

      <Card className="p-space-md flex flex-col gap-space-sm">
        <p className="font-title-sm text-title-sm text-on-surface">Progress</p>
        <ProgressBar value={task.verifiedCompletions} max={task.requiredCompletions} />
        <div className="flex justify-between text-body-sm font-body-sm text-on-surface-variant">
          <span>{task.verifiedCompletions}/{task.requiredCompletions} verified</span>
          <span>{task.remainingCompletions} remaining · {(task.percentComplete * 100).toFixed(0)}%</span>
        </div>
      </Card>

      <Card className="p-space-md">
        <p className="font-title-sm text-title-sm text-on-surface mb-space-sm">Economics</p>
        <dl className="text-body-sm font-body-sm text-on-surface-variant flex flex-col gap-1">
          <div className="flex justify-between"><dt>Client Price</dt><dd className="text-on-surface">{naira(task.clientPriceKobo)}</dd></div>
          <div className="flex justify-between"><dt>Tasker Reward</dt><dd className="text-on-surface">{naira(task.taskerRewardKobo)}</dd></div>
          <div className="flex justify-between"><dt>Estimated Tasker Cost</dt><dd className="text-on-surface">{naira(task.economics.estimatedCostKobo)}</dd></div>
          <div className="flex justify-between">
            <dt>Platform Margin</dt>
            <dd className={task.economics.isViable ? "text-status-settled-fg" : "text-status-error-fg"}>{naira(task.economics.marginKobo)}</dd>
          </div>
        </dl>
      </Card>

      <Card className="p-space-md">
        <p className="font-title-sm text-title-sm text-on-surface mb-space-sm">Assignment</p>
        <Badge tone="neutral">{task.assignmentScope.replace(/_/g, " ")}</Badge>
      </Card>

      <Card className="p-space-md">
        <p className="font-title-sm text-title-sm text-on-surface mb-space-sm">Instructions</p>
        <p className="text-body-sm font-body-sm text-on-surface-variant whitespace-pre-line">{task.instructions}</p>
      </Card>

      <div>
        <p className="font-title-sm text-title-sm text-on-surface mb-space-sm">Submissions</p>
        {task.submissions.length === 0 ? (
          <EmptyState title="No submissions yet" />
        ) : (
          <div className="flex flex-col gap-space-sm">
            {task.submissions.map((s) => (
              <Card key={s.id} className="p-space-sm flex items-center justify-between">
                <span className="text-body-md font-body-md text-on-surface">{s.tasker.fullName}</span>
                <div className="flex items-center gap-space-sm">
                  <Badge tone={s.status === "APPROVED" ? "settled" : s.status === "PENDING" ? "warning" : "error"}>
                    {s.status.replace(/_/g, " ")}
                  </Badge>
                  {s.status === "PENDING" && (
                    <Link href={`/admin/verification/${s.id}`}>
                      <Button size="sm" variant="outline">Review</Button>
                    </Link>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        onConfirm={() => runAction("close")}
        title="Close this task?"
        description="No new reservations can be made once a task is closed. This cannot be undone."
        danger
        confirmLabel="Close Task"
      />
    </div>
  );
}
