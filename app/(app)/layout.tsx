import TabBar from "@/components/TabBar";
import { RepoProvider } from "@/lib/repo-provider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RepoProvider>
      <div className="safe-bottom mx-auto w-full max-w-[480px] px-5 pt-4">{children}</div>
      <TabBar />
    </RepoProvider>
  );
}
