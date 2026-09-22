import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine,
  Copy,
  Link2,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
} from "lucide-react";
import { defaults, type Experiment, type Params } from "../physics/catalog";
import {
  ComparisonSession,
  comparisonPlot,
  type CaseConfig,
} from "../physics/comparison";
import { diagnose, oscillatorConvergence } from "../physics/diagnostics";
import { renderSimulation } from "../physics/render";
import type { Simulation } from "../physics/simulation";
import {
  comparisonCsv,
  comparisonQuery,
  downloadCsv,
  sanitizeParams,
  type ComparisonInitial,
} from "../storage";
import Formula from "./Formula";
import Plot, { formatNumber } from "./Plot";

const display = { grid: true, vectors: true, trace: true };

function CasePanel({
  name,
  simulation,
  frame,
  config,
  change,
}: {
  name: "A" | "B";
  simulation: Simulation;
  frame: number;
  config: CaseConfig;
  change: (config: CaseConfig) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const experiment = simulation.experiment;
  useEffect(() => {
    if (canvas.current) renderSimulation(canvas.current, simulation, display);
  }, [simulation, frame]);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const observer = new ResizeObserver(() =>
      renderSimulation(element, simulation, display),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [simulation]);

  const update = (key: string, amount: number) => {
    if (!Number.isFinite(amount)) return;
    const params = sanitizeParams(experiment, {
      ...config.params,
      [key]: amount,
    });
    if (params[key] !== config.params[key]) change({ ...config, params });
  };

  return (
    <section
      className={`comparison-case case-${name.toLowerCase()}`}
      aria-labelledby={`case-${name}`}
    >
      <div className="panel-header">
        <h2 id={`case-${name}`}>
          <span className="case-badge">{name}</span> Configuración {name}
        </h2>
        <span className="mono">
          t = {formatNumber(simulation.time, 3)} {experiment.timeUnit}
        </span>
      </div>
      <canvas
        ref={canvas}
        className="comparison-canvas"
        aria-label={`Esquema del caso ${name}: ${experiment.title}. Observables en la tabla de comparación.`}
      />
      <p className="scene-caption">
        Escena esquemática · compara magnitudes en los ejes comunes.
      </p>
      <div className="comparison-parameters">
        <label className="comparison-select">
          Preajuste {name}
          <select
            aria-label={`Preajuste ${name}`}
            value=""
            onChange={(event) => {
              const preset = experiment.presets[Number(event.target.value)];
              if (preset)
                change({
                  ...config,
                  params: sanitizeParams(experiment, {
                    ...defaults(experiment),
                    ...preset.params,
                  }),
                });
            }}
          >
            <option value="" disabled>
              Elegir configuración…
            </option>
            {experiment.presets.map((preset, i) => (
              <option value={i} key={preset.name}>
                {preset.name}
              </option>
            ))}
          </select>
        </label>
        {experiment.controls.map((control) => {
          const id = `comparison-${name}-${control.key}`;
          return (
            <div className="comparison-control" key={control.key}>
              <div>
                <label htmlFor={id}>{control.label}</label>
                <span>
                  <input
                    key={config.params[control.key]}
                    type="number"
                    aria-label={`${control.label} ${name}: entrada numérica`}
                    min={control.min}
                    max={control.max}
                    step={control.step}
                    defaultValue={config.params[control.key]}
                    onBlur={(event) => {
                      const input = event.currentTarget;
                      if (
                        input.value.trim() &&
                        Number.isFinite(input.valueAsNumber)
                      ) {
                        input.value = String(
                          sanitizeParams(experiment, {
                            ...config.params,
                            [control.key]: input.valueAsNumber,
                          })[control.key],
                        );
                        update(control.key, Number(input.value));
                      } else input.value = String(config.params[control.key]);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                    }}
                  />
                  <small>{control.unit}</small>
                </span>
              </div>
              <input
                id={id}
                type="range"
                aria-label={`${control.label} ${name}`}
                aria-valuetext={`${config.params[control.key]} ${control.unit}`}
                min={control.min}
                max={control.max}
                step={control.step}
                value={config.params[control.key]}
                onChange={(event) =>
                  update(control.key, Number(event.target.value))
                }
              />
            </div>
          );
        })}
        {simulation.maxStep !== null && (
          <label className="comparison-select">
            Integración temporal {name}
            <select
              aria-label={`Refinamiento temporal ${name}`}
              value={config.refinement}
              onChange={(event) =>
                change({
                  ...config,
                  refinement:
                    event.target.value === "4"
                      ? 4
                      : event.target.value === "2"
                        ? 2
                        : 1,
                })
              }
            >
              <option value="1">h base</option>
              <option value="2">h base / 2</option>
              <option value="4">h base / 4</option>
            </select>
          </label>
        )}
      </div>
    </section>
  );
}

function NumericalPanel({
  name,
  simulation,
}: {
  name: string;
  simulation: Simulation;
}) {
  const diagnosis = diagnose(simulation);
  return (
    <section
      className="numerical-case"
      aria-label={`Diagnóstico numérico ${name}`}
    >
      <h3>Caso {name}</h3>
      <dl>
        {simulation.maxStep !== null && (
          <>
            <div>
              <dt>h máximo</dt>
              <dd>
                {formatNumber(simulation.maxStep, 7)}{" "}
                <small>{simulation.experiment.timeUnit}</small>
              </dd>
            </div>
            <div>
              <dt>Último subpaso efectivo</dt>
              <dd>
                {simulation.lastStep === null
                  ? "Sin integrar"
                  : `${formatNumber(simulation.lastStep, 7)} ${simulation.experiment.timeUnit}`}
              </dd>
            </div>
          </>
        )}
        {diagnosis.metrics.map((metric) => (
          <div key={metric.label}>
            <dt>{metric.label}</dt>
            <dd>
              {formatNumber(metric.value, 7)} <small>{metric.unit}</small>
            </dd>
          </div>
        ))}
      </dl>
      <p>{diagnosis.note}</p>
    </section>
  );
}

function ConvergenceStudy({ a, b }: { a: Params; b: Params }) {
  const [studies, setStudies] = useState<
    ReturnType<typeof oscillatorConvergence>[] | null
  >(null);
  return (
    <section className="convergence-study">
      <div className="panel-header">
        <h3>¿Converge al reducir el paso?</h3>
        <button
          className="secondary-button"
          onClick={() =>
            setStudies([oscillatorConvergence(a), oscillatorConvergence(b)])
          }
        >
          Comprobar convergencia A/B
        </button>
      </div>
      <p>
        Prueba independiente desde t = 0 hasta un período natural de cada caso.
        Usa el mismo RK4 que la simulación, sin alterar el reloj en vivo.
      </p>
      <Formula
        value={String.raw`\varepsilon=\sqrt{\left(\frac{x-x_{\rm exacta}}{A}\right)^2+\left(\frac{v-v_{\rm exacta}}{A\omega_0}\right)^2},\quad p=\frac{\ln(\varepsilon_h/\varepsilon_{h'})}{\ln(h/h')}`}
      />
      {studies && (
        <div className="comparison-table-wrap">
          <table className="comparison-table">
            <caption>
              Orden esperado de RK4: p ≈ 4. «—» indica que no hay paso previo o
              que el error ≤ 10⁻¹³ impide estimar p con fiabilidad.
            </caption>
            <thead>
              <tr>
                <th>Caso</th>
                <th>T (s)</th>
                <th>h efectivo (s)</th>
                <th>Error normalizado</th>
                <th>Orden observado</th>
              </tr>
            </thead>
            <tbody>
              {studies.flatMap((study, i) =>
                study.rows.map((row) => (
                  <tr key={`${i}-${row.refinement}`}>
                    <th>
                      {i === 0 ? "A" : "B"} · h/{row.refinement}
                    </th>
                    <td>{formatNumber(study.duration, 5)}</td>
                    <td>{formatNumber(row.step, 8)}</td>
                    <td>{formatNumber(row.error, 8)}</td>
                    <td>
                      {row.order === null ? "—" : formatNumber(row.order, 3)}
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function ComparisonLab({
  experiment,
  initialParams,
  initialComparison,
  active,
  notify,
}: {
  experiment: Experiment;
  initialParams: Params;
  initialComparison?: ComparisonInitial;
  active: boolean;
  notify: (message: string) => void;
}) {
  const [a, setA] = useState<CaseConfig>(() => ({
    params: { ...initialParams },
    refinement: initialComparison?.refinementA ?? 1,
  }));
  const [b, setB] = useState<CaseConfig>(
    () =>
      initialComparison?.b ?? {
        params: {
          ...initialParams,
          ...(experiment.id === "oscillator"
            ? { damping: initialParams.damping === 0 ? 0.5 : 0 }
            : {}),
        },
        refinement: 1,
      },
  );
  const [revision, setRevision] = useState(0);
  const session = useMemo(() => {
    void revision;
    return new ComparisonSession(experiment, a, b);
  }, [experiment, a, b, revision]);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [frame, setFrame] = useState(0);
  const [observable, setObservable] = useState<number | "profile">(
    ["wave", "interference", "gas", "carnot", "packet", "tunnel"].includes(
      experiment.id,
    )
      ? "profile"
      : 0,
  );
  const [shareUrl, setShareUrl] = useState("");
  const plot = comparisonPlot(session, observable);
  const readA = session.a.read();
  const readB = session.b.read();

  const reset = useCallback(() => {
    setRunning(false);
    setRevision((value) => value + 1);
  }, []);
  const toggle = useCallback(() => {
    if (session.finished) setRevision((value) => value + 1);
    setRunning((value) => !value);
  }, [session]);

  useEffect(() => {
    if (!running || !active) return;
    let id = 0;
    let previous = 0;
    const animate = (now: number) => {
      if (!previous) previous = now;
      const elapsed = (now - previous) / 1000;
      if (elapsed >= 1 / 30) {
        if (!document.hidden) {
          session.advance(Math.min(elapsed, 0.06) * speed * session.a.rate);
          setFrame((value) => value + 1);
        }
        previous = now;
        if (session.finished) {
          setRunning(false);
          return;
        }
      }
      id = requestAnimationFrame(animate);
    };
    id = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(id);
  }, [session, running, speed, active]);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (
        !active ||
        (event.target instanceof HTMLElement &&
          (["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(
            event.target.tagName,
          ) ||
            event.target.isContentEditable))
      )
        return;
      if (event.code === "Space") {
        event.preventDefault();
        toggle();
      }
      if (event.key.toLowerCase() === "r") reset();
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [active, reset, toggle]);

  const change = (name: "A" | "B", config: CaseConfig) => {
    setRunning(false);
    setShareUrl("");
    if (name === "A") setA(config);
    else setB(config);
  };
  const share = async () => {
    const url = new URL(window.location.href);
    url.search = comparisonQuery(experiment, a, b).toString();
    setShareUrl(url.toString());
    try {
      await navigator.clipboard.writeText(url.toString());
      notify("Enlace A/B copiado · reproduce condiciones iniciales en t = 0");
    } catch {
      notify("Selecciona y copia el enlace A/B que aparece bajo los controles");
    }
  };

  return (
    <div className="comparison-lab">
      <section
        className="comparison-toolbar"
        aria-label="Reloj y controles compartidos"
      >
        <div className="comparison-playback">
          <button
            className="play-button"
            onClick={toggle}
            aria-label={
              running ? "Pausar comparación" : "Reproducir comparación"
            }
          >
            {running ? <Pause size={17} /> : <Play size={17} />}
          </button>
          <button
            className="icon-button"
            aria-label="Avanzar ambos casos un paso"
            disabled={session.finished}
            onClick={() => {
              setRunning(false);
              session.advance(session.a.rate / 60);
              setFrame((value) => value + 1);
            }}
          >
            <SkipForward size={17} />
          </button>
          <button
            className="icon-button"
            aria-label="Reiniciar ambos casos"
            onClick={reset}
          >
            <RotateCcw size={17} />
          </button>
          <select
            aria-label="Velocidad de la comparación"
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
          >
            {[0.25, 0.5, 1, 2].map((value) => (
              <option key={value} value={value}>
                {value}×
              </option>
            ))}
          </select>
          <output className="comparison-clock" aria-label="Tiempo compartido">
            t = {formatNumber(session.time, 3)} {experiment.timeUnit}
          </output>
          <span className="comparison-status">
            {session.finished
              ? "Finalizada"
              : running
                ? "Sincronizadas"
                : "En pausa"}
          </span>
        </div>
        <button
          className="text-button"
          onClick={() =>
            change("B", { params: { ...a.params }, refinement: a.refinement })
          }
        >
          <Copy size={15} /> Copiar A → B
        </button>
      </section>
      <p className="comparison-hint">
        Un reloj, dos configuraciones. Cambiar parámetros, preajustes o pasos
        reinicia ambos casos y pausa la comparación. Al salir del comparador se
        descarta la evolución; copia el enlace para conservar las condiciones.
      </p>
      {Number.isFinite(session.endTime) && (
        <p className="comparison-hint">
          Ambos casos se detienen en t = {session.endTime} {experiment.timeUnit}
          , el primer límite temporal.
        </p>
      )}
      <div className="comparison-cases">
        <CasePanel
          name="A"
          simulation={session.a}
          frame={frame}
          config={a}
          change={(config) => change("A", config)}
        />
        <CasePanel
          name="B"
          simulation={session.b}
          frame={frame}
          config={b}
          change={(config) => change("B", config)}
        />
      </div>
      <section
        className="chart-panel comparison-chart"
        aria-label="Gráfica A/B con ejes comunes"
      >
        <div className="panel-header">
          <h2>Comparar con la misma escala</h2>
          <select
            aria-label="Magnitud comparada"
            value={observable}
            onChange={(event) =>
              setObservable(
                event.target.value === "profile"
                  ? "profile"
                  : Number(event.target.value),
              )
            }
          >
            {readA.metrics.map((metric, i) => (
              <option key={metric.label} value={i}>
                {metric.label}
                {metric.unit ? ` (${metric.unit})` : ""}
              </option>
            ))}
            <option value="profile">
              {experiment.id === "gas"
                ? "Distribución de rapidez"
                : experiment.series[0]}{" "}
              · perfil
            </option>
          </select>
        </div>
        <div className="chart-legend">
          <span>
            <i /> A · {plot.label}
          </span>
          <span>
            <i className="orange" /> B · {plot.label} (trazo discontinuo)
          </span>
        </div>
        <Plot
          points={plot.a}
          secondaryPoints={plot.b}
          xLabel={plot.xLabel}
          unit={plot.unit}
          labels={[`A: ${plot.label}`, `B: ${plot.label}`]}
        />
        <p className="comparison-hint">
          Cada curva conserva sus coordenadas físicas. La comparación no estira
          los dominios ni reajusta las curvas para hacerlas coincidir.
        </p>
      </section>
      <div className="comparison-table-wrap">
        <table className="comparison-table">
          <caption>
            Observables simultáneos · las diferencias B − A reflejan las
            configuraciones, no el error numérico.
          </caption>
          <thead>
            <tr>
              <th>Magnitud</th>
              <th>Unidad</th>
              <th>Caso A</th>
              <th>Caso B</th>
              <th>B − A</th>
            </tr>
          </thead>
          <tbody>
            {readA.metrics.map((metric, i) => (
              <tr key={metric.label}>
                <th>{metric.label}</th>
                <td>{metric.unit || "—"}</td>
                <td>{formatNumber(metric.value, 6)}</td>
                <td>{formatNumber(readB.metrics[i].value, 6)}</td>
                <td>
                  {formatNumber(readB.metrics[i].value - metric.value, 6)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="numerical-panel">
        <div className="panel-header">
          <h2>Rigor numérico</h2>
          <span className="mono">Referencia e invariantes</span>
        </div>
        <p className="comparison-hint">
          El subpaso efectivo se ajusta para alcanzar el reloj común sin superar
          h máximo. La velocidad de reproducción solo cambia el ritmo de avance
          visual.
        </p>
        <div className="numerical-cases">
          <NumericalPanel name="A" simulation={session.a} />
          <NumericalPanel name="B" simulation={session.b} />
        </div>
        {experiment.id === "oscillator" && (
          <ConvergenceStudy
            key={JSON.stringify([a.params, b.params])}
            a={a.params}
            b={b.params}
          />
        )}
      </section>
      <details className="comparison-theory">
        <summary>
          Ecuaciones, método y supuestos de {experiment.title.toLowerCase()}
        </summary>
        <Formula value={experiment.formula} />
        <p>{experiment.theory}</p>
        <h3>Método</h3>
        <p>{experiment.method}</p>
        <h3>Supuestos</h3>
        <p>{experiment.assumptions}</p>
      </details>
      <div className="bottom-actions">
        <span>
          Últimas {session.history.length} muestras simultáneas (máximo 400).
        </span>
        <div>
          <button onClick={share}>
            <Link2 size={15} /> Copiar configuración A/B
          </button>
          <button
            onClick={() =>
              downloadCsv(
                `physica-${experiment.id}-AB.csv`,
                comparisonCsv(session, observable),
              )
            }
          >
            <ArrowDownToLine size={15} /> Exportar comparación CSV
          </button>
        </div>
      </div>
      {shareUrl && (
        <label className="comparison-link">
          Enlace de condiciones iniciales A/B
          <input
            readOnly
            value={shareUrl}
            onFocus={(event) => event.target.select()}
          />
        </label>
      )}
    </div>
  );
}
