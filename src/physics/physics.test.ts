import { describe, expect, it } from "vitest";
import { defaults, experiments, findExperiment } from "./catalog";
import {
  ARGON_MASS,
  KB,
  carnotState,
  dipoleField,
  intensity,
  lorentz,
} from "./math";
import { WaveFunction } from "./quantum";
import { Simulation } from "./simulation";
import { sanitizeParams } from "../storage";

function model(id: string, overrides: Record<string, number> = {}) {
  const experiment = findExperiment(id);
  return new Simulation(experiment, { ...defaults(experiment), ...overrides });
}

describe("Mecánica clásica", () => {
  it("recupera la posición inicial después del período analítico del oscilador", () => {
    const sim = model("oscillator");
    sim.advance((2 * Math.PI) / Math.sqrt(8));
    expect(sim.state[0]).toBeCloseTo(1, 7);
    expect(sim.state[1]).toBeCloseTo(0, 7);
    expect(sim.energy()).toBeCloseTo(sim.initialEnergy, 7);
  });
  it("disipa energía monótonamente con rozamiento viscoso", () => {
    const sim = model("oscillator", { damping: 1 });
    let previous = sim.energy();
    for (let i = 0; i < 40; i++) {
      sim.advance(0.1);
      expect(sim.energy()).toBeLessThanOrEqual(previous + 1e-10);
      previous = sim.energy();
    }
    expect(sim.energy()).toBeLessThan(sim.initialEnergy * 0.04);
  });
  it("cierra la órbita de una unidad astronómica en un año", () => {
    const sim = model("orbit");
    sim.advance(1);
    expect(Math.hypot(sim.state[0] - 1, sim.state[1])).toBeLessThan(0.00001);
    expect(Math.abs(sim.energy() - sim.initialEnergy)).toBeLessThan(0.00001);
    expect(
      sim.state[0] * sim.state[3] - sim.state[1] * sim.state[2],
    ).toBeCloseTo(2 * Math.PI, 10);
  });
  it("conserva energía incluso en una órbita excéntrica", () => {
    const sim = model("orbit", { speed: 0.55, radius: 0.5, star: 2 });
    for (let i = 0; i < 100; i++) sim.advance(0.01);
    expect(
      Math.abs((sim.energy() - sim.initialEnergy) / sim.initialEnergy),
    ).toBeLessThan(0.005);
  });
  it("conserva la energía del péndulo doble y separa trayectorias próximas", () => {
    const sim = model("chaos");
    sim.advance(8);
    expect(Math.abs(sim.energy() - sim.initialEnergy)).toBeLessThan(0.0001);
    expect(Math.abs(sim.state[0] - sim.comparison[0])).toBeGreaterThan(0.005);
  });
});

describe("Ondas y electromagnetismo", () => {
  it("normaliza el máximo central y reproduce el primer mínimo de interferencia", () => {
    expect(intensity(0, 550, 0.3, 0.2, 1.5)).toEqual([1, 1]);
    const sine = 550e-9 / (2 * 0.3e-3);
    const y = (1.5 * sine) / Math.sqrt(1 - sine * sine);
    expect(intensity(y, 550, 0.3, 0.2, 1.5)[0]).toBeLessThan(1e-20);
  });
  it("mantiene nodos fijos en los extremos de la cuerda", () => {
    const sim = model("wave");
    sim.advance(0.137);
    const points = sim.chart().points;
    expect(points[0].y).toBe(0);
    expect(Math.abs(points.at(-1)!.y)).toBeLessThan(1e-14);
    expect(sim.read().metrics[0].value).toBeCloseTo(2);
  });
  it("el dipolo tiene potencial nulo y campo no nulo en la mediatriz", () => {
    const field = dipoleField(0, 0.8, 3, 1);
    expect(field.potential).toBe(0);
    expect(field.ey).toBe(0);
    expect(field.ex).toBeGreaterThan(0);
    const dx = 1e-5;
    const derivative =
      (dipoleField(dx, 0.8, 3, 1).potential -
        dipoleField(-dx, 0.8, 3, 1).potential) /
      (2 * dx);
    expect(field.ex).toBeCloseTo(-derivative, 6);
  });
  it("Boris conserva la energía cinética en un campo puramente magnético", () => {
    const sim = model("charge");
    const period = sim.read().metrics[2].value;
    sim.advance(period);
    expect(Math.abs(sim.energy() / sim.initialEnergy - 1)).toBeLessThan(1e-11);
    expect(Math.hypot(sim.state[0], sim.state[1])).toBeLessThan(0.00001);
  });
  it("el campo eléctrico realiza el trabajo q Ey Δy", () => {
    const sim = model("charge", { electric: 200 });
    sim.advance(20);
    expect(sim.energy() - sim.initialEnergy).toBeCloseTo(200 * sim.state[1], 7);
  });
});

describe("Termodinámica", () => {
  it("prepara la temperatura correcta y conserva energía en las paredes", () => {
    const sim = model("gas");
    const expected = 1.5 * sim.params.count * KB * sim.params.temperature;
    expect(sim.energy() / expected).toBeCloseTo(1, 12);
    sim.advance(150);
    expect(sim.energy() / expected).toBeCloseTo(1, 12);
    for (const particle of sim.particles) {
      expect(
        Math.max(
          Math.abs(particle.x),
          Math.abs(particle.y),
          Math.abs(particle.z),
        ),
      ).toBeLessThanOrEqual(sim.params.size / 2);
    }
    expect(sim.read().metrics[1].value).toBeCloseTo(
      Math.sqrt((3 * KB * 300) / ARGON_MASS),
      9,
    );
  });
  it("cumple la ley de Boyle a temperatura y número constantes", () => {
    const a = model("gas", { size: 20 });
    const b = model("gas", { size: 40 });
    expect(a.read().metrics[0].value / b.read().metrics[0].value).toBeCloseTo(
      8,
      12,
    );
    expect(b.read().metrics[3].value).toBeCloseTo(160 * Math.log(8), 10);
  });
  it("reproduce la misma microconfiguración con la semilla fija", () => {
    expect(model("gas").particles).toEqual(model("gas").particles);
  });
  it("el ciclo de Carnot es continuo en sus cuatro transiciones", () => {
    for (const boundary of [1, 2, 3, 4]) {
      const a = carnotState(boundary - 1e-9, 600, 300, 2);
      const b = carnotState(boundary % 4, 600, 300, 2);
      expect(a.volume).toBeCloseTo(b.volume, 8);
      expect(a.temperature).toBeCloseTo(b.temperature, 5);
    }
    expect(model("carnot").read().metrics[0].value).toBe(50);
  });
  it("el área P–V coincide con el trabajo neto de Carnot", () => {
    let work = 0;
    let previous = carnotState(0, 600, 300, 2);
    for (let i = 1; i <= 4000; i++) {
      const current = carnotState(i === 4000 ? 0 : i / 1000, 600, 300, 2);
      work +=
        ((current.pressure + previous.pressure) / 2) *
        (current.volume - previous.volume);
      previous = current;
    }
    expect(work).toBeCloseTo(model("carnot").read().metrics[1].value, 2);
  });
});

describe("Relatividad", () => {
  it.each([-0.95, -0.3, 0, 0.6, 0.95])(
    "conserva el intervalo y tiene transformación inversa para β = %s",
    (beta) => {
      const event = lorentz(beta, 1.7, 3.1);
      expect(event.ct ** 2 - event.x ** 2).toBeCloseTo(3.1 ** 2 - 1.7 ** 2, 11);
      const back = lorentz(-beta, event.x, event.ct);
      expect(back.x).toBeCloseTo(1.7, 12);
      expect(back.ct).toBeCloseTo(3.1, 12);
    },
  );
  it("el gemelo viajero envejece seis años en diez años terrestres a 0,8c", () => {
    const sim = model("twin");
    sim.advance(12);
    expect(sim.finished).toBe(true);
    expect(sim.time).toBe(10);
    expect(sim.read().metrics[1].value).toBeCloseTo(6, 12);
    expect(sim.read().metrics[3].value).toBe(0);
  });
});

describe("Mecánica cuántica", () => {
  it("la gaussiana inicial está normalizada y tiene la posición y anchura esperadas", () => {
    const wave = new WaveFunction(1.5, 1, () => 0);
    expect(wave.norm()).toBeCloseTo(1, 13);
    expect(wave.meanX()).toBeCloseTo(-7, 12);
    expect(wave.variance()).toBeCloseTo(1, 12);
  });
  it("Crank–Nicolson conserva norma y energía sin renormalizar", () => {
    const wave = new WaveFunction(2, 1.2, (x) => (Math.abs(x) < 0.4 ? 3 : 0));
    const energy = wave.energy();
    for (let i = 0; i < 800; i++) wave.step(0.01);
    expect(wave.norm()).toBeCloseTo(1, 11);
    expect(wave.energy()).toBeCloseTo(energy, 10);
  });
  it("el paquete libre sigue el teorema de Ehrenfest y se dispersa", () => {
    const wave = new WaveFunction(1.5, 1, () => 0);
    for (let i = 0; i < 100; i++) wave.step(0.01);
    expect(Math.abs(wave.meanX() - (-7 + 1.5))).toBeLessThan(0.015);
    expect(Math.abs(wave.variance() - 1.25)).toBeLessThan(0.02);
  });
  it("una barrera más ancha reduce la transmisión para los paquetes de referencia", () => {
    const narrow = model("tunnel", { width: 0.4 });
    const wide = model("tunnel", { width: 2 });
    narrow.advance(8);
    wide.advance(8);
    const pn = narrow.wave!.probabilityRight(0.2);
    const pw = wide.wave!.probabilityRight(1);
    expect(pn).toBeGreaterThan(pw);
    expect(pn).toBeGreaterThan(0.01);
    expect(pw).toBeGreaterThan(0);
    expect(narrow.finished).toBe(true);
  });
});

describe("Catálogo y límites de controles", () => {
  it.each(experiments)(
    "mantiene magnitudes finitas en $id con parámetros extremos",
    (experiment) => {
      for (const side of ["min", "max"] as const) {
        const params = Object.fromEntries(
          experiment.controls.map((control) => [control.key, control[side]]),
        );
        const sim = new Simulation(experiment, params);
        sim.advance(sim.rate / 2);
        expect(
          sim.read().metrics.every((item) => Number.isFinite(item.value)),
        ).toBe(true);
        expect(
          sim
            .chart()
            .points.every(
              (point) => Number.isFinite(point.x) && Number.isFinite(point.y),
            ),
        ).toBe(true);
        if (sim.wave) expect(sim.wave.norm()).toBeCloseTo(1, 10);
      }
    },
  );
  it("los enlaces compartidos se limitan al intervalo y paso de cada control", () => {
    const experiment = findExperiment("wave");
    expect(
      sanitizeParams(experiment, {
        mode: 2.2,
        length: -50,
        tension: 1e9,
        density: NaN,
      }),
    ).toEqual({ mode: 2, length: 1, tension: 30, density: 0.5 });
  });
});
