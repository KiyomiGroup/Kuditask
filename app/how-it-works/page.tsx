import Link from "next/link";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const STEPS = [
  { title: "Sign up", body: "Create a tasker account and add your social media accounts." },
  { title: "Browse tasks", body: "Find available tasks — follows, engagement, testing, research, and more." },
  { title: "Start a task", body: "Claiming a task reserves your slot for 10 minutes so you can complete it." },
  { title: "Submit proof", body: "Upload a screenshot showing you completed the task, and confirm it's genuine." },
  { title: "Get verified", body: "Admin reviews your submission — approved rewards go straight to your wallet." },
  { title: "Withdraw", body: "Once you've hit 500 verified tasks and 10 active login days, request a withdrawal." },
];

export default function HowItWorksPage() {
  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-margin lg:px-margin-desktop py-space-xl flex flex-col gap-space-lg">
        <div className="text-center">
          <h1 className="font-headline-lg text-headline-lg text-on-surface mb-space-sm">How KudiTask Works</h1>
          <p className="text-body-lg font-body-lg text-on-surface-variant">
            Earn money completing simple digital tasks — here's the full loop.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
          {STEPS.map((s, i) => (
            <Card key={s.title} className="p-space-md">
              <p className="font-label-md text-label-md text-secondary mb-1">Step {i + 1}</p>
              <p className="font-title-sm text-title-sm text-on-surface mb-1">{s.title}</p>
              <p className="text-body-sm font-body-sm text-on-surface-variant">{s.body}</p>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Link href="/register"><Button size="md">Become a Tasker</Button></Link>
        </div>
      </div>
    </PublicLayout>
  );
}
