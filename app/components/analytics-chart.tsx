"use client";

type ChartPoint = {
  label: string;
  dateLabel: string;
  count: number;
};

export function AnalyticsChart({ data }: { data: ChartPoint[] }) {
  const width = 760;
  const height = 250;
  const padding = { top: 24, right: 18, bottom: 36, left: 18 };
  const max = Math.max(...data.map((item) => item.count), 1);
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const coordinates = data.map((item, index) => {
    const x =
      data.length === 1
        ? width / 2
        : padding.left + (index / (data.length - 1)) * innerWidth;
    const y = padding.top + innerHeight - (item.count / max) * innerHeight;
    return { ...item, x, y };
  });

  const line = coordinates.map(({ x, y }) => `${x},${y}`).join(" ");
  const area = `${padding.left},${height - padding.bottom} ${line} ${coordinates.at(-1)?.x ?? padding.left},${height - padding.bottom}`;

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/[0.07] bg-black/20 p-3 sm:p-5">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-[radial-gradient(ellipse_at_center_bottom,rgba(255,122,26,0.14),transparent_67%)]" />
      <svg
        aria-label="Gráfico de escaneos"
        className="relative h-56 w-full overflow-visible"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
      >
        <defs>
          <linearGradient id="tapixxo-chart-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#ff7a1a" stopOpacity="0.36" />
            <stop offset="100%" stopColor="#ff7a1a" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="tapixxo-chart-line" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#ff9a4d" />
            <stop offset="100%" stopColor="#ff6a00" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75, 1].map((step) => {
          const y = padding.top + innerHeight * (1 - step);
          return (
            <line
              key={step}
              x1={padding.left}
              x2={width - padding.right}
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,0.08)"
              strokeDasharray="3 6"
            />
          );
        })}

        <polygon fill="url(#tapixxo-chart-fill)" points={area} />
        <polyline
          fill="none"
          points={line}
          stroke="url(#tapixxo-chart-line)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
          className="[stroke-dasharray:1100] [stroke-dashoffset:1100] motion-safe:animate-[draw-chart_1.2s_ease-out_forwards]"
        />

        {coordinates.map((point, index) => (
          <g key={`${point.label}-${index}`}>
            <title>{`${point.dateLabel ? `${point.dateLabel}, ` : ""}${point.label}: ${point.count} escaneos`}</title>
            <circle cx={point.x} cy={point.y} fill="#080909" r="5" stroke="#ff9a4d" strokeWidth="2" />
            {(data.length <= 10 || index === 0 || index === data.length - 1) && (
              <text fill="#888b84" fontSize="10" textAnchor="middle" x={point.x} y={height - 10}>
                {point.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
