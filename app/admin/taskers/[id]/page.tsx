"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/feedback/Toast";

interface Profile {
  personal: { fullName: string; username: string; email: string; phone: string | null; accountStatus: string; joinedAt: string };
  socialAccounts: { id: string; platform: string; handle: string }[];
  performance: {
    currentTier: number; verifiedTasks: number; rejectedTasks: number; fraudViolations: number;
    tierLocked: boolean; lifetimeEarningsKobo: number; availableBalanceKobo: number; pendingEarningsKobo: number;
  };
  recentSubmissions: { id: string; task: { title: string }; status: string; submittedAt: string }[];
  walletActivity: { id: string; type: string; amountKobo: number; description: string | null; createdAt: string }[];
}

function naira(kobo: number) {
  const sign = kobo < 0 ? "-" : "";
  return `${sign}₦${Math.abs(kobo / 100).toLocaleString()}`;
}

export default function AdminTaskerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<"suspend" | "ban" | "restore" | "under_review" | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/taskers/${id}`);
    if (!res.ok) {
      setError("Could not load this tasker.");
      return;
    }
    setProfile(await res.json());
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function runAction(action: string) {
    const res = await fetch(`/api/admin/taskers/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const body = await res.json();
    if (!res.ok) {
      toast.push("error", body.error ?? "Action failed.");
      return;
    }
    toast.push("settled", "Account status updated.");
    setConfirmAction(null);
    load();
  }

  if (error) return <ErrorState description={error} />;
  if (!profile) return <LoadingState label="Loading tasker profile..." />;

  const p = profile.personal;

  return (
    <div className="flex flex-col gap-space-lg max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline-md text-headline-md text-on-surface">{p.fullName}</h1>
          <p className="text-body-sm font-body-sm text-on-surface-variant">@{p.username} · {p.email}</p>
        </div>
        <Badge tone={p.accountStatus === "ACTIVE" ? "settled" : p.accountStatus === "BANNED" ? "error" : "warning"}>
          {p.accountStatus.replace(/_/g, " ")}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md">
        <Card className="p-space-md">
          <p className="font-title-sm text-title-sm text-on-surface mb-space-sm">Personal Information</p>
          <dl className="text-body-sm font-body-sm text-on-surface-variant flex flex-col gap-1">
            <div className="flex justify-between"><dt>Phone</dt><dd className="text-on-surface">{p.phone ?? "—"}</dd></div>
            <div className="flex justify-between"><dt>Joined</dt><dd className="text-on-surface">{new Date(p.joinedAt).toLocaleDateString()}</dd></div>
          </dl>
        </Card>

        <Card className="p-space-md">
          <p className="font-title-sm text-title-sm text-on-surface mb-space-sm">Social Accounts</p>
          {profile.socialAccounts.length === 0 ? (
            <p className="text-body-sm font-body-sm text-on-surface-variant">None added.</p>
          ) : (
            <div className="flex flex-wrap gap-space-sm">
              {profile.socialAccounts.map((a) => (
                <Badge key={a.id} tone="neutral">{a.platform}: {a.handle}</Badge>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-space-md lg:col-span-2">
          <p className="font-title-sm text-title-sm text-on-surface mb-space-sm">Performance</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-space-sm text-center">
            {[
              ["Tier", profile.performance.currentTier],
              ["Verified", profile.performance.verifiedTasks],
              ["Rejected", profile.performance.rejectedTasks],
              ["Fraud", profile.performance.fraudViolations],
              ["Lifetime", naira(profile.performance.lifetimeEarningsKobo)],
              ["Available", naira(profile.performance.availableBalanceKobo)],
            ].map(([label, value]) => (
              <div key={label as string}>
                <p className="text-label-sm font-label-sm text-on-surface-variant">{label}</p>
                <p className="font-title-sm text-title-sm text-on-surface">{value}</p>
              </div>
            ))}
          </div>
          {profile.performance.tierLocked && (
            <p className="text-body-sm font-body-sm text-status-error-fg mt-space-sm">
              Tier progression is locked pending fraud appeal.
            </p>
          )}
        </Card>
      </div>

      <div>
        <p className="font-title-sm text-title-sm text-on-surface mb-space-sm">Recent Task Activity</p>
        {profile.recentSubmissions.length === 0 ? (
          <EmptyState title="No submissions yet" />
        ) : (
          <div className="flex flex-col gap-space-sm">
            {profile.recentSubmissions.map((s) => (
              <Card key={s.id} className="p-space-sm flex items-center justify-between">
                <span className="text-body-md font-body-md text-on-surface">{s.task.title}</span>
                <span className="text-body-sm font-body-sm text-on-surface-variant">
                  {s.status.replace(/_/g, " ")} · {new Date(s.submittedAt).toLocaleDateString()}
                </span>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="font-title-sm text-title-sm text-on-surface mb-space-sm">Wallet Activity</p>
        {profile.walletActivity.length === 0 ? (
          <EmptyState title="No wallet activity yet" />
        ) : (
          <div className="flex flex-col gap-space-sm">
            {profile.walletActivity.map((tx) => (
              <Card key={tx.id} className="p-space-sm flex items-center justify-between">
                <span className="text-body-md font-body-md text-on-surface">{tx.type.replace(/_/g, " ")}</span>
                <span className={`font-label-md text-label-md ${tx.amountKobo >= 0 ? "text-status-settled-fg" : "text-status-error-fg"}`}>
                  {naira(tx.amountKobo)}
                </span>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="font-title-sm text-title-sm text-on-surface mb-space-sm">Account Controls</p>
        <div className="flex gap-space-sm flex-wrap">
          <Button variant="outline" onClick={() => setConfirmAction("under_review")}>Put Under Review</Button>
          <Button variant="outline" className="!text-status-warning-fg" onClick={() => setConfirmAction("suspend")}>Suspend</Button>
          <Button variant="outline" className="!text-status-error-fg" onClick={() => setConfirmAction("ban")}>Ban</Button>
          <Button variant="outline" className="!text-status-settled-fg" onClick={() => setConfirmAction("restore")}>Restore</Button>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => confirmAction && runAction(confirmAction)}
        title={`Confirm: ${confirmAction?.replace("_", " ")}`}
        description="This action is audited and will notify the tasker."
        danger={confirmAction === "ban" || confirmAction === "suspend"}
        confirmLabel="Confirm"
      />
    </div>
  );
}
