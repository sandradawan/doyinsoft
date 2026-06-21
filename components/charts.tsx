// Lightweight, dependency-free SVG charts — flat, emerald, responsive.
// Server-rendered (no client JS). Labels are HTML so they stay crisp while the
// SVG stretches to the container width.

const W = 600;

export function LineChart({
  data,
  height = 170,
}: {
  data: { label: string; value: number }[];
  height?: number;
}) {
  const padX = 10;
  const padTop = 14;
  const padBottom = 4;
  const innerH = height - padTop - padBottom;
  const max = Math.max(1, ...data.map((d) => d.value));
  const n = Math.max(1, data.length - 1);
  const x = (i: number) => padX + (i * (W - 2 * padX)) / n;
  const y = (v: number) => padTop + innerH * (1 - v / max);

  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(d.value).toFixed(1)}`).join(" ");
  const area = data.length
    ? `${line} L${x(data.length - 1).toFixed(1)} ${(padTop + innerH).toFixed(1)} L${x(0).toFixed(1)} ${(padTop + innerH).toFixed(1)} Z`
    : "";

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        role="img"
        aria-label="Line chart"
      >
        <path d={area} fill="var(--brand-tint)" />
        <path
          d={line}
          fill="none"
          stroke="var(--brand)"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <div className="flex justify-between mt-1">
        {data.map((d, i) => (
          <span key={i} className="text-[10px] text-ink-faint">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function BarChart({
  data,
  height = 170,
}: {
  data: { label: string; value: number }[];
  height?: number;
}) {
  const padX = 10;
  const padTop = 14;
  const padBottom = 4;
  const innerH = height - padTop - padBottom;
  const max = Math.max(1, ...data.map((d) => d.value));
  const n = Math.max(1, data.length);
  const slot = (W - 2 * padX) / n;
  const bw = slot * 0.6;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        role="img"
        aria-label="Bar chart"
      >
        {data.map((d, i) => {
          const h = Math.max(0, innerH * (d.value / max));
          const xx = padX + i * slot + (slot - bw) / 2;
          const yy = padTop + innerH - h;
          return <rect key={i} x={xx} y={yy} width={bw} height={h} fill="var(--brand)" opacity={0.85} />;
        })}
      </svg>
      <div className="flex mt-1">
        {data.map((d, i) => (
          <span key={i} className="text-[10px] text-ink-faint flex-1 text-center truncate px-[2px]">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
