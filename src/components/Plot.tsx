import { useId } from "react";
import type { Point } from "../physics/simulation";

export function formatNumber(value: number, digits = 3): string {
  if (!Number.isFinite(value)) return "—";
  if (
    Math.abs(value) > 0 &&
    (Math.abs(value) < 0.001 || Math.abs(value) >= 100000)
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
}: {
  points: Point[];
  xLabel: string;
  unit: string;
  labels: [string, string];
  marker?: { x: number; y: number };
}) {
  const id = useId();
  const finite = points
    .flatMap((point) => [point.y, point.y2])
    .filter(Number.isFinite);
  const xmin = points.length ? Math.min(...points.map((point) => point.x)) : 0;
  const xmax = Math.max(...points.map((point) => point.x), xmin + 0.01);
  const ymin = Math.min(...finite, 0),
    ymax = Math.max(...finite, ymin + 0.001);
  const padding = (ymax - ymin) * 0.12;
  const min = ymin < 0 ? ymin - padding : ymin,
    max = ymax + padding;
  const x = (v: number) => 54 + ((v - xmin) / (xmax - xmin)) * 594;
  const y = (v: number) => 155 - ((v - min) / (max - min)) * 127;
  const line = (key: "y" | "y2") =>
    points
      .filter((point) => Number.isFinite(point[key]))
      .map(
        (point, i) =>
          `${i ? "L" : "M"}${x(point.x).toFixed(2)},${y(point[key]).toFixed(2)}`,
      )
      .join(" ");
  return (
    <svg className="plot" viewBox="0 0 675 204" role="img" aria-labelledby={id}>
      <title id={id}>
        {labels[0]} y {labels[1]}. Eje horizontal: {xLabel}. Eje vertical:{" "}
        {unit}.
      </title>
      {[0, 1, 2, 3].map((index) => {
        const value = min + ((max - min) * index) / 3;
        return (
          <g key={index}>
            <line
              x1="54"
              x2="648"
              y1={y(value)}
              y2={y(value)}
              className="plot-grid"
            />
            <text x="43" y={y(value) + 4} textAnchor="end">
              {formatNumber(value, 2)}
            </text>
          </g>
        );
      })}
      {[0, 1, 2, 3, 4].map((index) => {
        const value = xmin + ((xmax - xmin) * index) / 4;
        return (
          <text key={index} x={x(value)} y="177" textAnchor="middle">
            {formatNumber(value, 2)}
          </text>
        );
      })}
      <path
        d={line("y2")}
        fill="none"
        stroke="#e6ad80"
        strokeWidth="1.6"
        strokeDasharray="4 4"
      />
      <path
        d={line("y")}
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
      <text x="54" y="14">
        {unit}
      </text>
      <text x="351" y="199" textAnchor="middle">
        {xLabel}
      </text>
    </svg>
  );
}
