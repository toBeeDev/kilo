/**
 * 오프라인 데모 번들: Next 없이 단일 HTML + 로컬 운동 이미지.
 *   node scripts/build-demo.mjs [--photo path.jpg]
 * 결과: demo-dist/index.html, demo-dist/media/*.jpg
 */
import { build } from "esbuild";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const out = join(root, "demo-dist");
const mediaDir = join(out, "media");
mkdirSync(mediaDir, { recursive: true });

const argPhoto = process.argv.indexOf("--photo");
const photoPath = argPhoto > -1 ? process.argv[argPhoto + 1] : null;
const ricePhoto = photoPath && existsSync(photoPath)
  ? `data:image/jpeg;base64,${readFileSync(photoPath).toString("base64")}`
  : "";

const mediaIds = [...new Set(readdirSync(mediaDir).filter((f) => f.endsWith("_0.jpg")).map((f) => f.replace(/_0\.jpg$/, "")))];

// 1. JS
const js = await build({
  entryPoints: [join(root, "demo/main.tsx")],
  bundle: true,
  write: false,
  minify: true,
  format: "iife",
  target: ["es2020"],
  jsx: "automatic",
  tsconfig: join(root, "tsconfig.json"),
  alias: {
    "next/link": join(root, "demo/shims/link.tsx"),
    "next/navigation": join(root, "demo/shims/navigation.ts"),
    "@/lib/supabase/client": join(root, "demo/shims/supabase.ts"),
  },
  define: {
    "process.env": "{}",
    __MEDIA_IDS__: JSON.stringify(mediaIds),
    __RICE_PHOTO__: JSON.stringify(ricePhoto),
  },
  logLevel: "warning",
});
let script = js.outputFiles[0].text.replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "<\\!--");

// 2. CSS (Tailwind v4 CLI)
execSync(`npx @tailwindcss/cli -i app/globals.css -o demo-dist/app.css --minify`, { cwd: root, stdio: "inherit" });
let css = readFileSync(join(out, "app.css"), "utf8")
  .replace(/@import\s+(?:url\()?["']?https?:\/\/[^;]*pretendard[^;]*;?/gi, "") // 외부 폰트 CDN은 아티팩트에서 막힘
  .replace(/<\/style/gi, "<\\/style");

// 3. HTML (아티팩트 스켈레톤이 doctype/head/body를 감싸므로 본문만)
const html = `<title>kilo</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
${css}
html,body{height:100%}
.safe-bottom{padding-left:max(20px,env(safe-area-inset-left,0px));padding-right:max(20px,env(safe-area-inset-right,0px))}
</style>
<div id="root"></div>
<script>${script}</script>
`;
writeFileSync(join(out, "index.html"), html);
console.log(`index.html ${(html.length / 1024).toFixed(0)}KB, media ${mediaIds.length}종목`);
