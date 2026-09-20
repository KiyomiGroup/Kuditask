import { TaskerLayout } from "@/components/layout/TaskerLayout";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <TaskerLayout>{children}</TaskerLayout>;
}
