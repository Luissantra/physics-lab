import { describe, expect, it } from "vitest";
import { defaults, experiments, findExperiment } from "./physics/catalog";
import { ComparisonSession, type CaseConfig } from "./physics/comparison";
import {
  comparisonCsv,
  comparisonQuery,
  initialExperiment,
  sanitizeParams,
} from "./storage";

describe("reproducción de configuraciones A/B", () => {
  it.each(experiments)(
    "recupera ambos casos y pasos de $id desde un enlace",
    (experiment) => {
      const a: CaseConfig = { params: defaults(experiment), refinement: 2 };
      const b: CaseConfig = {
        params: sanitizeParams(
          experiment,
          Object.fromEntries(
            experiment.controls.map((control) => [control.key, control.max]),
          ),
        ),
        refinement: 4,
      };
      const restored = initialExperiment(
        comparisonQuery(experiment, a, b).toString(),
      );
      expect(restored.experiment.id).toBe(experiment.id);
      expect(restored.params).toEqual(a.params);
      expect(restored.comparison).toEqual({ b, refinementA: a.refinement });
    },
  );

  it("valida también los parámetros B y rechaza refinamientos arbitrarios", () => {
    const restored = initialExperiment(
      "?experiment=oscillator&compare=1&mass=NaN&b.mass=-3&b.k=Infinity&b.damping=99&hA=0&hB=100000",
    );
    expect(restored.params.mass).toBe(1);
    expect(restored.comparison?.b.params.mass).toBe(0.2);
    expect(restored.comparison?.b.params.k).toBe(8);
    expect(restored.comparison?.b.params.damping).toBe(5);
    expect(restored.comparison?.refinementA).toBe(1);
    expect(restored.comparison?.b.refinement).toBe(1);
  });

  it("mantiene compatibles los enlaces individuales", () => {
    const restored = initialExperiment("?experiment=oscillator&mass=2");
    expect(restored.params.mass).toBe(2);
    expect(restored.comparison).toBeUndefined();
  });

  it("exporta configuración, errores, observables y coordenadas sin confundir A/B", () => {
    const experiment = findExperiment("oscillator");
    const session = new ComparisonSession(
      experiment,
      { params: defaults(experiment), refinement: 1 },
      { params: { ...defaults(experiment), damping: 0.5 }, refinement: 4 },
    );
    session.advance(2);
    const rows = comparisonCsv(session, 0);
    expect(rows).toContainEqual(["B", "Refinamiento temporal", 4, ""]);
    expect(rows).toContainEqual(["B", "Amortiguamiento", 0.5, "kg/s"]);
    const sample = session.history.at(-1)!;
    expect(rows).toContainEqual([
      2,
      "Posición",
      "m",
      sample.a[0].value,
      sample.b[0].value,
      sample.b[0].value - sample.a[0].value,
    ]);
    expect(rows).toContainEqual(["A", 2, session.a.state[0]]);
    expect(rows).toContainEqual(["B", 2, session.b.state[0]]);
    expect(
      rows
        .flat()
        .filter((cell) => typeof cell === "number")
        .every(Number.isFinite),
    ).toBe(true);
  });
});
