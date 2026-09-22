import { findExperiment, type Params } from "./catalog";
import { lorentz } from "./math";
import { Simulation, type Metric, type Refinement } from "./simulation";

export function exactOscillator(
  params: Params,
  time: number,
): [number, number] {
  const { mass, k, damping, amplitude } = params;
  const omega2 = k / mass;
  const alpha = damping / (2 * mass);
  const discriminant = alpha * alpha - omega2;
  if (Math.abs(discriminant) <= 1e-12 * Math.max(alpha * alpha, omega2)) {
    const decay = amplitude * Math.exp(-alpha * time);
    return [decay * (1 + alpha * time), -decay * omega2 * time];
  }
  if (discriminant < 0) {
    const omega = Math.sqrt(-discriminant);
    const sine = Math.sin(omega * time) / omega;
    const decay = amplitude * Math.exp(-alpha * time);
    return [
      decay * (Math.cos(omega * time) + alpha * sine),
      -decay * omega2 * sine,
    ];
  }
  const root = Math.sqrt(discriminant);
  const slow = -omega2 / (alpha + root);
  const fast = -alpha - root;
  const a = Math.exp(slow * time);
  const b = Math.exp(fast * time);
  return [
    (amplitude * (-fast * a + slow * b)) / (slow - fast),
    (amplitude * omega2 * (b - a)) / (slow - fast),
  ];
}

function value(label: string, amount: number, unit = ""): Metric {
  return { label, value: amount, unit };
}

export function diagnose(simulation: Simulation): {
  metrics: Metric[];
  note: string;
} {
  const p = simulation.params;
  const energy = simulation.energy();
  const initial = simulation.initialEnergy;
  const energyDrift =
    initial === 0
      ? value("ΔE absoluta (E₀ = 0)", energy, "unidades del modelo")
      : value("ΔE / |E₀|", ((energy - initial) / Math.abs(initial)) * 100, "%");

  switch (simulation.experiment.id) {
    case "oscillator": {
      const [x, v] = exactOscillator(p, simulation.time);
      const exactEnergy = (p.mass * v * v + p.k * x * x) / 2;
      return {
        metrics: [
          value("|x − x exacta|", Math.abs(simulation.state[0] - x), "m"),
          value("|v − v exacta|", Math.abs(simulation.state[1] - v), "m/s"),
          value(
            "(E − E exacta) / E₀",
            ((energy - exactEnergy) / initial) * 100,
            "%",
          ),
          value(
            "Disipación física exacta / E₀",
            ((initial - exactEnergy) / initial) * 100,
            "%",
          ),
        ],
        note: "Referencia analítica con x(0) = A, v(0) = 0 en los tres regímenes de amortiguamiento. La pérdida física de energía se separa del error de integración.",
      };
    }
    case "orbit": {
      const [x, y, vx, vy] = simulation.state;
      const initialMomentum =
        Math.sqrt(4 * Math.PI ** 2 * p.star * p.radius) * p.speed;
      return {
        metrics: [
          energyDrift,
          value(
            "ΔL / L₀",
            ((x * vy - y * vx - initialMomentum) / initialMomentum) * 100,
            "%",
          ),
        ],
        note: "Energía específica y momento angular. Conservar invariantes no garantiza una fase orbital exacta.",
      };
    }
    case "chaos":
      return {
        metrics: [
          value(
            "ΔE / (3mgℓ)",
            ((energy - initial) / (3 * 9.81 * p.length)) * 100,
            "%",
          ),
        ],
        note: "Escala gravitatoria con m = 1 kg para evitar dividir por una energía inicial nula. La separación de trayectorias no es una estimación del error numérico.",
      };
    case "charge":
      return {
        metrics: [
          value(
            "(K − K₀ − qEΔy) / K₀",
            ((energy - initial - p.electric * simulation.state[1]) / initial) *
              100,
            "%",
          ),
        ],
        note: "Balance trabajo–energía: el campo eléctrico puede cambiar K. El campo magnético no realiza trabajo.",
      };
    case "gas":
      return {
        metrics: [energyDrift],
        note: "Reflexiones especulares elásticas y movimiento balístico; la temperatura se fija por la energía inicial. Semilla 42 en ambos casos.",
      };
    case "lorentz": {
      const event = lorentz(p.beta, p.eventX, p.eventT);
      return {
        metrics: [
          value(
            "|s′² − s²|",
            Math.abs(
              event.ct ** 2 - event.x ** 2 - (p.eventT ** 2 - p.eventX ** 2),
            ),
            "s-luz²",
          ),
        ],
        note: "Transformación analítica. Residuo absoluto del intervalo, válido también para sucesos con intervalo nulo.",
      };
    }
    case "packet":
    case "tunnel": {
      const wave = simulation.wave!;
      const edge = wave.x.reduce(
        (sum, x, i) =>
          sum + (Math.abs(x) >= 20 ? wave.density(i) * wave.dx : 0),
        0,
      );
      return {
        metrics: [
          value("|∫|ψ|² dx − 1|", Math.abs(wave.norm() - 1)),
          energyDrift,
          value("Probabilidad en |x| ≥ 20", edge * 100, "%"),
          value("k₀ Δx", p.momentum * wave.dx),
        ],
        note: `Δx = ${wave.dx}; ${wave.n} nodos; dominio [−24, 24]; bordes de Dirichlet. Norma y energía corresponden al Hamiltoniano discretizado: no validan la malla ni descartan reflexiones. Reducir h solo refina el tiempo.`,
      };
    }
    default:
      return {
        metrics: [],
        note: "Solución analítica: no hay paso de integración ni prueba de convergencia temporal. Las aproximaciones físicas se describen en los supuestos del modelo.",
      };
  }
}

export interface ConvergenceRow {
  refinement: Refinement;
  step: number;
  error: number;
  order: number | null;
}

export function oscillatorConvergence(params: Params): {
  duration: number;
  rows: ConvergenceRow[];
} {
  const duration = 2 * Math.PI * Math.sqrt(params.mass / params.k);
  const omega = Math.sqrt(params.k / params.mass);
  const exact = exactOscillator(params, duration);
  const rows: ConvergenceRow[] = [];
  for (const refinement of [1, 2, 4] as const) {
    const simulation = new Simulation(
      findExperiment("oscillator"),
      params,
      refinement,
    );
    simulation.advance(duration);
    const step = simulation.lastStep!;
    const error = Math.hypot(
      (simulation.state[0] - exact[0]) / params.amplitude,
      (simulation.state[1] - exact[1]) / (params.amplitude * omega),
    );
    const previous = rows.at(-1);
    const order =
      previous && previous.error > 1e-13 && error > 1e-13
        ? Math.log(previous.error / error) / Math.log(previous.step / step)
        : null;
    rows.push({ refinement, step, error, order });
  }
  return { duration, rows };
}
