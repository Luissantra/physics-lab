export const KB = 1.380649e-23;
export const ARGON_MASS = 39.948 * 1.6605390666e-27;
export const PROTON_MASS = 1.672621924e-27;
export const ELEMENTARY_CHARGE = 1.602176634e-19;
export const R = 8.314462618;

export function rk4(
  state: number[],
  dt: number,
  derivative: (state: number[]) => number[],
): number[] {
  const a = derivative(state);
  const b = derivative(state.map((v, i) => v + (dt * a[i]) / 2));
  const c = derivative(state.map((v, i) => v + (dt * b[i]) / 2));
  const d = derivative(state.map((v, i) => v + dt * c[i]));
  return state.map(
    (v, i) => v + (dt * (a[i] + 2 * b[i] + 2 * c[i] + d[i])) / 6,
  );
}

export function pendulumDerivative(s: number[], length: number): number[] {
  const [a, b, u, v] = s;
  const diff = a - b;
  const denominator = length * (3 - Math.cos(2 * diff));
  return [
    u,
    v,
    (-3 * 9.81 * Math.sin(a) -
      9.81 * Math.sin(a - 2 * b) -
      2 * Math.sin(diff) * (v * v * length + u * u * length * Math.cos(diff))) /
      denominator,
    (2 *
      Math.sin(diff) *
      (2 * u * u * length +
        2 * 9.81 * Math.cos(a) +
        v * v * length * Math.cos(diff))) /
      denominator,
  ];
}

export function pendulumEnergy(s: number[], length: number): number {
  const [a, b, u, v] = s;
  return (
    length * length * (u * u + (v * v) / 2 + u * v * Math.cos(a - b)) -
    9.81 * length * (2 * Math.cos(a) + Math.cos(b))
  );
}

export function lorentz(
  beta: number,
  x: number,
  ct: number,
): { x: number; ct: number; gamma: number } {
  const gamma = 1 / Math.sqrt(1 - beta * beta);
  return { x: gamma * (x - beta * ct), ct: gamma * (ct - beta * x), gamma };
}

export function dipoleField(
  x: number,
  y: number,
  q: number,
  distance: number,
): { ex: number; ey: number; potential: number } {
  let ex = 0,
    ey = 0,
    potential = 0;
  for (const sign of [1, -1]) {
    const dx = x + (sign * distance) / 2;
    const r = Math.hypot(dx, y);
    if (r < 1e-10) return { ex: NaN, ey: NaN, potential: NaN };
    const coefficient = 8.9875517923 * q * sign;
    ex += (coefficient * dx) / r ** 3;
    ey += (coefficient * y) / r ** 3;
    potential += coefficient / r;
  }
  return { ex, ey, potential };
}

export function intensity(
  y: number,
  lambdaNm: number,
  separationMm: number,
  widthRatio: number,
  screen: number,
): [number, number] {
  const sin = y / Math.hypot(y, screen);
  const phase = (Math.PI * separationMm * 1e-3 * sin) / (lambdaNm * 1e-9);
  const argument = phase * widthRatio;
  const envelope =
    Math.abs(argument) < 1e-10 ? 1 : (Math.sin(argument) / argument) ** 2;
  return [Math.cos(phase) ** 2 * envelope, envelope];
}

export function carnotState(
  phase: number,
  hot: number,
  cold: number,
  ratio: number,
): { volume: number; pressure: number; temperature: number; stage: number } {
  const stage = Math.min(3, Math.floor(phase));
  const u = phase - stage;
  const expansion = (hot / cold) ** 1.5;
  let volume: number, temperature: number;
  if (stage === 0) {
    volume = 0.01 * ratio ** u;
    temperature = hot;
  } else if (stage === 1) {
    volume = 0.01 * ratio * expansion ** u;
    temperature = hot * expansion ** ((-2 * u) / 3);
  } else if (stage === 2) {
    volume = 0.01 * expansion * ratio ** (1 - u);
    temperature = cold;
  } else {
    volume = 0.01 * expansion ** (1 - u);
    temperature = cold * expansion ** ((2 * u) / 3);
  }
  return { volume, pressure: (R * temperature) / volume, temperature, stage };
}

export function seededRandom(seed = 42): () => number {
  let value = seed;
  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return ((value >>> 0) + 0.5) / 4294967296;
  };
}
