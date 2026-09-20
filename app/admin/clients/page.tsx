"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";

interface ClientRow {
  id: string; contactName: string; companyName: string | null; status: string;
  requestCount: number; activeTaskCount: number; completedTaskCount: number; totalSpendKobo: number;
}

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

export default function AdminClientsPage() {
  const [clients, setClients] = useState<ClientRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    const res = await fetch(`/api/admin/clients?${params}`);
    if (!res.ok) {
      setError("Could not load clients.");
      return;
    }
    setClients(await res.json());
  }, [search, status]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <ErrorState description={error} />;

  return (
    <div className="flex flex-col gap-space-md">
      <h1 className="font-headline-md text-headline-md text-on-surface">Clients</h1>
      <div className="flex flex-col sm:flex-row gap-space-sm">
        <Input placeholder="Search clients..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-48">
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING">Pending</option>
          <option value="INACTIVE">Inactive</option>
        </Select>
      </div>

      {clients === null && <LoadingState label="Loading clients..." />}
      {clients && clients.length === 0 && <EmptyState title="No clients match these filters" />}

      <div className="flex flex-col gap-space-sm">
        {clients?.map((c) => (
          <Link key={c.id} href={`/admin/clients/${c.id}`}>
            <Card className="p-space-md flex items-center justify-between hover:border-secondary transition">
              <div>
                <p className="text-body-md font-body-md text-on-surface">{c.companyName ?? c.contactName}</p>
                <p className="text-body-sm font-body-sm text-on-surface-variant">
                  {c.contactName} · {c.requestCount} requests · {c.activeTaskCount} active · {c.completedTaskCount} completed
                </p>
              </div>
              <div className="text-right">
                <p className="font-title-sm text-title-sm text-on-surface">{naira(c.totalSpendKobo)}</p>
                <Badge tone={c.status === "ACTIVE" ? "settled" : c.status === "INACTIVE" ? "neutral" : "warning"}>{c.status}</Badge>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
