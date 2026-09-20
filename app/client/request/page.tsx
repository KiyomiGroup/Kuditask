"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/feedback/Alert";

export default function ClientRequestFormPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    contactName: "",
    companyName: "",
    email: "",
    phone: "",
    whatsapp: "",
    taskType: "",
    platform: "",
    goal: "",
    targetLink: "",
    requestedCompletions: "",
    preferredCompletionDate: "",
    requirements: "",
    additionalNotes: "",
    preferredContactMethod: "whatsapp",
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/client-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          platform: form.platform || undefined,
          requestedCompletions: form.requestedCompletions ? Number(form.requestedCompletions) : undefined,
          preferredCompletionDate: form.preferredCompletionDate || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Could not submit your request.");
        return;
      }
      router.push("/client/request/confirmation");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto px-margin lg:px-margin-desktop py-space-xl">
        <h1 className="font-headline-lg text-headline-lg text-on-surface mb-space-sm">Request a Campaign</h1>
        <Alert tone="info">
          Submitting this request does not create a live task. Admin will review your requirements
          and confirm pricing before anything is launched.
        </Alert>

        <form onSubmit={handleSubmit} className="flex flex-col gap-space-md mt-space-lg">
          <Card className="p-space-md flex flex-col gap-space-sm">
            <p className="font-title-sm text-title-sm text-on-surface">Contact</p>
            <Input placeholder="Contact name" required value={form.contactName} onChange={(e) => set("contactName", e.target.value)} />
            <Input placeholder="Company / business name" value={form.companyName} onChange={(e) => set("companyName", e.target.value)} />
            <Input type="email" placeholder="Email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            <Input placeholder="Phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            <Input placeholder="WhatsApp number" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
            <Select value={form.preferredContactMethod} onChange={(e) => set("preferredContactMethod", e.target.value)}>
              <option value="whatsapp">Preferred contact: WhatsApp</option>
              <option value="email">Preferred contact: Email</option>
              <option value="phone">Preferred contact: Phone</option>
            </Select>
          </Card>

          <Card className="p-space-md flex flex-col gap-space-sm">
            <p className="font-title-sm text-title-sm text-on-surface">Campaign details</p>
            <Input placeholder="Task type (e.g. Instagram Follow Campaign)" required value={form.taskType} onChange={(e) => set("taskType", e.target.value)} />
            <Select value={form.platform} onChange={(e) => set("platform", e.target.value)}>
              <option value="">Platform (optional)</option>
              <option value="INSTAGRAM">Instagram</option>
              <option value="FACEBOOK">Facebook</option>
              <option value="TIKTOK">TikTok</option>
              <option value="X">X</option>
              <option value="YOUTUBE">YouTube</option>
              <option value="OTHER">Other</option>
            </Select>
            <Textarea placeholder="What's the goal of this campaign?" required value={form.goal} onChange={(e) => set("goal", e.target.value)} />
            <Input placeholder="Target link / account" value={form.targetLink} onChange={(e) => set("targetLink", e.target.value)} />
            <Input type="number" placeholder="Number of required completions" value={form.requestedCompletions} onChange={(e) => set("requestedCompletions", e.target.value)} />
            <Input type="date" placeholder="Preferred completion date" value={form.preferredCompletionDate} onChange={(e) => set("preferredCompletionDate", e.target.value)} />
            <Textarea placeholder="Requirements for taskers" required value={form.requirements} onChange={(e) => set("requirements", e.target.value)} />
            <Textarea placeholder="Additional notes (optional)" value={form.additionalNotes} onChange={(e) => set("additionalNotes", e.target.value)} />
          </Card>

          {error && <Alert tone="error">{error}</Alert>}

          <Button type="submit" size="md" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Request"}
          </Button>
        </form>
      </div>
    </PublicLayout>
  );
}
