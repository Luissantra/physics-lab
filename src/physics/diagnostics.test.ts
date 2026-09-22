import { describe, expect, it } from "vitest";
import { defaults, experiments, findExperiment, type Params } from "./catalog";
import {
  diagnose,
  exactOscillator,
  oscillatorConvergence,
} from "./diagnostics";
import { Simulation } from "./simulation";

const oscillator = findExperiment("oscillator");

describe("referencia analítica y rigor numérico", () => {
  it.each([0, 0.7, 2, 4])("resuelve el oscilador con b = %s", (damping) => {
    const params: Params = { ...defaults(oscillator), k: 1, damping };
    expect(exactOscillator(params, 0)[0]).toBeCloseTo(params.amplitude, 14);
    expect(Math.abs(exactOscillator(params, 0)[1])).toBe(0);
    const sim = new Simulation(oscillator, params, 4);
    sim.advance(2.3);
    const exact = exactOscillator(params, sim.time);
    expect(sim.state[0]).toBeCloseTo(exact[0], 10);
    expect(sim.state[1]).toBeCloseTo(exact[1], 10);
    const epsilon = 1e-4;
    const before = exactOscillator(params, 2.3 - epsilon);
    const after = exactOscillator(params, 2.3 + epsilon);
    expect((after[0] - before[0]) / (2 * epsilon)).toBeCloseTo(exact[1], 7);
    expect((after[1] - before[1]) / (2 * epsilon)).toBeCloseTo(
      -exact[0] - damping * exact[1],
      7,
    );
  });

  it("coincide con las soluciones cerradas ideal y crítica", () => {
    const params = { ...defaults(oscillator), k: 1, mass: 1 };
    expect(exactOscillator(params, Math.PI)[0]).toBeCloseTo(-1, 14);
    const critical = exactOscillator({ ...params, damping: 2 }, 1);
    expect(critical[0]).toBeCloseTo(2 / Math.E, 14);
    expect(critical[1]).toBeCloseTo(-1 / Math.E, 14);
    expect(
      exactOscillator({ ...params, damping: 5 }, 1000).every(Number.isFinite),
    ).toBe(true);
  });

  it("es continua alrededor del amortiguamiento crítico", () => {
    const params = { ...defaults(oscillator), k: 1, damping: 2 };
    const critical = exactOscillator(params, 3);
    for (const damping of [2 - 1e-7, 2 + 1e-7]) {
      const near = exactOscillator({ ...params, damping }, 3);
      expect(near[0]).toBeCloseTo(critical[0], 6);
      expect(near[1]).toBeCloseTo(critical[1], 6);
    }
  });

  it("separa la disipación física del error frente a E exacta", () => {
    const sim = new Simulation(oscillator, {
      ...defaults(oscillator),
      damping: 0.8,
    });
    sim.advance(3);
    const metrics = diagnose(sim).metrics;
    expect(Math.abs(metrics[2].value)).toBeLessThan(1e-6);
    expect(metrics[3].value).toBeGreaterThan(80);
  });

  it("observa orden cuatro con el mismo integrador que la simulación", () => {
    const study = oscillatorConvergence(defaults(oscillator));
    expect(study.rows).toHaveLength(3);
    for (const row of study.rows.slice(1)) {
      expect(row.order).not.toBeNull();
      expect(row.order!).toBeGreaterThan(3.8);
      expect(row.order!).toBeLessThan(4.2);
    }
    expect(study.rows[2].error).toBeLessThan(study.rows[0].error / 200);
  });

  it("el balance electromagnético incluye el trabajo eléctrico", () => {
    const model = findExperiment("charge");
    const sim = new Simulation(model, { ...defaults(model), electric: 120 });
    sim.advance(2);
    expect(Math.abs(diagnose(sim).metrics[0].value)).toBeLessThan(1e-9);
  });

  it("el intervalo nulo no genera un error relativo indefinido", () => {
    const model = findExperiment("lorentz");
    const sim = new Simulation(model, {
      ...defaults(model),
      eventX: 1,
      eventT: 1,
    });
    expect(diagnose(sim).metrics[0].value).toBeCloseTo(0, 12);
  });

  it.each(experiments)("produce diagnósticos finitos para $id", (model) => {
    const sim = new Simulation(model, defaults(model));
    sim.advance(0.3);
    expect(
      diagnose(sim).metrics.every((metric) => Number.isFinite(metric.value)),
    ).toBe(true);
  });
});
