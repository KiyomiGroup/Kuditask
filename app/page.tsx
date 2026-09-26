import Link from "next/link";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function HomePage() {
  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-margin lg:px-margin-desktop py-space-xl flex flex-col gap-space-lg">
        <div className="text-center">
          <h1 className="font-headline-xl text-headline-xl text-on-surface mb-space-sm">
            Earn doing simple digital tasks
          </h1>
          <p className="text-body-lg font-body-lg text-on-surface-variant max-w-xl mx-auto">
            KudiTask connects Nigerian taskers with real paid work — follows, testing, research, and
            more — and helps businesses get campaigns done by real people.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
          <Card className="p-space-lg flex flex-col gap-space-sm">
            <span className="material-symbols-outlined text-secondary text-[28px]">task_alt</span>
            <p className="font-title-md text-title-md text-on-surface">I want to earn</p>
            <p className="text-body-sm font-body-sm text-on-surface-variant">
              Complete tasks, submit proof, get paid to your wallet.
            </p>
            <div className="flex gap-space-sm mt-space-sm">
              <Link href="/register"><Button size="md">Become a Tasker</Button></Link>
              <Link href="/login"><Button size="md" variant="outline">Log in</Button></Link>
            </div>
          </Card>

          <Card className="p-space-lg flex flex-col gap-space-sm">
            <span className="material-symbols-outlined text-secondary text-[28px]">handshake</span>
            <p className="font-title-md text-title-md text-on-surface">I want a campaign done</p>
            <p className="text-body-sm font-body-sm text-on-surface-variant">
              Request a campaign — we handle setup, pricing, and launch.
            </p>
            <Link href="/client" className="mt-space-sm">
              <Button size="md" variant="outline">Request a Campaign</Button>
            </Link>
          </Card>
        </div>
      </div>
    </PublicLayout>
  );
}
