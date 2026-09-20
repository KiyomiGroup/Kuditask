"use client";
import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/feedback/Toast";

interface Announcement { id: string; title: string; body: string; audience: string; status: string; createdAt: string }

export default function AnnouncementsPage() {
  const toast = useToast();
  const [items, setItems] = useState<Announcement[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", body: "", audience: "ALL_TASKERS" });
  const [showPreview, setShowPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/announcements");
    if (!res.ok) {
      setError("Could not load announcements.");
      return;
    }
    setItems(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveDraft(publishNow: boolean) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, publishNow }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.push("error", body.error ?? "Could not save announcement.");
        return;
      }
      toast.push("settled", publishNow ? "Announcement published." : "Draft saved.");
      setForm({ title: "", body: "", audience: "ALL_TASKERS" });
      setShowPreview(false);
      load();
    } finally {
      setSubmitting(false);
    }
  }

  async function publish(id: string) {
    const res = await fetch(`/api/admin/announcements/${id}/publish`, { method: "POST" });
    const body = await res.json();
    if (!res.ok) {
      toast.push("error", body.error ?? "Could not publish.");
      return;
    }
    toast.push("settled", "Published.");
    load();
  }

  if (error) return <ErrorState description={error} />;

  return (
    <div className="max-w-2xl flex flex-col gap-space-lg">
      <h1 className="font-headline-md text-headline-md text-on-surface">Announcements</h1>

      <Card className="p-space-md flex flex-col gap-space-sm">
        <p className="font-title-sm text-title-sm text-on-surface">New Announcement</p>
        <Input placeholder="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        <Textarea placeholder="Message" value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
        <Select value={form.audience} onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))}>
          <option value="ALL_TASKERS">All Taskers</option>
          <option value="SPECIFIC_TIER">Specific Tier</option>
          <option value="SPECIFIC_TASKERS">Specific Taskers</option>
          <option value="PLATFORM_WIDE">Platform-wide</option>
        </Select>

        {showPreview && (
          <Card className="p-space-sm bg-surface-container-low">
            <p className="font-title-sm text-title-sm text-on-surface">{form.title || "(no title)"}</p>
            <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">{form.body || "(no message)"}</p>
          </Card>
        )}

        <div className="flex gap-space-sm flex-wrap">
          <Button variant="outline" onClick={() => setShowPreview((s) => !s)}>{showPreview ? "Hide Preview" : "Preview"}</Button>
          <Button variant="outline" onClick={() => saveDraft(false)} disabled={submitting || !form.title}>Save as Draft</Button>
          <Button onClick={() => saveDraft(true)} disabled={submitting || !form.title}>Publish Now</Button>
        </div>
      </Card>

      <div>
        <p className="font-title-sm text-title-sm text-on-surface mb-space-sm">All Announcements</p>
        {items === null && <LoadingState label="Loading..." />}
        {items && items.length === 0 && <EmptyState title="No announcements yet" />}
        <div className="flex flex-col gap-space-sm">
          {items?.map((a) => (
            <Card key={a.id} className="p-space-sm flex items-center justify-between">
              <div>
                <p className="text-body-md font-body-md text-on-surface">{a.title}</p>
                <p className="text-body-sm font-body-sm text-on-surface-variant">{a.audience.replace(/_/g, " ")}</p>
              </div>
              <div className="flex items-center gap-space-sm">
                <Badge tone={a.status === "PUBLISHED" ? "settled" : a.status === "SCHEDULED" ? "info" : "neutral"}>{a.status}</Badge>
                {a.status !== "PUBLISHED" && (
                  <Button size="sm" variant="outline" onClick={() => publish(a.id)}>Publish</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
