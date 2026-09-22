import {
  defaults,
  findExperiment,
  type Experiment,
  type Params,
} from "./physics/catalog";
import type { Metric } from "./physics/simulation";
import type { CaseConfig, ComparisonSession } from "./physics/comparison";
import { comparisonPlot } from "./physics/comparison";
import { diagnose } from "./physics/diagnostics";

export interface ComparisonInitial {
  b: CaseConfig;
  refinementA: CaseConfig["refinement"];
}

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

export function initialExperiment(searchString = window.location.search): {
  experiment: Experiment;
  params: Params;
  comparison?: ComparisonInitial;
} {
  const search = new URLSearchParams(searchString);
  const experiment = findExperiment(search.get("experiment") ?? "");
  const params = defaults(experiment);
  for (const control of experiment.controls) {
    const raw = search.get(control.key);
    if (raw !== null && raw.trim() !== "" && Number.isFinite(Number(raw)))
      params[control.key] = Number(raw);
  }
  const clean = sanitizeParams(experiment, params);
  if (search.get("compare") !== "1") return { experiment, params: clean };
  const secondary = { ...clean };
  for (const control of experiment.controls) {
    const raw = search.get(`b.${control.key}`);
    if (raw !== null && raw.trim() !== "" && Number.isFinite(Number(raw)))
      secondary[control.key] = Number(raw);
  }
  const refinement = (key: string): CaseConfig["refinement"] => {
    const amount = Number(search.get(key));
    return amount === 2 || amount === 4 ? amount : 1;
  };
  return {
    experiment,
    params: clean,
    comparison: {
      b: {
        params: sanitizeParams(experiment, secondary),
        refinement: refinement("hB"),
      },
      refinementA: refinement("hA"),
    },
  };
}

export function comparisonQuery(
  experiment: Experiment,
  a: CaseConfig,
  b: CaseConfig,
): URLSearchParams {
  const search = new URLSearchParams({
    experiment: experiment.id,
    compare: "1",
    hA: String(a.refinement),
    hB: String(b.refinement),
  });
  for (const control of experiment.controls) {
    search.set(control.key, String(a.params[control.key]));
    search.set(`b.${control.key}`, String(b.params[control.key]));
  }
  return search;
}

export function comparisonCsv(
  session: ComparisonSession,
  observable: number | "profile" = 0,
): (string | number)[][] {
  const experiment = session.a.experiment;
  const rows: (string | number)[][] = [
    ["PHYSICA", experiment.id, "Comparación A/B"],
    ["Tiempo final", session.time, experiment.timeUnit],
    ["Método", experiment.method],
    ["Supuestos", experiment.assumptions],
    ["Historial", "Últimas 400 muestras; muestreo visual variable"],
    ["Enlace", "Condiciones iniciales; reinicia en t = 0"],
    ["Caso", "Parámetro", "Valor", "Unidad"],
  ];
  for (const [name, simulation] of [
    ["A", session.a],
    ["B", session.b],
  ] as const) {
    for (const control of experiment.controls)
      rows.push([
        name,
        control.label,
        simulation.params[control.key],
        control.unit,
      ]);
    rows.push([name, "Refinamiento temporal", simulation.refinement, ""]);
    rows.push([
      name,
      "Paso máximo",
      simulation.maxStep ?? "analítico",
      experiment.timeUnit,
    ]);
    rows.push([
      name,
      "Último subpaso",
      simulation.lastStep ?? "sin integrar",
      experiment.timeUnit,
    ]);
    for (const metric of diagnose(simulation).metrics)
      rows.push([name, metric.label, metric.value, metric.unit]);
  }
  rows.push(
    [],
    [`t (${experiment.timeUnit})`, "Magnitud", "Unidad", "A", "B", "B − A"],
  );
  for (const sample of session.history) {
    sample.a.forEach((metric, i) => {
      rows.push([
        sample.time,
        metric.label,
        metric.unit,
        metric.value,
        sample.b[i].value,
        sample.b[i].value - metric.value,
      ]);
    });
  }
  const plot = comparisonPlot(session, observable);
  rows.push(
    [],
    ["Gráfica actual", plot.label],
    ["Caso", plot.xLabel, plot.unit],
  );
  for (const [name, points] of [
    ["A", plot.a],
    ["B", plot.b],
  ] as const)
    for (const point of points) rows.push([name, point.x, point.y]);
  return rows;
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
