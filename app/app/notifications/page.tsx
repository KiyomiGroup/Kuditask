"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";

interface Notification { id: string; title: string; body: string; read: boolean; createdAt: string }

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/tasker/notifications")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setItems)
      .catch(() => setError("Could not load notifications."));
  }

  useEffect(load, []);

  async function markAllRead() {
    await fetch("/api/tasker/notifications", { method: "PATCH", body: JSON.stringify({}) });
    load();
  }

  if (error) return <ErrorState description={error} />;
  if (!items) return <LoadingState label="Loading notifications..." />;

  return (
    <div className="max-w-xl flex flex-col gap-space-md">
      <div className="flex items-center justify-between">
        <h1 className="font-headline-md text-headline-md text-on-surface">Notifications</h1>
        {items.some((n) => !n.read) && (
          <Button size="sm" variant="outline" onClick={markAllRead}>Mark all read</Button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState title="No notifications yet" />
      ) : (
        <div className="flex flex-col gap-space-sm">
          {items.map((n) => (
            <Card key={n.id} className={`p-space-sm ${!n.read ? "border-secondary" : ""}`}>
              <p className="text-body-md font-body-md text-on-surface">{n.title}</p>
              <p className="text-body-sm font-body-sm text-on-surface-variant">{n.body}</p>
              <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">
                {new Date(n.createdAt).toLocaleString()}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
