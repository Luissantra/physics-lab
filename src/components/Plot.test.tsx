import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Plot from "./Plot";

describe("Etiquetas de ejes cuantitativos", () => {
  it.each([
    [0, 0.0032],
    [-0.0032, 0.0032],
  ])("distingue las marcas entre %s y %s", (minimum, maximum) => {
    const markup = renderToStaticMarkup(
      <Plot
        points={[
          { x: 0, y: minimum, y2: minimum },
          { x: 1000, y: maximum, y2: maximum },
        ]}
        xLabel="Rapidez (m/s)"
        unit="(m/s)⁻¹"
        labels={["A", "B"]}
      />,
    );
    const ticks = [...markup.matchAll(/<text x="43"[^>]*>(.*?)<\/text>/g)].map(
      (match) => Number(match[1].replace(",", ".")),
    );
    expect(ticks).toHaveLength(4);
    expect(new Set(ticks).size).toBe(4);
    expect(ticks[0]).toBeLessThanOrEqual(minimum);
    expect(ticks.at(-1)).toBeGreaterThan(maximum);
    expect(ticks.every(Number.isFinite)).toBe(true);
  });
});
