/** <script type="application/ld+json">. 서버 컴포넌트에서 그대로 쓴다. `<` 는 이스케이프해서 스크립트 탈출을 막는다. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
