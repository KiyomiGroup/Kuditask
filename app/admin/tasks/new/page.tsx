"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/feedback/Alert";
import { useToast } from "@/components/feedback/Toast";

interface ClientOption { id: string; contactName: string; companyName: string | null }
interface TierOption { id: string; level: number; rewardKobo: number }
interface TaskerOption { id: string; fullName: string; username: string }

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

export default function CreateTaskPage() {
  const router = useRouter();
  const toast = useToast();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    clientId: "",
    title: "",
    category: "",
    platform: "",
    targetUrl: "",
    description: "",
    instructions: "",
    proofRequirement: "",
    clientPrice: "",
    taskerReward: "",
    requiredCompletions: "",
    assignmentScope: "ALL_ELIGIBLE",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    fetch("/api/admin/clients").then((r) => (r.ok ? r.json() : [])).then(setClients);
  }, []);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const clientPriceKobo = Math.round((parseFloat(form.clientPrice) || 0) * 100);
  const taskerRewardKobo = Math.round((parseFloat(form.taskerReward) || 0) * 100);
  const requiredCompletions = parseInt(form.requiredCompletions) || 0;
  const estimatedCostKobo = taskerRewardKobo * requiredCompletions;
  const marginKobo = clientPriceKobo - estimatedCostKobo;
  const isViable = clientPriceKobo > 0 && requiredCompletions > 0 && marginKobo >= 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isViable) {
      setError("Cannot publish: estimated tasker cost exceeds client price. Adjust price, reward, or required completions.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: form.clientId,
          title: form.title,
          category: form.category,
          platform: form.platform || undefined,
          targetUrl: form.targetUrl || undefined,
          description: form.description,
          instructions: `${form.instructions}\n\nProof required: ${form.proofRequirement}`,
          clientPriceKobo,
          taskerRewardKobo,
          requiredCompletions,
          assignmentScope: form.assignmentScope,
          startDate: form.startDate || undefined,
          endDate: form.endDate || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        // The server-side check in lib/economics.ts is authoritative — this
        // client-side isViable flag is a convenience, not the real gate.
        setError(body.error ?? "Could not create task.");
        return;
      }
      toast.push("settled", "Task created.");
      router.push(`/admin/tasks/${body.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl flex flex-col gap-space-lg">
      <h1 className="font-headline-md text-headline-md text-on-surface">Create Task</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-space-md">
        <Card className="p-space-md flex flex-col gap-space-sm">
          <p className="font-title-sm text-title-sm text-on-surface">Client</p>
          <Select value={form.clientId} onChange={(e) => set("clientId", e.target.value)} required>
            <option value="">Select a client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.companyName ?? c.contactName}</option>
            ))}
          </Select>
        </Card>

        <Card className="p-space-md flex flex-col gap-space-sm">
          <p className="font-title-sm text-title-sm text-on-surface">Task Details</p>
          <Input placeholder="Task title" required value={form.title} onChange={(e) => set("title", e.target.value)} />
          <Input placeholder="Category" required value={form.category} onChange={(e) => set("category", e.target.value)} />
          <Select value={form.platform} onChange={(e) => set("platform", e.target.value)}>
            <option value="">Platform (optional)</option>
            <option value="INSTAGRAM">Instagram</option>
            <option value="FACEBOOK">Facebook</option>
            <option value="TIKTOK">TikTok</option>
            <option value="X">X</option>
            <option value="YOUTUBE">YouTube</option>
            <option value="OTHER">Other</option>
          </Select>
          <Input placeholder="Target link/account" value={form.targetUrl} onChange={(e) => set("targetUrl", e.target.value)} />
          <Textarea placeholder="Short description" required value={form.description} onChange={(e) => set("description", e.target.value)} />
        </Card>

        <Card className="p-space-md flex flex-col gap-space-sm">
          <p className="font-title-sm text-title-sm text-on-surface">Instructions</p>
          <Textarea placeholder="Step-by-step instructions for taskers" required value={form.instructions} onChange={(e) => set("instructions", e.target.value)} />
          <p className="font-title-sm text-title-sm text-on-surface mt-space-sm">Proof Requirement</p>
          <Textarea placeholder="What screenshot/proof must the tasker submit?" required value={form.proofRequirement} onChange={(e) => set("proofRequirement", e.target.value)} />
        </Card>

        <Card className="p-space-md flex flex-col gap-space-sm">
          <p className="font-title-sm text-title-sm text-on-surface">Assignment</p>
          <Select value={form.assignmentScope} onChange={(e) => set("assignmentScope", e.target.value)}>
            <option value="ALL_ELIGIBLE">All eligible taskers</option>
            <option value="SPECIFIC_TIERS">Specific tier(s)</option>
            <option value="SPECIFIC_TASKERS">Specific taskers</option>
            <option value="SPECIFIC_PLATFORM">Taskers with this task's platform</option>
          </Select>
          {form.assignmentScope !== "ALL_ELIGIBLE" && form.assignmentScope !== "SPECIFIC_PLATFORM" && (
            <p className="text-body-sm font-body-sm text-on-surface-variant">
              Tier/tasker selection isn't wired into this form yet — create the task as All Eligible for now, then narrow it from the task detail page once that's built.
            </p>
          )}
        </Card>

        <Card className="p-space-md flex flex-col gap-space-sm">
          <p className="font-title-sm text-title-sm text-on-surface">Schedule</p>
          <div className="grid grid-cols-2 gap-space-sm">
            <Input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
            <Input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
          </div>
        </Card>

        <Card className={`p-space-md flex flex-col gap-space-sm border-2 ${isViable ? "border-status-settled-fg/30" : "border-status-error-fg/40"}`}>
          <p className="font-title-sm text-title-sm text-on-surface">Task Economics</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-space-sm">
            <Input placeholder="Client price (₦)" type="number" required value={form.clientPrice} onChange={(e) => set("clientPrice", e.target.value)} />
            <Input placeholder="Tasker reward (₦)" type="number" required value={form.taskerReward} onChange={(e) => set("taskerReward", e.target.value)} />
            <Input placeholder="Required completions" type="number" required value={form.requiredCompletions} onChange={(e) => set("requiredCompletions", e.target.value)} />
          </div>
          <dl className="text-body-sm font-body-sm text-on-surface-variant flex flex-col gap-1">
            <div className="flex justify-between"><dt>Estimated Tasker Cost</dt><dd className="text-on-surface">{naira(estimatedCostKobo)}</dd></div>
            <div className="flex justify-between">
              <dt>Expected Platform Margin</dt>
              <dd className={marginKobo >= 0 ? "text-status-settled-fg" : "text-status-error-fg"}>{naira(marginKobo)}</dd>
            </div>
          </dl>
          {!isViable && requiredCompletions > 0 && clientPriceKobo > 0 && (
            <Alert tone="error">
              Cannot publish: tasker cost (₦{(estimatedCostKobo / 100).toLocaleString()}) exceeds client price
              (₦{(clientPriceKobo / 100).toLocaleString()}). Raise the client price, lower the reward, or reduce
              required completions.
            </Alert>
          )}
        </Card>

        {error && <Alert tone="error">{error}</Alert>}

        <Button type="submit" size="md" disabled={submitting || !isViable}>
          {submitting ? "Creating..." : "Create Task"}
        </Button>
      </form>
    </div>
  );
}
