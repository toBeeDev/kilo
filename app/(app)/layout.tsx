import TabBar from "@/components/TabBar";
import { ToastProvider } from "@/components/Toast";
import { FloatingRestTimer, RestTimerProvider } from "@/components/RestTimer";
import { RepoProvider } from "@/lib/repo-provider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RepoProvider>
      <ToastProvider>
        <RestTimerProvider>
          <div className="safe-bottom mx-auto w-full max-w-[480px] px-5 pt-4">{children}</div>
          <FloatingRestTimer />
          <TabBar />
        </RestTimerProvider>
      </ToastProvider>
    </RepoProvider>
  );
}
