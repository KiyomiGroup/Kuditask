"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";

interface QueueItem {
  id: string; submittedAt: string; submittedHandle: string | null;
  task: { title: string; taskerRewardKobo: number };
  tasker: { fullName: string };
}

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

export default function VerificationQueuePage() {
  const [items, setItems] = useState<QueueItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/submissions")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setItems)
      .catch(() => setError("Could not load the verification queue."));
  }, []);

  if (error) return <ErrorState description={error} />;
  if (!items) return <LoadingState label="Loading verification queue..." />;

  return (
    <div className="flex flex-col gap-space-md">
      <h1 className="font-headline-md text-headline-md text-on-surface">Verification</h1>
      {items.length === 0 ? (
        <EmptyState title="Nothing pending review" description="New submissions will appear here." />
      ) : (
        <div className="flex flex-col gap-space-sm">
          {items.map((s) => (
            <Card key={s.id} className="p-space-md flex items-center justify-between">
              <div>
                <p className="text-body-md font-body-md text-on-surface">{s.task.title}</p>
                <p className="text-body-sm font-body-sm text-on-surface-variant">
                  {s.tasker.fullName} · {naira(s.task.taskerRewardKobo)} · {new Date(s.submittedAt).toLocaleString()}
                </p>
              </div>
              <Link href={`/admin/verification/${s.id}`}>
                <Button size="sm">Review</Button>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
