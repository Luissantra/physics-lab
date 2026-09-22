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
    const labels = [
      ...markup.matchAll(
        /class="plot-tick-y" x="([\d.]+)"[^>]*>(.*?)<\/text>/g,
      ),
    ];
    const ticks = labels.map((match) => Number(match[2].replace(",", ".")));
    expect(ticks).toHaveLength(4);
    expect(new Set(ticks).size).toBe(4);
    expect(ticks[0]).toBeLessThanOrEqual(minimum);
    expect(ticks.at(-1)).toBeGreaterThan(maximum);
    expect(ticks.every(Number.isFinite)).toBe(true);
    const anchor = Number(labels[0][1]);
    const widest = Math.max(...labels.map((match) => match[2].length));
    expect(anchor).toBeGreaterThanOrEqual(widest * 5.4);
  });
});
