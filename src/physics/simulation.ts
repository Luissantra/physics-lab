import { type Experiment, type Params } from "./catalog";
import {
  ARGON_MASS,
  ELEMENTARY_CHARGE,
  KB,
  PROTON_MASS,
  R,
  carnotState,
  dipoleField,
  intensity,
  lorentz,
  pendulumDerivative,
  pendulumEnergy,
  rk4,
  seededRandom,
} from "./math";
import { WaveFunction } from "./quantum";

export interface Point {
  x: number;
  y: number;
  y2: number;
}
export interface Metric {
  label: string;
  value: number;
  unit: string;
}
export interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}
export interface Readout {
  metrics: Metric[];
  signals: [number, number];
  note: string;
}
const metric = (label: string, value: number, unit: string): Metric => ({
  label,
  value,
  unit,
});

export class Simulation {
  readonly experiment: Experiment;
  readonly params: Params;
  time = 0;
  state: number[] = [];
  comparison: number[] = [];
  particles: Particle[] = [];
  wave: WaveFunction | null = null;
  history: Point[] = [];
  trail: { x: number; y: number }[] = [];
  initialEnergy = 0;

  constructor(experiment: Experiment, params: Params) {
    this.experiment = experiment;
    this.params = { ...params };
    const p = this.params;
    switch (experiment.id) {
      case "oscillator":
        this.state = [p.amplitude, 0];
        break;
      case "orbit":
        this.state = [
          p.radius,
          0,
          0,
          Math.sqrt((4 * Math.PI ** 2 * p.star) / p.radius) * p.speed,
        ];
        break;
      case "chaos": {
        const angle = (p.angle * Math.PI) / 180;
        this.state = [angle, angle, 0, 0];
        this.comparison = [angle + (p.delta * Math.PI) / 180, angle, 0, 0];
        break;
      }
      case "charge":
        this.state = [0, 0, p.velocity * 1000, 0];
        break;
      case "gas":
        this.createGas();
        break;
      case "packet":
        this.wave = new WaveFunction(
          p.momentum,
          p.sigma,
          (x) => 0.5 * p.omega ** 2 * x * x,
        );
        break;
      case "tunnel":
        this.wave = new WaveFunction(p.momentum, p.sigma, (x) =>
          x >= -p.width / 2 - 1e-9 && x < p.width / 2 - 1e-9 ? p.barrier : 0,
        );
        break;
    }
    this.initialEnergy = this.energy();
    this.record();
  }

  get rate(): number {
    switch (this.experiment.id) {
      case "orbit":
        return 0.15;
      case "charge":
        return 5;
      case "gas":
        return 20;
      case "packet":
      case "tunnel":
        return 0.7;
      case "twin":
        return 0.7;
      default:
        return 1;
    }
  }

  get finished(): boolean {
    return (
      (this.wave !== null && this.time >= 8 - 1e-10) ||
      (this.experiment.id === "twin" && this.time >= this.params.duration)
    );
  }

  createGas(): void {
    const p = this.params;
    const random = seededRandom();
    const normal = () =>
      Math.sqrt(-2 * Math.log(random())) * Math.cos(2 * Math.PI * random());
    this.particles = Array.from({ length: p.count }, () => ({
      x: (random() - 0.5) * p.size,
      y: (random() - 0.5) * p.size,
      z: (random() - 0.5) * p.size,
      vx: normal(),
      vy: normal(),
      vz: normal(),
    }));
    const means = ["vx", "vy", "vz"].map(
      (key) =>
        this.particles.reduce(
          (sum, particle) => sum + particle[key as "vx" | "vy" | "vz"],
          0,
        ) / p.count,
    );
    this.particles.forEach((particle) => {
      particle.vx -= means[0];
      particle.vy -= means[1];
      particle.vz -= means[2];
    });
    const square = this.particles.reduce(
      (sum, particle) =>
        sum + particle.vx ** 2 + particle.vy ** 2 + particle.vz ** 2,
      0,
    );
    const scale =
      Math.sqrt((3 * p.count * KB * p.temperature) / (ARGON_MASS * square)) *
      1e-3;
    this.particles.forEach((particle) => {
      particle.vx *= scale;
      particle.vy *= scale;
      particle.vz *= scale;
    });
  }

  advance(dt: number): void {
    if (this.finished || dt <= 0) return;
    const p = this.params;
    const id = this.experiment.id;
    if (this.wave) dt = Math.min(dt, 8 - this.time);
    if (id === "twin") dt = Math.min(dt, p.duration - this.time);
    const maxStep =
      id === "orbit"
        ? 1 / 4000
        : id === "chaos"
          ? 1 / 480
          : id === "charge" || this.wave
            ? 0.01
            : id === "gas"
              ? 0.5
              : 1 / 240;
    const steps = Math.ceil(dt / maxStep);
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      switch (id) {
        case "oscillator":
          this.state = rk4(this.state, h, ([x, v]) => [
            v,
            -(p.k * x + p.damping * v) / p.mass,
          ]);
          break;
        case "orbit": {
          const [x, y, vx, vy] = this.state;
          const mu = 4 * Math.PI ** 2 * p.star;
          const r3 = Math.hypot(x, y) ** 3;
          const nx = x + vx * h - (((mu * x) / r3) * h * h) / 2;
          const ny = y + vy * h - (((mu * y) / r3) * h * h) / 2;
          const nr3 = Math.hypot(nx, ny) ** 3;
          this.state = [
            nx,
            ny,
            vx - ((mu * h) / 2) * (x / r3 + nx / nr3),
            vy - ((mu * h) / 2) * (y / r3 + ny / nr3),
          ];
          break;
        }
        case "chaos":
          this.state = rk4(this.state, h, (s) =>
            pendulumDerivative(s, p.length),
          );
          this.comparison = rk4(this.comparison, h, (s) =>
            pendulumDerivative(s, p.length),
          );
          break;
        case "charge": {
          const seconds = h * 1e-6;
          const acceleration = ELEMENTARY_CHARGE / PROTON_MASS;
          const [x, y, vx, vy] = this.state;
          const minusY = vy + (acceleration * p.electric * seconds) / 2;
          const t = (acceleration * p.magnetic * 1e-3 * seconds) / 2;
          const s = (2 * t) / (1 + t * t);
          const primeX = vx + minusY * t;
          const primeY = minusY - vx * t;
          const newX = vx + primeY * s;
          const newY =
            minusY - primeX * s + (acceleration * p.electric * seconds) / 2;
          this.state = [
            x + ((vx + newX) * seconds) / 2,
            y + ((vy + newY) * seconds) / 2,
            newX,
            newY,
          ];
          break;
        }
        case "gas":
          for (const particle of this.particles) {
            for (const [position, velocity] of [
              ["x", "vx"],
              ["y", "vy"],
              ["z", "vz"],
            ] as const) {
              particle[position] += particle[velocity] * h;
              while (
                particle[position] > p.size / 2 ||
                particle[position] < -p.size / 2
              ) {
                if (particle[position] > p.size / 2) {
                  particle[position] = p.size - particle[position];
                  particle[velocity] *= -1;
                }
                if (particle[position] < -p.size / 2) {
                  particle[position] = -p.size - particle[position];
                  particle[velocity] *= -1;
                }
              }
            }
          }
          break;
        case "packet":
        case "tunnel":
          this.wave?.step(h);
          break;
      }
    }
    this.time = Math.min(
      this.time + dt,
      this.wave ? 8 : id === "twin" ? p.duration : Infinity,
    );
    this.record();
  }

  energy(): number {
    const p = this.params,
      s = this.state;
    switch (this.experiment.id) {
      case "oscillator":
        return 0.5 * p.mass * s[1] ** 2 + 0.5 * p.k * s[0] ** 2;
      case "orbit":
        return (
          (s[2] ** 2 + s[3] ** 2) / 2 -
          (4 * Math.PI ** 2 * p.star) / Math.hypot(s[0], s[1])
        );
      case "chaos":
        return pendulumEnergy(s, p.length);
      case "charge":
        return (
          (0.5 * PROTON_MASS * (s[2] ** 2 + s[3] ** 2)) / ELEMENTARY_CHARGE
        );
      case "gas":
        return this.particles.reduce(
          (sum, particle) =>
            sum +
            0.5 *
              ARGON_MASS *
              1e6 *
              (particle.vx ** 2 + particle.vy ** 2 + particle.vz ** 2),
          0,
        );
      case "packet":
      case "tunnel":
        return this.wave?.energy() ?? 0;
      default:
        return 0;
    }
  }

  read(): Readout {
    const p = this.params,
      s = this.state,
      t = this.time;
    switch (this.experiment.id) {
      case "oscillator": {
        const kinetic = (p.mass * s[1] ** 2) / 2,
          potential = (p.k * s[0] ** 2) / 2;
        return {
          metrics: [
            metric("Posición", s[0], "m"),
            metric("Velocidad", s[1], "m/s"),
            metric("Energía total", kinetic + potential, "J"),
            metric(
              "Período natural",
              2 * Math.PI * Math.sqrt(p.mass / p.k),
              "s",
            ),
          ],
          signals: [kinetic, potential],
          note: p.damping
            ? "Sistema disipativo · dE/dt = −bv²"
            : `Deriva relativa de E: ${((this.energy() / this.initialEnergy - 1) * 100).toExponential(1)} %`,
        };
      }
      case "orbit": {
        const kinetic = (s[2] ** 2 + s[3] ** 2) / 2,
          potential = (-4 * Math.PI ** 2 * p.star) / Math.hypot(s[0], s[1]);
        return {
          metrics: [
            metric("Distancia", Math.hypot(s[0], s[1]), "UA"),
            metric("Rapidez", Math.hypot(s[2], s[3]), "UA/año"),
            metric("Energía específica", kinetic + potential, "UA²/año²"),
            metric("Momento angular", s[0] * s[3] - s[1] * s[2], "UA²/año"),
          ],
          signals: [kinetic, potential],
          note: `Deriva relativa de E: ${(Math.abs((this.energy() - this.initialEnergy) / this.initialEnergy) * 100).toExponential(1)} %`,
        };
      }
      case "chaos": {
        const other = this.comparison;
        const separation =
          p.length *
          Math.hypot(
            Math.sin(s[0]) +
              Math.sin(s[1]) -
              Math.sin(other[0]) -
              Math.sin(other[1]),
            Math.cos(s[0]) +
              Math.cos(s[1]) -
              Math.cos(other[0]) -
              Math.cos(other[1]),
          );
        return {
          metrics: [
            metric("Ángulo θ₁", (s[0] * 180) / Math.PI, "°"),
            metric("Ángulo θ₂", (s[1] * 180) / Math.PI, "°"),
            metric("Separación", separation, "m"),
            metric("Energía A", this.energy(), "J"),
          ],
          signals: [this.energy(), pendulumEnergy(other, p.length)],
          note: "Verde: sistema A · naranja: perturbación inicial",
        };
      }
      case "interference": {
        const spacing = (p.lambda * 1e-9 * p.screen) / (p.separation * 1e-3);
        const fresnel =
          (p.width * p.separation * 1e-3) ** 2 / (p.lambda * 1e-9 * p.screen);
        return {
          metrics: [
            metric("Separación de franjas ≈", spacing * 1000, "mm"),
            metric("Ancho de rendija", p.width * p.separation, "mm"),
            metric(
              "Frecuencia óptica",
              299792458 / (p.lambda * 1e-9) / 1e12,
              "THz",
            ),
            metric("Número de Fresnel", fresnel, ""),
          ],
          signals: [1, 1],
          note:
            fresnel > 0.1
              ? "Aviso: a²/(λL) > 0,1; el campo lejano pierde precisión."
              : "Campo lejano · frentes de onda a velocidad ilustrativa",
        };
      }
      case "wave": {
        const speed = Math.sqrt(p.tension / p.density),
          frequency = (p.mode * speed) / (2 * p.length);
        return {
          metrics: [
            metric("Frecuencia", frequency, "Hz"),
            metric("Longitud de onda", (2 * p.length) / p.mode, "m"),
            metric("Velocidad de onda", speed, "m/s"),
            metric("Nodos (con extremos)", p.mode + 1, ""),
          ],
          signals: [0.2 * Math.cos(2 * Math.PI * frequency * t), 0],
          note: "Extremos fijos · solución analítica sin pérdidas",
        };
      }
      case "charge":
        return {
          metrics: [
            metric("Energía cinética", this.energy(), "eV"),
            metric(
              "Radio inicial (E = 0)",
              (PROTON_MASS * p.velocity * 1e3) /
                (ELEMENTARY_CHARGE * p.magnetic * 1e-3),
              "m",
            ),
            metric(
              "Período ciclotrón",
              ((2 * Math.PI * PROTON_MASS) /
                (ELEMENTARY_CHARGE * p.magnetic * 1e-3)) *
                1e6,
              "μs",
            ),
            metric(
              "Deriva E × B",
              p.electric / (p.magnetic * 1e-3) / 1000,
              "km/s",
            ),
          ],
          signals: [s[2] / 1000, s[3] / 1000],
          note: "Protón · Bz saliendo del plano · trayectoria en metros",
        };
      case "dipole": {
        const field = dipoleField(p.probe, p.height, p.q, p.distance);
        return {
          metrics: [
            metric("Campo |E|", Math.hypot(field.ex, field.ey), "N/C"),
            metric("Potencial", field.potential, "V"),
            metric("Componente Ex", field.ex, "N/C"),
            metric("Componente Ey", field.ey, "N/C"),
          ],
          signals: [field.ex, field.ey],
          note: "Campo estático · flechas normalizadas · sonda controlada por x e y",
        };
      }
      case "gas": {
        const vrms = Math.sqrt((2 * this.energy()) / (p.count * ARGON_MASS));
        return {
          metrics: [
            metric(
              "Presión",
              (p.count * KB * p.temperature) / (p.size * 1e-9) ** 3 / 1000,
              "kPa",
            ),
            metric("Rapidez RMS", vrms, "m/s"),
            metric("Energía interna", this.energy() / ELEMENTARY_CHARGE, "eV"),
            metric(
              "ΔS / kB (V₀: 20³ nm³)",
              p.count * Math.log((p.size / 20) ** 3),
              "",
            ),
          ],
          signals: [vrms, 0],
          note: "Proyección XY de un gas 3D · paredes elásticas · semilla 42",
        };
      }
      case "carnot": {
        const current = carnotState((t / 3) % 4, p.hot, p.cold, p.ratio);
        const heat = R * p.hot * Math.log(p.ratio);
        return {
          metrics: [
            metric("Eficiencia", (1 - p.cold / p.hot) * 100, "%"),
            metric("Trabajo por ciclo", heat * (1 - p.cold / p.hot), "J"),
            metric("Calor absorbido", heat, "J"),
            metric("Temperatura actual", current.temperature, "K"),
          ],
          signals: [current.pressure / 1000, current.volume * 1000],
          note: [
            "1 / 4 · Expansión isotérmica",
            "2 / 4 · Expansión adiabática",
            "3 / 4 · Compresión isotérmica",
            "4 / 4 · Compresión adiabática",
          ][current.stage],
        };
      }
      case "lorentz": {
        const event = lorentz(p.beta, p.eventX, p.eventT);
        const interval = p.eventT ** 2 - p.eventX ** 2;
        return {
          metrics: [
            metric("Factor γ", event.gamma, ""),
            metric("Posición x′", event.x, "s-luz"),
            metric("Tiempo t′", event.ct, "s"),
            metric("Intervalo s²", interval, "s-luz²"),
          ],
          signals: [event.ct, event.x],
          note: `Intervalo ${Math.abs(interval) < 1e-8 ? "nulo" : interval > 0 ? "temporal" : "espacial"} · invariante de Lorentz`,
        };
      }
      case "twin": {
        const gamma = lorentz(p.beta, 0, 0).gamma;
        return {
          metrics: [
            metric("Reloj terrestre", t, "años"),
            metric("Reloj de la nave", t / gamma, "años"),
            metric("Diferencia acumulada", t - t / gamma, "años"),
            metric(
              "Distancia a la Tierra",
              p.beta * Math.min(t, p.duration - t),
              "año-luz",
            ),
          ],
          signals: [t, t / gamma],
          note: this.finished
            ? "Reencuentro · reinicia para repetir el viaje"
            : t < p.duration / 2
              ? "Tramo de ida · velocidad +βc"
              : "Tramo de vuelta · velocidad −βc",
        };
      }
      case "packet":
      case "tunnel": {
        const wave = this.wave!;
        return {
          metrics: [
            metric("Norma ∫|ψ|² dx", wave.norm(), ""),
            metric("Posición media ⟨x⟩", wave.meanX(), "a.u."),
            metric("Energía media ⟨H⟩", wave.energy(), "a.u."),
            this.experiment.id === "tunnel"
              ? metric(
                  "Probabilidad a la derecha",
                  wave.probabilityRight(p.width / 2) * 100,
                  "%",
                )
              : metric("Dispersión σx", Math.sqrt(wave.variance()), "a.u."),
          ],
          signals: [wave.norm(), wave.meanX()],
          note: this.finished
            ? "Fin de la ventana t = 8 · reinicia el experimento"
            : "ℏ = m = 1 · Δx = 0,1 · Crank–Nicolson · sin renormalización",
        };
      }
    }
  }

  record(): void {
    const values = this.read();
    this.history.push({
      x: this.time,
      y: values.signals[0],
      y2: values.signals[1],
    });
    if (this.history.length > 400) this.history.shift();
    if (["orbit", "charge"].includes(this.experiment.id))
      this.trail.push({ x: this.state[0], y: this.state[1] });
    if (this.experiment.id === "chaos")
      this.trail.push({
        x: Math.sin(this.state[0]) + Math.sin(this.state[1]),
        y: -Math.cos(this.state[0]) - Math.cos(this.state[1]),
      });
    if (this.trail.length > 600) this.trail.shift();
  }

  chart(): { points: Point[]; xLabel: string } {
    const p = this.params;
    switch (this.experiment.id) {
      case "interference":
        return {
          xLabel: "Posición y (mm)",
          points: Array.from({ length: 301 }, (_, i) => {
            const x = -15 + i / 10;
            const [y, y2] = intensity(
              x / 1000,
              p.lambda,
              p.separation,
              p.width,
              p.screen,
            );
            return { x, y, y2 };
          }),
        };
      case "wave":
        return {
          xLabel: "Posición x (m)",
          points: Array.from({ length: 201 }, (_, i) => {
            const x = (p.length * i) / 200;
            const envelope =
              i === 0 || i === 200
                ? 0
                : 0.2 * Math.sin((p.mode * Math.PI * x) / p.length);
            return {
              x,
              y:
                envelope === 0
                  ? 0
                  : envelope *
                    Math.cos(
                      ((p.mode * Math.PI) / p.length) *
                        Math.sqrt(p.tension / p.density) *
                        this.time,
                    ),
              y2: Math.abs(envelope),
            };
          }),
        };
      case "dipole":
        return {
          xLabel: "Posición x (m)",
          points: Array.from({ length: 151 }, (_, i) => {
            const x = -3 + i / 25;
            return {
              x,
              y: dipoleField(x, p.height, p.q, p.distance).potential,
              y2: 0,
            };
          }),
        };
      case "gas": {
        const thermal = Math.sqrt((KB * p.temperature) / ARGON_MASS);
        const width = (thermal * 5) / 24;
        const bins = new Array<number>(24).fill(0);
        this.particles.forEach((particle) => {
          const bin = Math.floor(
            (Math.hypot(particle.vx, particle.vy, particle.vz) * 1000) / width,
          );
          if (bin < bins.length) bins[bin]++;
        });
        return {
          xLabel: "Rapidez (m/s)",
          points: bins.map((value, i) => {
            const x = (i + 0.5) * width;
            return {
              x,
              y: value / p.count,
              y2:
                ((Math.sqrt(2 / Math.PI) * x * x) / thermal ** 3) *
                Math.exp((-x * x) / (2 * thermal ** 2)) *
                width,
            };
          }),
        };
      }
      case "carnot":
        return {
          xLabel: "Volumen (L)",
          points: Array.from({ length: 241 }, (_, i) => {
            const s = carnotState(
              i === 240 ? 0 : i / 60,
              p.hot,
              p.cold,
              p.ratio,
            );
            return { x: s.volume * 1000, y: s.pressure / 1000, y2: NaN };
          }),
        };
      case "lorentz":
        return {
          xLabel: "Velocidad relativa β",
          points: Array.from({ length: 191 }, (_, i) => {
            const x = -0.95 + i / 100;
            const event = lorentz(x, p.eventX, p.eventT);
            return { x, y: event.ct, y2: event.x };
          }),
        };
      case "packet":
      case "tunnel": {
        const wave = this.wave!;
        const maxV = Math.max(...wave.potential, 1);
        return {
          xLabel: "Posición x (a.u.) · V normalizado a 0,35",
          points: wave.x.map((x, i) => ({
            x,
            y: wave.density(i),
            y2: (wave.potential[i] / maxV) * 0.35,
          })),
        };
      }
      default:
        return {
          xLabel: `Tiempo (${this.experiment.timeUnit})`,
          points: this.history,
        };
    }
  }
}
