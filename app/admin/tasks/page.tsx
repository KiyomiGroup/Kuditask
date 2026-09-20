"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/feedback/Toast";

interface TaskRow {
  id: string; title: string; category: string; platform: string | null; client: { contactName: string; companyName: string | null };
  taskerRewardKobo: number; clientPriceKobo: number; requiredCompletions: number; verifiedCompletions: number;
  remainingCompletions: number; status: string;
}

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

const STATUS_TONE: Record<string, "settled" | "warning" | "error" | "neutral" | "info"> = {
  ACTIVE: "settled", IN_PROGRESS: "info", PENDING_VERIFICATION: "warning", COMPLETED: "settled", REJECTED: "error", PAUSED: "neutral",
};

export default function AdminTasksPage() {
  const toast = useToast();
  const [tasks, setTasks] = useState<TaskRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    const params = status ? `?status=${status}` : "";
    const res = await fetch(`/api/admin/tasks${params}`);
    if (!res.ok) {
      setError("Could not load tasks.");
      return;
    }
    setTasks(await res.json());
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  async function quickAction(id: string, action: "pause" | "resume") {
    const res = await fetch(`/api/admin/tasks/${id}/${action}`, { method: "POST" });
    const body = await res.json();
    if (!res.ok) {
      toast.push("error", body.error ?? "Action failed.");
      return;
    }
    toast.push("settled", `Task ${action}d.`);
    load();
  }

  if (error) return <ErrorState description={error} />;

  return (
    <div className="flex flex-col gap-space-md">
      <div className="flex items-center justify-between">
        <h1 className="font-headline-md text-headline-md text-on-surface">Tasks</h1>
        <Link href="/admin/tasks/new">
          <Button size="md">Create Task</Button>
        </Link>
      </div>

      <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-56">
        <option value="">All statuses</option>
        <option value="ACTIVE">Active</option>
        <option value="IN_PROGRESS">In Progress</option>
        <option value="PAUSED">Paused</option>
        <option value="COMPLETED">Completed</option>
      </Select>

      {tasks === null && <LoadingState label="Loading tasks..." />}
      {tasks && tasks.length === 0 && <EmptyState title="No tasks match these filters" />}

      <div className="flex flex-col gap-space-sm">
        {tasks?.map((t) => (
          <Card key={t.id} className="p-space-md flex flex-col gap-space-sm">
            <div className="flex items-start justify-between">
              <div>
                <Link href={`/admin/tasks/${t.id}`} className="font-title-sm text-title-sm text-on-surface hover:text-secondary">
                  {t.title}
                </Link>
                <p className="text-body-sm font-body-sm text-on-surface-variant">
                  {t.client.companyName ?? t.client.contactName} · {t.platform ?? t.category}
                </p>
              </div>
              <Badge tone={STATUS_TONE[t.status] ?? "neutral"}>{t.status.replace(/_/g, " ")}</Badge>
            </div>
            <div className="flex items-center justify-between text-body-sm font-body-sm text-on-surface-variant">
              <span>Reward {naira(t.taskerRewardKobo)} · Client price {naira(t.clientPriceKobo)}</span>
              <span>{t.verifiedCompletions}/{t.requiredCompletions} · {t.remainingCompletions} remaining</span>
            </div>
            <ProgressBar value={t.verifiedCompletions} max={t.requiredCompletions} />
            <div className="flex gap-space-sm">
              <Link href={`/admin/tasks/${t.id}`}><Button size="sm" variant="outline">View</Button></Link>
              {(t.status === "ACTIVE" || t.status === "IN_PROGRESS") && (
                <Button size="sm" variant="outline" onClick={() => quickAction(t.id, "pause")}>Pause</Button>
              )}
              {t.status === "PAUSED" && (
                <Button size="sm" variant="outline" onClick={() => quickAction(t.id, "resume")}>Resume</Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
