import { useEffect, useId, useRef, useState } from "react";
import type { Point } from "../physics/simulation";

export function formatNumber(value: number, digits = 3): string {
  if (!Number.isFinite(value)) return "—";
  if (
    Math.abs(value) > 0 &&
    (Math.abs(value) < Math.max(0.001, 10 ** -digits) ||
      Math.abs(value) >= 100000)
  )
    return value.toExponential(2);
  return value.toLocaleString("es-ES", { maximumFractionDigits: digits });
}

export default function Plot({
  points,
  xLabel,
  unit,
  labels,
  marker,
  secondaryPoints,
}: {
  points: Point[];
  xLabel: string;
  unit: string;
  labels: [string, string];
  marker?: { x: number; y: number };
  secondaryPoints?: { x: number; y: number }[];
}) {
  const id = useId();
  const ref = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(675);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(320, entry.contentRect.width)),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const secondary =
    secondaryPoints ?? points.map((point) => ({ x: point.x, y: point.y2 }));
  const all = [...points, ...secondary];
  const finite = all.map((point) => point.y).filter(Number.isFinite);
  const xmin = all.length ? Math.min(...all.map((point) => point.x)) : 0;
  const xmax = Math.max(...all.map((point) => point.x), xmin + 0.01);
  const ymin = Math.min(...finite, 0),
    ymax = Math.max(...finite, ymin + 0.001);
  const padding = (ymax - ymin) * 0.12;
  const min = ymin < 0 ? ymin - padding : ymin,
    max = ymax + padding;
  const rows = [0, 1, 2, 3].map((index) => min + ((max - min) * index) / 3);
  const widest = Math.max(
    ...rows.map((value) => formatNumber(value, 2).length),
  );
  const left = Math.min(120, Math.max(44, 14 + widest * 5.5));
  const right = width - 27;
  const x = (v: number) => left + ((v - xmin) / (xmax - xmin)) * (right - left);
  const y = (v: number) => 155 - ((v - min) / (max - min)) * 127;
  const line = (data: { x: number; y: number }[]) =>
    data
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
      .map(
        (point, i) =>
          `${i ? "L" : "M"}${x(point.x).toFixed(2)},${y(point.y).toFixed(2)}`,
      )
      .join(" ");
  return (
    <svg
      ref={ref}
      className="plot"
      viewBox={`0 0 ${width} 204`}
      role="img"
      aria-labelledby={id}
    >
      <title id={id}>
        {labels[0]} y {labels[1]}. Eje horizontal: {xLabel}. Eje vertical:{" "}
        {unit}.
      </title>
      {rows.map((value, index) => (
        <g key={index}>
          <line
            x1={left}
            x2={right}
            y1={y(value)}
            y2={y(value)}
            className="plot-grid"
          />
          <text
            className="plot-tick-y"
            x={left - 11}
            y={y(value) + 4}
            textAnchor="end"
          >
            {formatNumber(value, 2)}
          </text>
        </g>
      ))}
      {[0, 1, 2, 3, 4].map((index) => {
        const value = xmin + ((xmax - xmin) * index) / 4;
        return (
          <text
            key={index}
            x={x(value)}
            y="177"
            textAnchor={index === 0 ? "start" : index === 4 ? "end" : "middle"}
          >
            {formatNumber(value, 2)}
          </text>
        );
      })}
      <path
        d={line(secondary)}
        fill="none"
        stroke="#e6ad80"
        strokeWidth="1.6"
        strokeDasharray="4 4"
      />
      <path
        d={line(points)}
        fill="none"
        stroke="#b5f6cd"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {marker && (
        <circle
          cx={x(marker.x)}
          cy={y(marker.y)}
          r="4.5"
          fill="#e6ad80"
          stroke="#171f1e"
          strokeWidth="2"
        />
      )}
      <text x={left} y="14">
        {unit}
      </text>
      <text x={(left + right) / 2} y="199" textAnchor="middle">
        {xLabel}
      </text>
    </svg>
  );
}
