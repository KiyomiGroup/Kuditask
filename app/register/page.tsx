"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/feedback/Alert";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "", username: "", email: "", phone: "", password: "", confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) {
        setErrors(body.errors ?? { _form: body.error ?? "Could not register." });
        return;
      }
      router.push("/app");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PublicLayout>
      <div className="max-w-sm mx-auto px-margin py-space-xl">
        <h1 className="font-headline-lg text-headline-lg text-on-surface mb-space-lg text-center">Become a Tasker</h1>
        <Card className="p-space-md">
          <form onSubmit={handleSubmit} className="flex flex-col gap-space-sm">
            <div>
              <Input placeholder="Full name" required value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
              {errors.fullName && <p className="text-body-sm font-body-sm text-status-error-fg mt-1">{errors.fullName}</p>}
            </div>
            <div>
              <Input placeholder="Username" required value={form.username} onChange={(e) => set("username", e.target.value)} />
              {errors.username && <p className="text-body-sm font-body-sm text-status-error-fg mt-1">{errors.username}</p>}
            </div>
            <div>
              <Input type="email" placeholder="Email" required value={form.email} onChange={(e) => set("email", e.target.value)} />
              {errors.email && <p className="text-body-sm font-body-sm text-status-error-fg mt-1">{errors.email}</p>}
            </div>
            <div>
              <Input placeholder="Phone (e.g. +2348031112222)" required value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              {errors.phone && <p className="text-body-sm font-body-sm text-status-error-fg mt-1">{errors.phone}</p>}
            </div>
            <div>
              <Input type="password" placeholder="Password" required value={form.password} onChange={(e) => set("password", e.target.value)} />
              {errors.password && <p className="text-body-sm font-body-sm text-status-error-fg mt-1">{errors.password}</p>}
            </div>
            <div>
              <Input type="password" placeholder="Confirm password" required value={form.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)} />
              {errors.confirmPassword && <p className="text-body-sm font-body-sm text-status-error-fg mt-1">{errors.confirmPassword}</p>}
            </div>
            {errors._form && <Alert tone="error">{errors._form}</Alert>}
            <Button type="submit" size="md" disabled={submitting}>
              {submitting ? "Creating account..." : "Create account"}
            </Button>
          </form>
        </Card>
        <p className="text-body-sm font-body-sm text-on-surface-variant text-center mt-space-md">
          Already have an account? <Link href="/login" className="text-secondary">Log in</Link>
        </p>
      </div>
    </PublicLayout>
  );
}
