"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/feedback/Alert";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { useToast } from "@/components/feedback/Toast";

interface ReservationState {
  id: string;
  status: "ACTIVE" | "SUBMITTED" | "EXPIRED";
  secondsRemaining: number;
  task: { id: string; title: string };
}

function formatMMSS(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ActiveTaskPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [reservation, setReservation] = useState<ReservationState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [submittedHandle, setSubmittedHandle] = useState("");
  const [declared, setDeclared] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // The countdown shown to the tasker is always re-derived from the server's
  // secondsRemaining, polled every 5s — the setInterval below only
  // decrements a local display number between polls, it never invents time.
  useEffect(() => {
    let displaySeconds = 0;
    async function poll() {
      const res = await fetch(`/api/reservations/${id}`);
      if (!res.ok) {
        setError("Could not load this reservation.");
        return;
      }
      const data: ReservationState = await res.json();
      displaySeconds = data.secondsRemaining;
      setReservation(data);
    }
    poll();
    const serverPoll = setInterval(poll, 5000);
    const localTick = setInterval(() => {
      setReservation((prev) => {
        if (!prev || prev.status !== "ACTIVE") return prev;
        const next = Math.max(0, prev.secondsRemaining - 1);
        return { ...prev, secondsRemaining: next };
      });
    }, 1000);
    pollRef.current = serverPoll;
    return () => {
      clearInterval(serverPoll);
      clearInterval(localTick);
    };
  }, [id]);

  async function handleSubmit() {
    if (!file) {
      toast.push("warning", "Choose a screenshot to upload.");
      return;
    }
    if (!declared) {
      toast.push("warning", "You must confirm the proof is genuine.");
      return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      form.set("screenshot", file);
      form.set("declaredGenuine", "true");
      if (submittedHandle) form.set("submittedHandle", submittedHandle);

      const res = await fetch(`/api/reservations/${id}/submit`, { method: "POST", body: form });
      const body = await res.json();
      if (!res.ok) {
        toast.push("error", body.error ?? "Could not submit proof.");
        return;
      }
      toast.push("settled", "Proof submitted — pending verification.");
      router.push("/app/tasks");
    } finally {
      setSubmitting(false);
    }
  }

  if (error) return <ErrorState description={error} />;
  if (!reservation) return <LoadingState label="Loading reservation..." />;

  if (reservation.status === "EXPIRED") {
    return (
      <div className="max-w-md mx-auto flex flex-col gap-space-md text-center py-space-xl">
        <p className="font-title-sm text-title-sm text-status-error-fg">Your reservation has expired.</p>
        <p className="text-body-sm font-body-sm text-on-surface-variant">Your task slot has been released.</p>
        <Button onClick={() => router.push("/app/tasks")}>Back to Available Tasks</Button>
      </div>
    );
  }

  if (reservation.status === "SUBMITTED") {
    return (
      <div className="max-w-md mx-auto flex flex-col gap-space-md text-center py-space-xl">
        <p className="font-title-sm text-title-sm text-status-settled-fg">Proof already submitted.</p>
        <Button onClick={() => router.push("/app/tasks")}>Back to Available Tasks</Button>
      </div>
    );
  }

  const warningZone = reservation.secondsRemaining <= 120;

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-space-md">
      <h1 className="font-headline-md text-headline-md text-on-surface">{reservation.task.title}</h1>

      <Card className="p-space-lg flex flex-col items-center gap-space-sm">
        <span className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wide">
          Time remaining
        </span>
        <span
          className={`font-currency-display text-currency-display ${warningZone ? "text-status-error-fg" : "text-on-surface"}`}
        >
          {formatMMSS(reservation.secondsRemaining)}
        </span>
        {warningZone && (
          <p className="text-body-sm font-body-sm text-status-error-fg text-center">
            Complete this task and submit proof before your reservation expires.
          </p>
        )}
      </Card>

      <Card className="p-space-md flex flex-col gap-space-sm">
        <h2 className="font-title-sm text-title-sm text-on-surface">Upload proof</h2>
        <Alert tone="warning">
          Fake, edited, duplicated, or misleading screenshots can result in the reward not being
          released and may lead to deductions or disciplinary action.
        </Alert>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-body-sm font-body-sm"
        />
        <Input
          placeholder="Username/account used (optional)"
          value={submittedHandle}
          onChange={(e) => setSubmittedHandle(e.target.value)}
        />
        <label className="flex items-start gap-space-sm text-body-sm font-body-sm text-on-surface-variant">
          <input
            type="checkbox"
            checked={declared}
            onChange={(e) => setDeclared(e.target.checked)}
            className="mt-1"
          />
          I confirm this proof is genuine and accurately represents completion of this task.
        </label>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Submitting..." : "Upload Proof"}
        </Button>
      </Card>
    </div>
  );
}
