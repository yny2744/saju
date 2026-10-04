import type { Weather } from "@/lib/fortuneView";

/** 운세 점수를 날씨로 보여주는 아이콘 (자체 제작 SVG, 외부 이미지 없음) */
export function WeatherIcon({ weather, size = 28 }: { weather: Weather; size?: number }) {
  const sun = "#e8a33d";
  const cloud = "#b9bcc4";
  const rain = "#5d82b3";
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      {(weather === "sunny" || weather === "partly") && (
        <g transform={weather === "partly" ? "translate(-4,-4) scale(0.85)" : undefined}>
          <circle cx="16" cy="16" r="6.5" fill={sun} />
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i * Math.PI) / 4;
            return (
              <line
                key={i}
                x1={16 + Math.cos(a) * 9.5}
                y1={16 + Math.sin(a) * 9.5}
                x2={16 + Math.cos(a) * 12.5}
                y2={16 + Math.sin(a) * 12.5}
                stroke={sun}
                strokeWidth="2"
                strokeLinecap="round"
              />
            );
          })}
        </g>
      )}
      {weather !== "sunny" && (
        <path
          d="M9 25h14a5 5 0 0 0 0-10 7 7 0 0 0-13.3 1.6A4.2 4.2 0 0 0 9 25z"
          fill={weather === "partly" ? "#d9dbe0" : cloud}
          transform={weather === "partly" ? "translate(3,2)" : weather === "rainy" ? "translate(0,-4)" : undefined}
        />
      )}
      {weather === "rainy" &&
        [11, 16, 21].map((x) => <line key={x} x1={x} y1="24" x2={x - 1.5} y2="29" stroke={rain} strokeWidth="2" strokeLinecap="round" />)}
    </svg>
  );
}
