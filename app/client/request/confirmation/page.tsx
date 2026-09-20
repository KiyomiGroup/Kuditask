import Link from "next/link";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const NEXT_STEPS = [
  "Admin reviews your requirements",
  "Admin confirms pricing",
  "You complete payment",
  "Admin launches the campaign",
];

export default function ClientRequestConfirmationPage() {
  return (
    <PublicLayout>
      <div className="max-w-xl mx-auto px-margin lg:px-margin-desktop py-space-xl flex flex-col items-center text-center gap-space-md">
        <div className="w-16 h-16 rounded-full bg-status-settled-bg flex items-center justify-center">
          <span className="material-symbols-outlined text-status-settled-fg text-[32px]">check_circle</span>
        </div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Your request has been received.</h1>
        <p className="text-body-md font-body-md text-on-surface-variant">
          A live task has not been created yet. Here's what happens next:
        </p>

        <Card className="p-space-md w-full text-left">
          <ol className="flex flex-col gap-space-sm">
            {NEXT_STEPS.map((step, i) => (
              <li key={step} className="flex items-center gap-space-sm text-body-md font-body-md text-on-surface">
                <span className="w-6 h-6 rounded-full bg-secondary-container text-on-secondary-container text-label-sm font-label-sm flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </Card>

        <Link href="/client">
          <Button variant="outline">Back to Client Page</Button>
        </Link>
      </div>
    </PublicLayout>
  );
}
