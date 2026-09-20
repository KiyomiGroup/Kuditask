import Link from "next/link";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const STEPS = [
  { title: "You submit a request", body: "Tell us what you need — platform, goal, target link, and how many completions you're after." },
  { title: "Admin reviews it", body: "We check feasibility and confirm pricing for your campaign." },
  { title: "You pay", body: "Once you approve the price, payment is handled directly with our team." },
  { title: "We launch the campaign", body: "Only after payment is confirmed does the task go live on the platform for taskers." },
];

export default function ClientPage() {
  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-margin lg:px-margin-desktop py-space-xl flex flex-col gap-space-lg">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mb-space-sm">
            Get your campaign done by real people
          </h1>
          <p className="text-body-lg font-body-lg text-on-surface-variant">
            Businesses can request digital task campaigns — follows, testing, research, and more —
            completed by our tasker community. We handle the setup end-to-end; you don't need an
            account or any technical work.
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

        <Card className="p-space-md bg-status-info-bg border-status-info-fg/20">
          <p className="text-body-sm font-body-sm text-status-info-fg">
            Submitting a request does not create a live task — Admin reviews requirements and
            confirms pricing with you before anything goes live.
          </p>
        </Card>

        <Link href="/client/request">
          <Button size="md">Request a Campaign</Button>
        </Link>
      </div>
    </PublicLayout>
  );
}
