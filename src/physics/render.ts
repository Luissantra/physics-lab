import { carnotState, dipoleField, intensity } from "./math";
import { type Simulation } from "./simulation";

const mint = "#b5f6cd",
  orange = "#f4b88a",
  blue = "#91b7e8";
export interface DisplayOptions {
  grid: boolean;
  vectors: boolean;
  trace: boolean;
}

export function renderSimulation(
  canvas: HTMLCanvasElement,
  simulation: Simulation,
  options: DisplayOptions,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const width = canvas.clientWidth,
    height = canvas.clientHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (
    canvas.width !== Math.round(width * dpr) ||
    canvas.height !== Math.round(height * dpr)
  ) {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  const w = width,
    h = height,
    cx = w / 2,
    cy = h / 2;
  ctx.font = "11px ui-monospace, monospace";
  const line = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color = "#33413f",
    thickness = 1,
  ) => {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };
  const label = (text: string, x: number, y: number, color = "#869591") => {
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  };
  const dot = (
    x: number,
    y: number,
    radius: number,
    color = mint,
    glow = false,
  ) => {
    ctx.beginPath();
    ctx.fillStyle = color;
    if (glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 24;
    }
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.shadowBlur = 0;
  };
  const arrow = (
    x: number,
    y: number,
    dx: number,
    dy: number,
    color = orange,
  ) => {
    if (Math.hypot(dx, dy) < 3) return;
    line(x, y, x + dx, y + dy, color, 1.5);
    const a = Math.atan2(dy, dx);
    line(
      x + dx,
      y + dy,
      x + dx - 6 * Math.cos(a - 0.4),
      y + dy - 6 * Math.sin(a - 0.4),
      color,
      1.5,
    );
    line(
      x + dx,
      y + dy,
      x + dx - 6 * Math.cos(a + 0.4),
      y + dy - 6 * Math.sin(a + 0.4),
      color,
      1.5,
    );
  };
  const path = (
    points: { x: number; y: number }[],
    color: string,
    thickness = 1.5,
  ) => {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
  };
  if (options.grid) {
    for (let x = cx % 32; x < w; x += 32)
      for (let y = cy % 32; y < h; y += 32) dot(x, y, 0.8, "#2c3735");
  }
  const p = simulation.params,
    s = simulation.state,
    t = simulation.time;
  switch (simulation.experiment.id) {
    case "oscillator": {
      const scale = Math.min(w / 6.5, 75);
      const equilibrium = w * 0.58;
      const x = equilibrium + s[0] * scale,
        y = cy + 3;
      const wall = w * 0.12,
        left = x - 23;
      ctx.fillStyle = "#253330";
      ctx.fillRect(wall - 12, y - 54, 12, 116);
      for (let i = 0; i < 10; i++)
        line(wall - 12, y - 50 + i * 12, wall, y - 62 + i * 12, "#65736b");
      line(wall, y + 29, w - 38, y + 29, "#4e6158");
      line(wall, y, wall + 17, y, mint, 2);
      const spring = [{ x: wall + 17, y }];
      for (let i = 0; i <= 24; i++)
        spring.push({
          x: wall + 22 + ((left - wall - 32) * i) / 24,
          y: y + (i === 0 || i === 24 ? 0 : i % 2 ? -12 : 12),
        });
      spring.push({ x: left, y });
      path(spring, mint, 2);
      ctx.fillStyle = "#aee6c1";
      ctx.shadowBlur = 30;
      ctx.shadowColor = "#b5f6cd30";
      ctx.beginPath();
      ctx.roundRect(x - 23, y - 24, 46, 48, 8);
      ctx.fill();
      ctx.shadowBlur = 0;
      label("m", x - 4, y + 5, "#1c382b");
      ctx.setLineDash([4, 5]);
      line(equilibrium, y - 74, equilibrium, y + 84, "#66786b");
      ctx.setLineDash([]);
      label("equilibrio", equilibrium - 29, y + 103);
      for (let i = -2; i <= 2; i++) {
        const tick = equilibrium + i * scale;
        if (tick > wall && tick < w - 20) {
          line(tick, y + 50, tick, y + 55);
          label(`${i}`, tick - 3, y + 70);
        }
      }
      label("x (m)", w - 48, y + 70);
      label(`k = ${p.k.toFixed(1)} N/m`, wall + 18, y - 37);
      label(`m = ${p.mass.toFixed(1)} kg`, x - 32, y - 45, mint);
      if (options.vectors) {
        arrow(x, y - 67, s[1] * 22, 0, blue);
        arrow(x, y + 5, -p.k * s[0] * 5, 0);
        label("v", x + s[1] * 22, y - 77, blue);
      }
      break;
    }
    case "orbit": {
      const bound =
        Math.max(
          2,
          ...simulation.trail.map((point) => Math.hypot(point.x, point.y)),
        ) * 1.15;
      const scale = Math.min(w, h) / (2 * bound);
      for (const r of [0.5, 1, 1.5, 2]) {
        ctx.beginPath();
        ctx.strokeStyle = "#2d3c36";
        ctx.setLineDash([3, 6]);
        ctx.arc(cx, cy, r * scale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (options.trace)
        path(
          simulation.trail.map((point) => ({
            x: cx + point.x * scale,
            y: cy - point.y * scale,
          })),
          "#b5f6cd88",
        );
      dot(cx, cy, 13, orange, true);
      label(`${p.star} M☉`, cx + 19, cy + 4, orange);
      const x = cx + s[0] * scale,
        y = cy - s[1] * scale;
      line(cx, cy, x, y, "#43574b");
      dot(x, y, 7, mint, true);
      if (options.vectors) arrow(x, y, s[2] * 5, -s[3] * 5, blue);
      label(`Radio de referencia: 1 UA`, 25, h - 25);
      break;
    }
    case "chaos": {
      const scale = Math.min(w / 5, h / 5),
        origin = h * 0.43;
      if (options.trace)
        path(
          simulation.trail.map((point) => ({
            x: cx + point.x * scale,
            y: origin - point.y * scale,
          })),
          "#b5f6cd40",
        );
      [simulation.comparison, s].forEach((state, i) => {
        const color = i ? mint : orange;
        const x1 = cx + scale * Math.sin(state[0]),
          y1 = origin + scale * Math.cos(state[0]);
        const x2 = x1 + scale * Math.sin(state[1]),
          y2 = y1 + scale * Math.cos(state[1]);
        line(cx, origin, x1, y1, color, 2);
        line(x1, y1, x2, y2, color, 2);
        dot(x1, y1, 7, color);
        dot(x2, y2, 10, color, i === 1);
      });
      dot(cx, origin, 4, "#cad5cf");
      label(`L₁ = L₂ = ${p.length} m`, 24, h - 24);
      break;
    }
    case "interference": {
      const wall = w * 0.29,
        screenX = w * 0.85,
        slit1 = cy - 25,
        slit2 = cy + 25;
      ctx.save();
      ctx.beginPath();
      ctx.rect(20, 20, wall - 22, h - 40);
      ctx.clip();
      for (let i = 0; i < 18; i++) {
        const x = wall - ((i * 24 - t * 30) % (w + 24));
        line(x, 20, x, h - 20, "#b5f6cd45");
      }
      ctx.restore();
      ctx.fillStyle = "#627368";
      ctx.fillRect(wall, 20, 4, h - 40);
      ctx.fillStyle = "#13201c";
      ctx.fillRect(wall - 1, slit1 - 6, 6, 12);
      ctx.fillRect(wall - 1, slit2 - 6, 6, 12);
      ctx.save();
      ctx.beginPath();
      ctx.rect(wall + 4, 20, screenX - wall - 4, h - 40);
      ctx.clip();
      [slit1, slit2].forEach((y, source) => {
        for (let i = 0; i < 20; i++) {
          ctx.beginPath();
          ctx.strokeStyle = source ? "#91b7e830" : "#b5f6cd35";
          ctx.arc(
            wall,
            y,
            (t * 30 + i * 24) % (w + 50),
            -Math.PI / 2,
            Math.PI / 2,
          );
          ctx.stroke();
        }
      });
      ctx.restore();
      for (let y = 28; y < h - 28; y++) {
        const position = ((y - cy) / (h - 56)) * 0.03;
        const [value] = intensity(
          position,
          p.lambda,
          p.separation,
          p.width,
          p.screen,
        );
        ctx.fillStyle = `hsla(${270 - ((p.lambda - 380) / 370) * 270},85%,72%,${0.04 + value * 0.96})`;
        ctx.fillRect(screenX, y, 15, 1);
      }
      label("fuente", 25, h - 9);
      label("rendijas", wall - 25, h - 9);
      label("pantalla", screenX - 16, h - 9);
      label("Esquema · distancias no a escala", 22, 17);
      break;
    }
    case "wave": {
      const x0 = 35,
        usable = w - 70;
      line(x0, cy, w - 35, cy, "#4c6257");
      const frequency =
        ((p.mode * Math.PI) / p.length) * Math.sqrt(p.tension / p.density);
      const points = Array.from({ length: 250 }, (_, i) => ({
        x: x0 + (i / 249) * usable,
        y:
          cy -
          Math.sin((p.mode * Math.PI * i) / 249) *
            Math.cos(frequency * t) *
            h *
            0.29,
      }));
      path(points, mint, 2.5);
      if (options.vectors) {
        path(
          Array.from({ length: 250 }, (_, i) => ({
            x: x0 + (i / 249) * usable,
            y:
              cy -
              Math.sin((p.mode * Math.PI * i) / 249 - frequency * t) *
                h *
                0.145,
          })),
          "#91b7e87f",
        );
        path(
          Array.from({ length: 250 }, (_, i) => ({
            x: x0 + (i / 249) * usable,
            y:
              cy -
              Math.sin((p.mode * Math.PI * i) / 249 + frequency * t) *
                h *
                0.145,
          })),
          "#f4b88a7f",
        );
      }
      for (let i = 0; i <= p.mode; i++) {
        dot(x0 + (i / p.mode) * usable, cy, 4, orange);
        label("nodo", x0 + (i / p.mode) * usable - 12, cy + 24, "#bd9478");
      }
      label("0", x0, h - 25);
      label(`${p.length} m`, w - 64, h - 25);
      label("Amplitud máxima: 0,2 m", 24, 26);
      break;
    }
    case "charge": {
      const radius = PROTON_RADIUS(p.velocity, p.magnetic);
      const bound = Math.max(
        radius * 2.4,
        0.45,
        ...simulation.trail.map((point) => Math.abs(point.x) * 1.2),
        ...simulation.trail.map((point) => Math.abs(point.y) * 1.2),
      );
      const scale = Math.min(w, h) / (2 * bound);
      for (let x = 35; x < w; x += 50)
        for (let y = 40; y < h; y += 50) {
          ctx.beginPath();
          ctx.strokeStyle = "#30403a";
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.stroke();
          dot(x, y, 1, "#536b5c");
        }
      if (options.trace)
        path(
          simulation.trail.map((point) => ({
            x: cx + point.x * scale,
            y: cy - point.y * scale,
          })),
          "#b5f6cd99",
          2,
        );
      const x = cx + s[0] * scale,
        y = cy - s[1] * scale;
      dot(x, y, 8, mint, true);
      if (options.vectors) arrow(x, y, s[2] / 3000, -s[3] / 3000, blue);
      label(`Bz = ${p.magnetic} mT · saliendo del plano`, 24, 25);
      label(`Escala horizontal: ${(w / scale).toFixed(2)} m`, 24, h - 22);
      break;
    }
    case "dipole": {
      const scale = Math.min(w / 6, h / 4.5);
      for (let px = 25; px < w - 15; px += 31)
        for (let py = 28; py < h - 15; py += 31) {
          const x = (px - cx) / scale,
            y = (cy - py) / scale;
          if (
            Math.hypot(x + p.distance / 2, y) < 0.2 ||
            Math.hypot(x - p.distance / 2, y) < 0.2
          )
            continue;
          const field = dipoleField(x, y, p.q, p.distance),
            mag = Math.hypot(field.ex, field.ey);
          arrow(
            px,
            py,
            (field.ex / mag) * 18,
            (-field.ey / mag) * 18,
            "#6caa8890",
          );
        }
      dot(cx - (p.distance / 2) * scale, cy, 15, orange, true);
      label("+", cx - (p.distance / 2) * scale - 3, cy + 4, "#28322a");
      dot(cx + (p.distance / 2) * scale, cy, 15, blue, true);
      label("−", cx + (p.distance / 2) * scale - 3, cy + 4, "#28322a");
      const x = cx + p.probe * scale,
        y = cy - p.height * scale;
      dot(x, y, 5, mint);
      label("sonda", x + 10, y - 7, mint);
      line(x - 10, y, x + 10, y, mint);
      line(x, y - 10, x, y + 10, mint);
      break;
    }
    case "gas": {
      const size = Math.min(w - 90, h - 70),
        left = cx - size / 2,
        top = cy - size / 2;
      ctx.strokeStyle = "#597161";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(left, top, size, size);
      for (const particle of simulation.particles) {
        const speed = Math.hypot(particle.vx, particle.vy, particle.vz);
        dot(
          cx + (particle.x / p.size) * size,
          cy + (particle.y / p.size) * size,
          1.5 + (particle.z / p.size + 0.5) * 1.5,
          speed > 0.6 ? orange : mint,
        );
      }
      label(`${p.size} nm`, cx - 18, top + size + 23);
      label("Proyección XY · 3 dimensiones", 24, 20);
      break;
    }
    case "carnot": {
      const current = carnotState((t / 3) % 4, p.hot, p.cold, p.ratio);
      const maxVolume = 0.01 * p.ratio * (p.hot / p.cold) ** 1.5;
      const cylinderWidth = w * 0.43,
        left = cx - cylinderWidth / 2,
        bottom = h - 63;
      const pistonY =
        bottom - ((current.volume / maxVolume) * 0.6 + 0.15) * (h - 70);
      ctx.fillStyle = "#b5f6cd0d";
      ctx.fillRect(left, pistonY, cylinderWidth, bottom - pistonY);
      line(left, 32, left, bottom, "#738c7b", 3);
      line(left, bottom, left + cylinderWidth, bottom, "#738c7b", 3);
      line(
        left + cylinderWidth,
        bottom,
        left + cylinderWidth,
        32,
        "#738c7b",
        3,
      );
      ctx.fillStyle = "#9aa99b";
      ctx.fillRect(left, pistonY - 8, cylinderWidth, 9);
      ctx.fillRect(cx - 4, 20, 8, Math.max(0, pistonY - 28));
      const color = current.stage < 2 ? orange : blue;
      for (let i = 0; i < 32; i++) {
        const x = left + 15 + ((i * 37 + t * 23) % (cylinderWidth - 30));
        const y =
          pistonY +
          12 +
          ((i * 31 + t * 35) % Math.max(1, bottom - pistonY - 24));
        dot(x, y, 2, color);
      }
      label(
        `T = ${current.temperature.toFixed(0)} K`,
        left + 14,
        bottom - 17,
        color,
      );
      label(
        `V = ${(current.volume * 1000).toFixed(1)} L`,
        left + 10,
        bottom + 24,
      );
      label(
        `${(current.pressure / 1000).toFixed(1)} kPa`,
        left + cylinderWidth + 12,
        pistonY,
        mint,
      );
      break;
    }
    case "lorentz": {
      const scale = Math.min(w / 9, h / 6),
        ox = cx,
        oy = h * 0.78;
      line(25, oy, w - 25, oy, "#586d61");
      line(ox, h - 15, ox, 20, "#586d61");
      label("x (s-luz)", w - 86, oy + 20);
      label("ct", ox + 9, 22);
      line(
        ox - 4.5 * scale,
        oy + 4.5 * scale,
        ox + 4.5 * scale,
        oy - 4.5 * scale,
        "#f4b88a65",
      );
      line(
        ox + 4.5 * scale,
        oy + 4.5 * scale,
        ox - 4.5 * scale,
        oy - 4.5 * scale,
        "#f4b88a65",
      );
      line(ox, oy, ox + p.beta * 4.5 * scale, oy - 4.5 * scale, mint, 1.5);
      line(
        ox - 4 * scale,
        oy + p.beta * 4 * scale,
        ox + 4 * scale,
        oy - p.beta * 4 * scale,
        blue,
        1.5,
      );
      label("ct′", ox + p.beta * 4 * scale + 7, oy - 4 * scale, mint);
      label("x′", ox + 3.6 * scale, oy - p.beta * 3.6 * scale - 8, blue);
      const eventX = ox + p.eventX * scale,
        eventY = oy - p.eventT * scale;
      ctx.setLineDash([3, 5]);
      line(eventX, eventY, eventX, oy, "#607668");
      line(eventX, eventY, ox, eventY, "#607668");
      ctx.setLineDash([]);
      dot(eventX, eventY, 6, orange, true);
      label("suceso A", eventX + 12, eventY - 8, orange);
      const pulse = t % 3.8;
      dot(ox + pulse * scale, oy - pulse * scale, 3, orange);
      dot(ox - pulse * scale, oy - pulse * scale, 3, orange);
      break;
    }
    case "twin": {
      const ox = w * 0.25,
        oy = h - 35,
        scaleT = (h - 70) / p.duration,
        scaleX = (w * 0.5) / (p.duration * 0.5);
      line(ox, oy, ox, 22, "#556c5d");
      line(ox - 20, oy, w - 30, oy, "#556c5d");
      label("t (años)", ox - 65, 25);
      label("x (año-luz)", w - 102, oy + 23);
      ctx.setLineDash([4, 5]);
      path(
        [
          { x: ox, y: oy },
          {
            x: ox + ((p.beta * p.duration) / 2) * scaleX,
            y: oy - (p.duration / 2) * scaleT,
          },
          { x: ox, y: oy - p.duration * scaleT },
        ],
        "#b5f6cd50",
      );
      ctx.setLineDash([]);
      line(ox, oy, ox, oy - t * scaleT, blue, 3);
      const x = ox + p.beta * Math.min(t, p.duration - t) * scaleX,
        y = oy - t * scaleT;
      const points = [{ x: ox, y: oy }];
      if (t > p.duration / 2)
        points.push({
          x: ox + ((p.beta * p.duration) / 2) * scaleX,
          y: oy - (p.duration / 2) * scaleT,
        });
      points.push({ x, y });
      path(points, mint, 2.5);
      dot(x, y, 6, mint, true);
      dot(ox, y, 5, blue);
      label("TIERRA", ox - 64, h - 7, blue);
      label("NAVE", x + 12, y + 4, mint);
      break;
    }
    case "packet":
    case "tunnel": {
      const wave = simulation.wave!;
      const left = 30,
        usable = w - 60,
        base = h * 0.7;
      const mapX = (x: number) => left + ((x + 24) / 48) * usable;
      line(left, base, w - 30, base, "#53665b");
      const maxV = Math.max(...wave.potential, 1);
      const potentialPoints = wave.x.map((x, i) => ({
        x: mapX(x),
        y: base - (wave.potential[i] / maxV) * h * 0.5,
      }));
      path(potentialPoints, "#f4b88a90");
      const density = wave.x.map((x, i) => ({
        x: mapX(x),
        y: base - wave.density(i) * h * 1.3,
      }));
      ctx.beginPath();
      ctx.moveTo(left, base);
      density.forEach((point) => ctx.lineTo(point.x, point.y));
      ctx.lineTo(w - 30, base);
      ctx.closePath();
      const gradient = ctx.createLinearGradient(0, h * 0.1, 0, base);
      gradient.addColorStop(0, "#b5f6cd60");
      gradient.addColorStop(1, "#b5f6cd04");
      ctx.fillStyle = gradient;
      ctx.fill();
      path(density, mint, 2);
      if (options.vectors) {
        path(
          wave.x.map((x, i) => ({
            x: mapX(x),
            y: base - wave.real[i] * h * 0.42,
          })),
          "#91b7e899",
        );
        path(
          wave.x.map((x, i) => ({
            x: mapX(x),
            y: base - wave.imag[i] * h * 0.42,
          })),
          "#c6b0ff88",
        );
      }
      for (let x = -20; x <= 20; x += 10) {
        line(mapX(x), base, mapX(x), base + 5);
        label(`${x}`, mapX(x) - 7, base + 22);
      }
      label("|ψ|²", 25, 26, mint);
      label("V / escala", 78, 26, orange);
      label("x (a.u.)", w - 82, base + 43);
      break;
    }
  }
}

function PROTON_RADIUS(velocity: number, magnetic: number): number {
  return (
    (1.672621924e-27 * velocity * 1000) / (1.602176634e-19 * magnetic * 1e-3)
  );
}
