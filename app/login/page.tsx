"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/feedback/Alert";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? body.errors?._form ?? "Could not log in.");
        return;
      }
      router.push(body.role === "ADMIN" ? "/admin" : "/app");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PublicLayout>
      <div className="max-w-sm mx-auto px-margin py-space-xl">
        <h1 className="font-headline-lg text-headline-lg text-on-surface mb-space-lg text-center">Log in</h1>
        <Card className="p-space-md">
          <form onSubmit={handleSubmit} className="flex flex-col gap-space-sm">
            <Input type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input type="password" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            {error && <Alert tone="error">{error}</Alert>}
            <Button type="submit" size="md" disabled={submitting}>
              {submitting ? "Logging in..." : "Log in"}
            </Button>
          </form>
        </Card>
        <p className="text-body-sm font-body-sm text-on-surface-variant text-center mt-space-md">
          New tasker? <Link href="/register" className="text-secondary">Create an account</Link>
        </p>
      </div>
    </PublicLayout>
  );
}
