"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/feedback/Alert";
import { LoadingState, ErrorState } from "@/components/ui/States";

interface Settings {
  taskRules: { reservationMinutes: number; claimOrder: string; autoCloseOnRequiredVerifiedCompletions: boolean };
  withdrawalRules: { minWithdrawalKobo: number; minVerifiedTasks: number; minActiveLoginDays: number; payoutSchedule: string; paymentProvider: string };
  proofAndFraudRules: { screenshotProofRequired: boolean; fraudProgression: string[] };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setSettings)
      .catch(() => setError("Could not load settings."));
  }, []);

  if (error) return <ErrorState description={error} />;
  if (!settings) return <LoadingState label="Loading settings..." />;

  return (
    <div className="max-w-2xl flex flex-col gap-space-lg">
      <h1 className="font-headline-md text-headline-md text-on-surface">Settings</h1>
      <Alert tone="info">
        These are locked platform rules, not admin-configurable in V1 — shown here for visibility only.
      </Alert>

      <Card className="p-space-md">
        <p className="font-title-sm text-title-sm text-on-surface mb-space-sm">Task Rules</p>
        <dl className="text-body-sm font-body-sm text-on-surface-variant flex flex-col gap-1">
          <div className="flex justify-between"><dt>Reservation duration</dt><dd className="text-on-surface">{settings.taskRules.reservationMinutes} minutes</dd></div>
          <div className="flex justify-between"><dt>Claim order</dt><dd className="text-on-surface capitalize">{settings.taskRules.claimOrder}</dd></div>
          <div className="flex justify-between"><dt>Auto-close on required completions</dt><dd className="text-on-surface">{settings.taskRules.autoCloseOnRequiredVerifiedCompletions ? "Yes" : "No"}</dd></div>
        </dl>
      </Card>

      <Card className="p-space-md">
        <p className="font-title-sm text-title-sm text-on-surface mb-space-sm">Withdrawal Rules</p>
        <dl className="text-body-sm font-body-sm text-on-surface-variant flex flex-col gap-1">
          <div className="flex justify-between"><dt>Minimum withdrawal</dt><dd className="text-on-surface">₦{(settings.withdrawalRules.minWithdrawalKobo / 100).toLocaleString()}</dd></div>
          <div className="flex justify-between"><dt>Required verified tasks</dt><dd className="text-on-surface">{settings.withdrawalRules.minVerifiedTasks}</dd></div>
          <div className="flex justify-between"><dt>Required active login days</dt><dd className="text-on-surface">{settings.withdrawalRules.minActiveLoginDays}</dd></div>
          <div className="flex justify-between"><dt>Payout schedule</dt><dd className="text-on-surface">{settings.withdrawalRules.payoutSchedule}</dd></div>
          <div className="flex justify-between"><dt>Payment provider</dt><dd className="text-on-surface capitalize">{settings.withdrawalRules.paymentProvider}</dd></div>
        </dl>
      </Card>

      <Card className="p-space-md">
        <p className="font-title-sm text-title-sm text-on-surface mb-space-sm">Proof & Fraud Rules</p>
        <p className="text-body-sm font-body-sm text-on-surface-variant mb-space-sm">
          Screenshot proof required: {settings.proofAndFraudRules.screenshotProofRequired ? "Yes" : "No"}
        </p>
        <ul className="list-disc list-inside text-body-sm font-body-sm text-on-surface-variant flex flex-col gap-1">
          {settings.proofAndFraudRules.fraudProgression.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </Card>

      <Card className="p-space-md border-status-error-fg/30">
        <p className="font-title-sm text-title-sm text-status-error-fg mb-space-sm">Danger Zone</p>
        <p className="text-body-sm font-body-sm text-on-surface-variant">
          No destructive platform-wide operations are implemented yet.
        </p>
      </Card>
    </div>
  );
}
