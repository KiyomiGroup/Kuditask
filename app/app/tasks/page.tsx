"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/States";

interface AvailableTask {
  id: string;
  title: string;
  category: string;
  platform: string | null;
  taskerRewardKobo: number;
  requiredCompletions: number;
  verifiedCompletions: number;
  remainingCompletions: number;
  status: string;
}

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

function AvailableTasksTab() {
  const [tasks, setTasks] = useState<AvailableTask[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");

  const load = useCallback(async () => {
    setError(null);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (sort) params.set("sort", sort);
    const res = await fetch(`/api/tasks?${params}`);
    if (!res.ok) {
      setError("Could not load available tasks.");
      return;
    }
    setTasks(await res.json());
  }, [search, sort]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex flex-col gap-space-md">
      <div className="flex flex-col sm:flex-row gap-space-sm">
        <Input
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <Select value={sort} onChange={(e) => setSort(e.target.value)} className="sm:w-48">
          <option value="newest">Newest</option>
          <option value="reward">Highest reward</option>
          <option value="ending_soon">Ending soon</option>
        </Select>
      </div>

      {tasks === null && !error && <LoadingState label="Loading tasks..." />}
      {error && <ErrorState description={error} action={<Button onClick={load}>Retry</Button>} />}
      {tasks && tasks.length === 0 && (
        <EmptyState
          title="No tasks available right now"
          description="New tasks are added regularly — check back soon."
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
        {tasks?.map((task) => (
          <Link key={task.id} href={`/app/tasks/${task.id}`}>
            <Card className="p-space-md flex flex-col gap-space-sm hover:border-secondary transition">
              <div className="flex items-start justify-between">
                <h3 className="font-title-sm text-title-sm text-on-surface">{task.title}</h3>
                <Badge tone="settled">{naira(task.taskerRewardKobo)} / task</Badge>
              </div>
              <p className="text-body-sm font-body-sm text-on-surface-variant">
                {task.platform ?? task.category}
              </p>
              <div className="flex items-center justify-between text-body-sm font-body-sm text-on-surface-variant">
                <span>
                  {task.verifiedCompletions} / {task.requiredCompletions} completed
                </span>
                <span>{task.remainingCompletions} remaining</span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
                <div
                  className="h-full bg-tertiary-fixed-dim"
                  style={{ width: `${(task.verifiedCompletions / task.requiredCompletions) * 100}%` }}
                />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

interface MyTasksResponse {
  inProgress: { id: string; task: { id: string; title: string; taskerRewardKobo: number }; expiresAt: string }[];
  pending: { id: string; task: { title: string; taskerRewardKobo: number }; submittedAt: string }[];
  completed: { id: string; task: { title: string; taskerRewardKobo: number }; submittedAt: string }[];
  rejected: {
    id: string;
    task: { title: string };
    submittedAt: string;
    status: string;
    review?: { rejectionReason: string | null };
  }[];
}

function MyTasksTab() {
  const [data, setData] = useState<MyTasksResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/tasker/my-tasks")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setError("Could not load your tasks."));
  }, []);

  if (error) return <ErrorState description={error} />;
  if (!data) return <LoadingState label="Loading your tasks..." />;

  const rows: { label: string; items: { title: string; sub: string; badge: React.ReactNode }[] }[] = [
    {
      label: "In Progress",
      items: data.inProgress.map((r) => ({
        title: r.task.title,
        sub: `Reservation active`,
        badge: <Badge tone="info">In progress</Badge>,
      })),
    },
    {
      label: "Pending Verification",
      items: data.pending.map((s) => ({
        title: s.task.title,
        sub: "Awaiting verification",
        badge: <Badge tone="warning">Pending</Badge>,
      })),
    },
    {
      label: "Completed",
      items: data.completed.map((s) => ({
        title: s.task.title,
        sub: `${naira(s.task.taskerRewardKobo)} earned`,
        badge: <Badge tone="settled">Verified</Badge>,
      })),
    },
    {
      label: "Rejected",
      items: data.rejected.map((s) => ({
        title: s.task.title,
        sub: s.review?.rejectionReason ? s.review.rejectionReason.replace(/_/g, " ").toLowerCase() : "",
        badge: (
          <Badge tone="error">{s.status === "FRAUD_FLAGGED" ? "Fraud flagged" : "Rejected"}</Badge>
        ),
      })),
    },
  ];

  return (
    <div className="flex flex-col gap-space-lg">
      {rows.map((section) => (
        <div key={section.label}>
          <h3 className="font-title-sm text-title-sm text-on-surface mb-space-sm">{section.label}</h3>
          {section.items.length === 0 ? (
            <p className="text-body-sm font-body-sm text-on-surface-variant">Nothing here yet.</p>
          ) : (
            <div className="flex flex-col gap-space-sm">
              {section.items.map((item, i) => (
                <Card key={i} className="p-space-sm flex items-center justify-between">
                  <div>
                    <p className="text-body-md font-body-md text-on-surface">{item.title}</p>
                    <p className="text-body-sm font-body-sm text-on-surface-variant capitalize">{item.sub}</p>
                  </div>
                  {item.badge}
                </Card>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function TasksPage() {
  return (
    <div>
      <h1 className="font-headline-md text-headline-md text-on-surface mb-space-md">Tasks</h1>
      <Tabs
        tabs={[
          { id: "available", label: "Available", content: <AvailableTasksTab /> },
          { id: "mine", label: "My Tasks", content: <MyTasksTab /> },
        ]}
      />
    </div>
  );
}
