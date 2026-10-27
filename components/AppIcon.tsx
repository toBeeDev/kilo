/**
 * 앱 아이콘 (public/icon.svg 와 같은 그림). ImageResponse(satori)로 PNG를 만들 때 쓴다.
 * satori는 flex 레이아웃만 지원하고 SVG 속성은 camelCase.
 * - square: iOS 홈 화면용. iOS가 모서리를 알아서 깎으므로 꽉 찬 사각형.
 * - 그 외(maskable): 안드로이드 마스크 안전 영역(가운데 80%)에 링을 넣는다.
 */
export function AppIcon({ size, square = false }: { size: number; square?: boolean }) {
  const r = square ? 0 : size * 0.22;
  const ring = size * (square ? 0.47 : 0.4);
  const stroke = ring * 0.33;
  const radius = ring / 2 - stroke / 2;
  const c = 2 * Math.PI * radius;
  return (
    <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: "#111111", borderRadius: r }}>
      <svg width={ring} height={ring} viewBox={`0 0 ${ring} ${ring}`}>
        <circle
          cx={ring / 2}
          cy={ring / 2}
          r={radius}
          fill="none"
          stroke="#ffffff"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * 0.7} ${c}`}
          transform={`rotate(-90 ${ring / 2} ${ring / 2})`}
        />
      </svg>
    </div>
  );
}
