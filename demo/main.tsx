/**
 * 데모 번들 진입점. Next 없이 한 페이지(해시 라우팅)로 묶는다.
 * - Supabase/AI 없음 → 로컬 저장, AI 버튼은 안내 메시지
 * - 운동 이미지는 번들에 같이 실은 로컬 파일
 */
import { createRoot } from "react-dom/client";
import { RepoProvider } from "@/lib/repo-provider";
import TabBar from "@/components/TabBar";
import Home from "@/app/(app)/page";
import Meals from "@/app/(app)/meals/page";
import Workout from "@/app/(app)/workout/page";
import Me from "@/app/(app)/me/page";
import { usePathname } from "./shims/navigation";
import { seedIfEmpty } from "./seed";

declare const __MEDIA_IDS__: string[];

const mediaIds = new Set<string>(typeof __MEDIA_IDS__ === "undefined" ? [] : __MEDIA_IDS__);
globalThis.__kiloMedia = (id) => (mediaIds.has(id) ? [`media/${id}_0.jpg`, `media/${id}_1.jpg`] : null);

// AI 라우트는 번들에 없음 → 친절한 503
const realFetch = window.fetch.bind(window);
window.fetch = (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.startsWith("/api/")) {
    return Promise.resolve(
      new Response(JSON.stringify({ error: "데모에선 AI 분석이 꺼져 있어. 직접 입력해봐." }), {
        status: 503,
        headers: { "content-type": "application/json" },
      }),
    );
  }
  return realFetch(input, init);
};
// 아티팩트 뷰어는 confirm()이 항상 false → 삭제가 안 되니 통과시킴
window.confirm = () => true;

function Router() {
  const path = usePathname();
  if (path === "/meals") return <Meals />;
  if (path === "/workout") return <Workout />;
  if (path === "/me") return <Me />;
  return <Home />;
}

function App() {
  return (
    <RepoProvider>
      <div className="safe-bottom mx-auto w-full max-w-[480px] px-5 pt-4">
        <Router />
      </div>
      <TabBar />
    </RepoProvider>
  );
}

seedIfEmpty();
createRoot(document.getElementById("root")!).render(<App />);
