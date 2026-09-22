import type { Experiment, Params } from "./catalog";
import {
  Simulation,
  type Metric,
  type Point,
  type Refinement,
} from "./simulation";

export interface CaseConfig {
  params: Params;
  refinement: Refinement;
}

export interface ComparisonSample {
  time: number;
  a: Metric[];
  b: Metric[];
}

export class ComparisonSession {
  readonly a: Simulation;
  readonly b: Simulation;
  readonly history: ComparisonSample[] = [];

  constructor(experiment: Experiment, a: CaseConfig, b: CaseConfig) {
    this.a = new Simulation(experiment, a.params, a.refinement);
    this.b = new Simulation(experiment, b.params, b.refinement);
    this.record();
  }

  get time(): number {
    return this.a.time;
  }

  get endTime(): number {
    return Math.min(this.a.endTime, this.b.endTime);
  }

  get finished(): boolean {
    return this.time >= this.endTime;
  }

  advance(dt: number): void {
    if (this.finished || !Number.isFinite(dt) || dt <= 0) return;
    const duration = Math.min(dt, this.endTime - this.time);
    this.a.advance(duration);
    this.b.advance(duration);
    this.record();
  }

  private record(): void {
    this.history.push({
      time: this.time,
      a: this.a.read().metrics,
      b: this.b.read().metrics,
    });
    if (this.history.length > 400) this.history.shift();
  }
}

export function comparisonPlot(
  session: ComparisonSession,
  observable: number | "profile",
): {
  a: Point[];
  b: Point[];
  xLabel: string;
  unit: string;
  label: string;
} {
  const experiment = session.a.experiment;
  if (observable !== "profile") {
    const metric = session.a.read().metrics[observable];
    const series = (key: "a" | "b") =>
      session.history.map((sample) => ({
        x: sample.time,
        y: sample[key][observable].value,
        y2: 0,
      }));
    return {
      a: series("a"),
      b: series("b"),
      xLabel: `t (${experiment.timeUnit})`,
      unit: metric.unit,
      label: metric.label,
    };
  }
  const a = session.a.chart();
  const b = session.b.chart();
  if (experiment.id === "gas") {
    const density = (points: Point[]) => {
      const width = points[1].x - points[0].x;
      return points.map((point) => ({ ...point, y: point.y / width }));
    };
    return {
      a: density(a.points),
      b: density(b.points),
      xLabel: a.xLabel,
      unit: "(m/s)⁻¹",
      label: "Densidad de probabilidad de rapidez",
    };
  }
  return {
    a: a.points,
    b: b.points,
    xLabel: session.a.wave ? "Posición x (a.u.)" : a.xLabel,
    unit: experiment.chartUnit,
    label: experiment.series[0],
  };
}
