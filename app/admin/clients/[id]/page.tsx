"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";

interface ClientProfileData {
  client: { contactName: string; companyName: string | null; email: string | null; phone: string | null; whatsapp: string | null; status: string };
  financialSummary: { totalPaidKobo: number; totalSpendKobo: number; outstandingKobo: number };
  taskHistory: { id: string; title: string; platform: string | null; requiredCompletions: number; taskerRewardKobo: number; clientPriceKobo: number; status: string; createdAt: string }[];
  requestHistory: { id: string; taskType: string; status: string; createdAt: string }[];
}

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

export default function AdminClientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ClientProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/clients/${id}`);
    if (!res.ok) {
      setError("Could not load this client.");
      return;
    }
    setData(await res.json());
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <ErrorState description={error} />;
  if (!data) return <LoadingState label="Loading client..." />;

  const c = data.client;

  return (
    <div className="max-w-3xl flex flex-col gap-space-lg">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-headline-md text-headline-md text-on-surface">{c.companyName ?? c.contactName}</h1>
          <p className="text-body-sm font-body-sm text-on-surface-variant">{c.contactName} · {c.email ?? c.whatsapp ?? c.phone ?? "No contact info"}</p>
        </div>
        <Badge tone={c.status === "ACTIVE" ? "settled" : "neutral"}>{c.status}</Badge>
      </div>

      <Card className="p-space-md">
        <p className="font-title-sm text-title-sm text-on-surface mb-space-sm">Financial Summary</p>
        <div className="grid grid-cols-3 gap-space-sm text-center">
          <div><p className="text-label-sm font-label-sm text-on-surface-variant">Total Paid</p><p className="font-title-sm text-title-sm text-on-surface">{naira(data.financialSummary.totalPaidKobo)}</p></div>
          <div><p className="text-label-sm font-label-sm text-on-surface-variant">Total Task Spend</p><p className="font-title-sm text-title-sm text-on-surface">{naira(data.financialSummary.totalSpendKobo)}</p></div>
          <div><p className="text-label-sm font-label-sm text-on-surface-variant">Outstanding</p><p className="font-title-sm text-title-sm text-on-surface">{naira(data.financialSummary.outstandingKobo)}</p></div>
        </div>
      </Card>

      <div>
        <p className="font-title-sm text-title-sm text-on-surface mb-space-sm">Task History</p>
        {data.taskHistory.length === 0 ? <EmptyState title="No tasks yet" /> : (
          <div className="flex flex-col gap-space-sm">
            {data.taskHistory.map((t) => (
              <Card key={t.id} className="p-space-sm flex items-center justify-between">
                <span className="text-body-md font-body-md text-on-surface">{t.title}</span>
                <span className="text-body-sm font-body-sm text-on-surface-variant">{naira(t.clientPriceKobo)} · {t.status.replace(/_/g, " ")}</span>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="font-title-sm text-title-sm text-on-surface mb-space-sm">Request History</p>
        {data.requestHistory.length === 0 ? <EmptyState title="No requests yet" /> : (
          <div className="flex flex-col gap-space-sm">
            {data.requestHistory.map((r) => (
              <Card key={r.id} className="p-space-sm flex items-center justify-between">
                <span className="text-body-md font-body-md text-on-surface">{r.taskType}</span>
                <Badge tone="neutral">{r.status.replace(/_/g, " ")}</Badge>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
