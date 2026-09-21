import {
  defaults,
  findExperiment,
  type Experiment,
  type Params,
} from "./physics/catalog";
import type { Metric } from "./physics/simulation";

export interface Measurement {
  id: string;
  experimentId: string;
  title: string;
  time: number;
  timeUnit: string;
  created: string;
  params: Params;
  metrics: Metric[];
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function loadMeasurements(): Measurement[] {
  try {
    const data: unknown = JSON.parse(
      localStorage.getItem("physica-notebook") ?? "[]",
    );
    if (!Array.isArray(data)) return [];
    return data.filter(
      (item): item is Measurement =>
        record(item) &&
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        typeof item.experimentId === "string" &&
        typeof item.time === "number" &&
        typeof item.timeUnit === "string" &&
        typeof item.created === "string" &&
        record(item.params) &&
        Object.values(item.params).every(
          (v) => typeof v === "number" && Number.isFinite(v),
        ) &&
        Array.isArray(item.metrics) &&
        item.metrics.every(
          (m) =>
            record(m) &&
            typeof m.label === "string" &&
            typeof m.value === "number" &&
            typeof m.unit === "string",
        ),
    );
  } catch {
    return [];
  }
}

export function sanitizeParams(experiment: Experiment, input: Params): Params {
  return Object.fromEntries(
    experiment.controls.map((control) => {
      const value = input[control.key];
      const clamped = Number.isFinite(value)
        ? Math.min(control.max, Math.max(control.min, value))
        : control.value;
      const aligned =
        control.min +
        Math.round((clamped - control.min) / control.step) * control.step;
      return [control.key, Number(aligned.toFixed(8))];
    }),
  );
}

export function initialExperiment(): {
  experiment: Experiment;
  params: Params;
} {
  const search = new URLSearchParams(window.location.search);
  const experiment = findExperiment(search.get("experiment") ?? "");
  const params = defaults(experiment);
  for (const control of experiment.controls) {
    const raw = search.get(control.key);
    if (raw !== null && raw.trim() !== "" && Number.isFinite(Number(raw)))
      params[control.key] = Number(raw);
  }
  return { experiment, params: sanitizeParams(experiment, params) };
}

export function downloadCsv(name: string, rows: (string | number)[][]): void {
  const cell = (value: string | number): string => {
    const raw =
      typeof value === "number"
        ? Number.isFinite(value)
          ? String(value)
          : ""
        : value;
    const safe =
      typeof value === "string" && /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const blob = new Blob(
    ["\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n")],
    { type: "text/csv;charset=utf-8" },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
