"use client";
import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/feedback/Toast";

interface SocialAccount { id: string; platform: string; handle: string }

export default function ProfilePage() {
  const toast = useToast();
  const [accounts, setAccounts] = useState<SocialAccount[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [platform, setPlatform] = useState("INSTAGRAM");
  const [handle, setHandle] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/social-accounts");
    if (!res.ok) {
      setError("Could not load your profile.");
      return;
    }
    setAccounts(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!handle.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/social-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, handle }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.push("error", body.error ?? body.errors?.handle ?? "Could not add account.");
        return;
      }
      setHandle("");
      load();
    } finally {
      setAdding(false);
    }
  }

  async function removeAccount(id: string) {
    const res = await fetch(`/api/social-accounts/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.push("error", "Could not remove account.");
      return;
    }
    load();
  }

  if (error) return <ErrorState description={error} />;

  return (
    <div className="max-w-xl flex flex-col gap-space-lg">
      <h1 className="font-headline-md text-headline-md text-on-surface">Profile</h1>

      <Card className="p-space-md">
        <p className="font-title-sm text-title-sm text-on-surface mb-space-sm">Social Accounts</p>
        <p className="text-body-sm font-body-sm text-on-surface-variant mb-space-sm">
          You can add multiple accounts, including more than one per platform.
        </p>

        {accounts === null && <LoadingState label="Loading accounts..." />}
        {accounts && accounts.length === 0 && <EmptyState title="No social accounts added yet" />}

        <div className="flex flex-col gap-space-sm mb-space-md">
          {accounts?.map((a) => (
            <div key={a.id} className="flex items-center justify-between">
              <Badge tone="neutral">{a.platform}: {a.handle}</Badge>
              <Button size="sm" variant="outline" onClick={() => removeAccount(a.id)}>Remove</Button>
            </div>
          ))}
        </div>

        <form onSubmit={addAccount} className="flex gap-space-sm">
          <Select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-40">
            <option value="INSTAGRAM">Instagram</option>
            <option value="FACEBOOK">Facebook</option>
            <option value="TIKTOK">TikTok</option>
            <option value="X">X</option>
            <option value="YOUTUBE">YouTube</option>
            <option value="OTHER">Other</option>
          </Select>
          <Input placeholder="Handle / username" value={handle} onChange={(e) => setHandle(e.target.value)} className="flex-1" />
          <Button type="submit" disabled={adding}>Add</Button>
        </form>
      </Card>

      <LogoutButton className="text-body-md font-body-md text-status-error-fg text-left" />
    </div>
  );
}
