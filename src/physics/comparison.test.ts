import { describe, expect, it } from "vitest";
import { defaults, experiments, findExperiment } from "./catalog";
import { ComparisonSession, comparisonPlot } from "./comparison";

describe("comparación sincronizada", () => {
  it.each(experiments)("comparte el reloj y las unidades en $id", (model) => {
    const session = new ComparisonSession(
      model,
      { params: defaults(model), refinement: 1 },
      { params: defaults(model), refinement: 4 },
    );
    for (const dt of [0.016, 0.041, 0.023, 0.2]) session.advance(dt);
    expect(session.a.time).toBe(session.b.time);
    expect(session.time).toBeCloseTo(0.28, 12);
    expect(session.history.map((point) => point.time)).toHaveLength(5);
    for (const sample of session.history) {
      expect(sample.a.map((metric) => metric.unit)).toEqual(
        sample.b.map((metric) => metric.unit),
      );
      expect(
        [...sample.a, ...sample.b].every((metric) =>
          Number.isFinite(metric.value),
        ),
      ).toBe(true);
    }
  });

  it("detiene ambos casos en el primer reencuentro aunque B dure más", () => {
    const model = findExperiment("twin");
    const session = new ComparisonSession(
      model,
      { params: { ...defaults(model), duration: 3 }, refinement: 1 },
      { params: { ...defaults(model), duration: 8 }, refinement: 1 },
    );
    session.advance(2.7);
    session.advance(10);
    expect(session.time).toBe(3);
    expect(session.b.time).toBe(3);
    expect(session.finished).toBe(true);
    session.advance(1);
    expect(session.history).toHaveLength(3);
  });

  it("conserva energía en A y disipa en B sin compartir parámetros", () => {
    const model = findExperiment("oscillator");
    const params = defaults(model);
    const session = new ComparisonSession(
      model,
      { params, refinement: 1 },
      { params: { ...params, damping: 0.5 }, refinement: 2 },
    );
    params.mass = 5;
    session.advance(4);
    expect(session.a.params.mass).toBe(1);
    expect(session.a.energy()).toBeCloseTo(session.a.initialEnergy, 7);
    expect(session.b.energy()).toBeLessThan(session.a.energy() / 2);
    expect(session.b.lastStep!).toBeLessThanOrEqual(session.a.lastStep! / 2);
  });

  it("ignora duraciones inválidas y acota las muestras", () => {
    const model = findExperiment("oscillator");
    const config = { params: defaults(model), refinement: 1 } as const;
    const session = new ComparisonSession(model, config, config);
    for (const dt of [NaN, Infinity, -1, 0]) session.advance(dt);
    expect(session.time).toBe(0);
    expect(session.history).toHaveLength(1);
    for (let i = 0; i < 450; i++) session.advance(0.01);
    expect(session.history).toHaveLength(400);
    expect(session.history.at(-1)?.time).toBe(session.time);
  });

  it("conserva las coordenadas al superponer cuerdas de longitudes distintas", () => {
    const model = findExperiment("wave");
    const session = new ComparisonSession(
      model,
      { params: { ...defaults(model), length: 2 }, refinement: 1 },
      { params: { ...defaults(model), length: 4 }, refinement: 1 },
    );
    const profile = comparisonPlot(session, "profile");
    expect(profile.a.at(-1)?.x).toBe(2);
    expect(profile.b.at(-1)?.x).toBe(4);
    expect(profile.unit).toBe("m");
  });

  it("compara densidades de rapidez con intervalos de anchura distinta", () => {
    const model = findExperiment("gas");
    const session = new ComparisonSession(
      model,
      { params: { ...defaults(model), temperature: 100 }, refinement: 1 },
      { params: { ...defaults(model), temperature: 400 }, refinement: 1 },
    );
    const profile = comparisonPlot(session, "profile");
    for (const points of [profile.a, profile.b]) {
      const width = points[1].x - points[0].x;
      expect(
        points.reduce((sum, point) => sum + point.y * width, 0),
      ).toBeCloseTo(1, 12);
    }
    expect(profile.b[5].x).toBeCloseTo(profile.a[5].x * 2, 12);
    expect(profile.b[5].y).toBeCloseTo(profile.a[5].y / 2, 12);
  });

  it("detiene la pareja cuántica exactamente en su límite", () => {
    const model = findExperiment("packet");
    const session = new ComparisonSession(
      model,
      { params: defaults(model), refinement: 1 },
      { params: { ...defaults(model), momentum: 3 }, refinement: 2 },
    );
    session.advance(7.99);
    session.advance(0.1);
    expect(session.a.time).toBe(8);
    expect(session.b.time).toBe(8);
    expect(session.finished).toBe(true);
    expect(session.a.wave!.norm()).toBeCloseTo(1, 10);
    expect(session.b.wave!.norm()).toBeCloseTo(1, 10);
  });
});
