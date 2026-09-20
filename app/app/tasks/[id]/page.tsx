"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { useToast } from "@/components/feedback/Toast";

interface TaskDetail {
  id: string;
  title: string;
  category: string;
  platform: string | null;
  description: string;
  instructions: string;
  targetUrl: string | null;
  taskerRewardKobo: number;
  requiredCompletions: number;
  verifiedCompletions: number;
  remainingCompletions: number;
  status: string;
  claimable: boolean;
  reservationMinutes: number;
}

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

export default function TaskDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    fetch(`/api/tasks/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(setTask)
      .catch(() => setError("Could not load this task."));
  }, [id]);

  async function handleStart() {
    setStarting(true);
    try {
      const res = await fetch(`/api/tasks/${id}/start`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        toast.push("error", body.error ?? "Could not start task.");
        return;
      }
      router.push(`/app/reservations/${body.id}`);
    } finally {
      setStarting(false);
    }
  }

  if (error) return <ErrorState description={error} />;
  if (!task) return <LoadingState label="Loading task..." />;

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-space-md">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-headline-md text-headline-md text-on-surface">{task.title}</h1>
          <p className="text-body-sm font-body-sm text-on-surface-variant">{task.platform ?? task.category}</p>
        </div>
        <Badge tone="settled">{naira(task.taskerRewardKobo)} / task</Badge>
      </div>

      <Card className="p-space-md flex flex-col gap-space-sm">
        <div className="flex justify-between text-body-sm font-body-sm text-on-surface-variant">
          <span>{task.remainingCompletions} slots available</span>
          <span>{task.reservationMinutes}-minute reservation</span>
        </div>
        <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
          <div
            className="h-full bg-tertiary-fixed-dim"
            style={{ width: `${(task.verifiedCompletions / task.requiredCompletions) * 100}%` }}
          />
        </div>
      </Card>

      <Card className="p-space-md">
        <h2 className="font-title-sm text-title-sm text-on-surface mb-space-sm">Instructions</h2>
        <p className="text-body-md font-body-md text-on-surface-variant whitespace-pre-line">{task.instructions}</p>
        {task.targetUrl && (
          <a href={task.targetUrl} target="_blank" rel="noreferrer" className="text-secondary text-body-sm font-body-sm mt-space-sm inline-block">
            Open target →
          </a>
        )}
      </Card>

      {!task.claimable && (
        <Badge tone="warning">
          {task.status === "PAUSED"
            ? "This task is paused"
            : task.remainingCompletions <= 0
            ? "No slots remaining"
            : "You don't currently meet the requirements for this task"}
        </Badge>
      )}

      <Button size="md" disabled={!task.claimable || starting} onClick={handleStart}>
        {starting ? "Starting..." : "Start Task"}
      </Button>
    </div>
  );
}
