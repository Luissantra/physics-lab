import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  Atom,
  BookOpen,
  BookmarkPlus,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Compass,
  Expand,
  FlaskConical,
  Gauge,
  Grid2X2,
  Lightbulb,
  Link2,
  Menu,
  MoveUpRight,
  NotebookPen,
  Orbit,
  Pause,
  Play,
  Plus,
  Radio,
  RotateCcw,
  Search,
  Settings2,
  SkipForward,
  Sparkles,
  Thermometer,
  Trash2,
  Waves,
  X,
  Zap,
} from "lucide-react";
import {
  defaults,
  domains,
  experiments,
  type DomainId,
  type Experiment,
  type Params,
} from "./physics/catalog";
import { carnotState } from "./physics/math";
import { renderSimulation, type DisplayOptions } from "./physics/render";
import { Simulation } from "./physics/simulation";
import {
  downloadCsv,
  initialExperiment,
  loadMeasurements,
  sanitizeParams,
  type Measurement,
} from "./storage";
import Plot, { formatNumber } from "./components/Plot";
import Formula from "./components/Formula";
import Dialog from "./components/Dialog";

const domainIcons = {
  mechanics: Orbit,
  waves: Waves,
  electromagnetism: Zap,
  thermodynamics: Thermometer,
  relativity: Compass,
  quantum: Atom,
};
type Page = "lab" | "library" | "notebook";

export default function App() {
  const [initial] = useState(initialExperiment);
  const [experiment, setExperiment] = useState(initial.experiment);
  const [params, setParams] = useState(initial.params);
  const [resetCount, setResetCount] = useState(0);
  const simulation = useMemo(() => {
    void resetCount;
    return new Simulation(experiment, params);
  }, [experiment, params, resetCount]);
  const [running, setRunning] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [speed, setSpeed] = useState(1);
  const [frame, setFrame] = useState(0);
  const [page, setPage] = useState<Page>("lab");
  const [options, setOptions] = useState<DisplayOptions>({
    grid: true,
    vectors: true,
    trace: true,
  });
  const [theoryTab, setTheoryTab] = useState<"theory" | "method" | "limits">(
    "theory",
  );
  const [dialog, setDialog] = useState<"guide" | "help" | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [measurements, setMeasurements] = useState(loadMeasurements);
  const [search, setSearch] = useState("");
  const [libraryDomain, setLibraryDomain] = useState<DomainId | "all">("all");
  const [toast, setToast] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  const canvasDialog = useRef<HTMLDialogElement>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const domain = domains.find((item) => item.id === experiment.domain)!;
  const DomainIcon = domainIcons[domain.id];
  const readout = simulation.read();
  const chart = simulation.chart();
  const notify = useCallback((message: string) => {
    setToast(message);
    clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(""), 3800);
  }, []);

  useEffect(() => () => clearTimeout(toastTimeout.current), []);

  useEffect(() => {
    if (!running || page !== "lab") return;
    let id = 0,
      previous = 0;
    const animate = (now: number) => {
      if (!previous) previous = now;
      const elapsed = (now - previous) / 1000;
      if (elapsed >= 1 / 30) {
        if (!document.hidden)
          simulation.advance(Math.min(elapsed, 0.06) * speed * simulation.rate);
        previous = now;
        setFrame((value) => value + 1);
        if (simulation.finished) {
          setRunning(false);
          return;
        }
      }
      id = requestAnimationFrame(animate);
    };
    id = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(id);
  }, [simulation, running, speed, page]);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    renderSimulation(element, simulation, options);
  }, [simulation, frame, options, expanded, page]);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const observer = new ResizeObserver(() =>
      renderSimulation(element, simulation, options),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [simulation, options, page, expanded]);

  useEffect(() => {
    const element = canvasDialog.current;
    if (expanded) element?.showModal();
    else element?.close();
  }, [expanded]);

  const reset = useCallback(() => {
    setResetCount((value) => value + 1);
    notify("Experimento reiniciado · se conservan los parámetros");
  }, [notify]);

  const toggleRunning = useCallback(() => {
    if (simulation.finished) setResetCount((value) => value + 1);
    setRunning((value) => !value);
  }, [simulation]);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLElement &&
        (["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(
          event.target.tagName,
        ) ||
          event.target.isContentEditable)
      )
        return;
      if (dialog || page !== "lab") return;
      if (event.code === "Space") {
        event.preventDefault();
        toggleRunning();
      }
      if (event.key.toLowerCase() === "r") reset();
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [dialog, page, reset, toggleRunning]);

  function selectExperiment(next: Experiment, nextParams?: Params) {
    setExperiment(next);
    setParams(sanitizeParams(next, nextParams ?? defaults(next)));
    setPage("lab");
    setMobileMenu(false);
    setTheoryTab("theory");
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("experiment", next.id);
    window.history.replaceState(null, "", url);
  }

  function updateParam(key: string, value: number) {
    setParams((current) => ({ ...current, [key]: value }));
  }

  function applyPreset(preset: { name: string; params: Params }) {
    setParams(
      sanitizeParams(experiment, { ...defaults(experiment), ...preset.params }),
    );
    notify(`Configuración «${preset.name}» aplicada · tiempo reiniciado`);
  }

  function persistMeasurements(next: Measurement[]) {
    try {
      localStorage.setItem("physica-notebook", JSON.stringify(next));
    } catch {
      notify(
        "No se pudo guardar en este navegador. Exporta el cuaderno como CSV.",
      );
    }
    setMeasurements(next);
  }

  function saveMeasurement() {
    const measurement: Measurement = {
      id: crypto.randomUUID(),
      experimentId: experiment.id,
      title: experiment.title,
      time: simulation.time,
      timeUnit: experiment.timeUnit,
      created: new Date().toISOString(),
      params: { ...params },
      metrics: simulation.read().metrics.map((item) => ({ ...item })),
    };
    const next = [measurement, ...measurements].slice(0, 100);
    try {
      localStorage.setItem("physica-notebook", JSON.stringify(next));
      notify("Medición guardada en tu cuaderno");
    } catch {
      notify(
        "Medición en memoria; almacenamiento no disponible. Exporta un CSV.",
      );
    }
    setMeasurements(next);
  }

  function exportExperiment() {
    const currentReadout = simulation.read();
    const currentChart = simulation.chart();
    const rows: (string | number)[][] = [
      ["PHYSICA", experiment.title],
      ["Método", experiment.method],
      ["Tiempo de captura", simulation.time, experiment.timeUnit],
      ["Datos", "Perfil actual o últimas 400 muestras temporales"],
    ];
    experiment.controls.forEach((control) =>
      rows.push([control.label, params[control.key], control.unit]),
    );
    rows.push([], ["Magnitud", "Valor", "Unidad"]);
    currentReadout.metrics.forEach((item) =>
      rows.push([item.label, item.value, item.unit]),
    );
    rows.push(
      [],
      [
        currentChart.xLabel,
        `${experiment.series[0]} (${experiment.chartUnit})`,
        `${experiment.series[1]} (${experiment.chartUnit})`,
      ],
    );
    currentChart.points.forEach((point) =>
      rows.push([point.x, point.y, point.y2]),
    );
    downloadCsv(`physica-${experiment.id}.csv`, rows);
    notify("Datos exportados en CSV");
  }

  function exportNotebook() {
    const rows: (string | number)[][] = [
      [
        "Experimento",
        "Fecha",
        "Tiempo",
        "Unidad de tiempo",
        "Magnitud",
        "Valor",
        "Unidad",
        "Parámetros (JSON)",
      ],
    ];
    measurements.forEach((item) =>
      item.metrics.forEach((m) =>
        rows.push([
          item.title,
          item.created,
          item.time,
          item.timeUnit,
          m.label,
          m.value,
          m.unit,
          JSON.stringify(item.params),
        ]),
      ),
    );
    downloadCsv("physica-cuaderno.csv", rows);
  }

  async function share() {
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("experiment", experiment.id);
    Object.entries(params).forEach(([key, value]) =>
      url.searchParams.set(key, String(value)),
    );
    window.history.replaceState(null, "", url);
    try {
      await navigator.clipboard.writeText(url.toString());
      notify("Enlace copiado · reproduce los parámetros desde t = 0");
    } catch {
      notify(
        "Parámetros incluidos en la dirección de esta página; copia la URL del navegador.",
      );
    }
  }

  const currentCarnot =
    experiment.id === "carnot"
      ? carnotState(
          (simulation.time / 3) % 4,
          params.hot,
          params.cold,
          params.ratio,
        )
      : null;
  const filtered = experiments.filter(
    (item) =>
      (libraryDomain === "all" || item.domain === libraryDomain) &&
      `${item.title} ${item.description} ${item.tag}`
        .toLocaleLowerCase("es")
        .includes(search.toLocaleLowerCase("es")),
  );
  const canvasElement = (
    <canvas
      ref={canvas}
      className="simulation-canvas"
      role="img"
      aria-label={`Visualización de ${experiment.title}. Las magnitudes actuales están en las tarjetas bajo el simulador.`}
    />
  );

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Saltar al laboratorio
      </a>
      {mobileMenu && (
        <button
          className="sidebar-scrim"
          aria-label="Cerrar menú"
          onClick={() => setMobileMenu(false)}
        />
      )}
      <aside className={`sidebar ${mobileMenu ? "open" : ""}`}>
        <button
          className="brand"
          onClick={() => {
            setPage("lab");
            setMobileMenu(false);
          }}
          aria-label="PHYSICA, volver al laboratorio"
        >
          <span className="brand-icon">
            <Atom size={28} strokeWidth={1.4} />
          </span>
          <span>
            PHYSICA<small>VIRTUAL PHYSICS LAB</small>
          </span>
        </button>
        <div className="workspace-label">
          <span className="small-dot" /> Tu espacio de exploración
        </div>
        <nav aria-label="Navegación principal" className="primary-nav">
          <button
            className={page === "lab" ? "selected" : ""}
            onClick={() => {
              setPage("lab");
              setMobileMenu(false);
            }}
          >
            <FlaskConical size={18} />
            Laboratorio
            <ChevronRight size={15} />
          </button>
          <button
            className={page === "library" ? "selected" : ""}
            onClick={() => {
              setPage("library");
              setMobileMenu(false);
            }}
          >
            <Grid2X2 size={18} />
            Explorar experimentos<span className="count">13</span>
          </button>
          <button
            className={page === "notebook" ? "selected" : ""}
            onClick={() => {
              setPage("notebook");
              setMobileMenu(false);
            }}
          >
            <NotebookPen size={18} />
            Mi cuaderno
            {measurements.length > 0 && (
              <span className="count">{measurements.length}</span>
            )}
          </button>
        </nav>
        <div className="sidebar-section-label">
          DOMINIOS DE LA FÍSICA <span>06</span>
        </div>
        <nav className="domain-nav" aria-label="Dominios de la física">
          {domains.map((item) => {
            const Icon = domainIcons[item.id];
            return (
              <button
                key={item.id}
                style={{ "--domain-color": item.color } as CSSProperties}
                className={
                  domain.id === item.id && page === "lab" ? "active" : ""
                }
                onClick={() =>
                  selectExperiment(
                    experiments.find((e) => e.domain === item.id)!,
                  )
                }
              >
                <Icon size={18} strokeWidth={1.6} />
                <span>{item.name}</span>
                <span className="domain-indicator" />
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="curiosity-card">
            <Sparkles size={19} />
            <p>
              La mejor forma de entender
              <br />
              es <em>experimentar.</em>
            </p>
            <span>Observa. Pregunta. Descubre.</span>
          </div>
          <button className="help-link" onClick={() => setDialog("help")}>
            <CircleHelp size={17} />
            Guía del laboratorio
            <MoveUpRight size={14} />
          </button>
          <div className="sidebar-footer">
            <span className="small-dot" /> MODELOS LOCALES <span>v1.0</span>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-toggle icon-button"
              aria-label="Abrir menú"
              onClick={() => setMobileMenu(true)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>
              {page === "lab"
                ? "Laboratorio"
                : page === "library"
                  ? "Experimentos"
                  : "Mi cuaderno"}
            </strong>
          </div>
          <div className="topbar-actions">
            <button
              className="search-shortcut"
              onClick={() => setPage("library")}
            >
              <Search size={16} />
              <span>Buscar un experimento</span>
            </button>
            <span className="university-badge">
              <GraduationIcon />
              NIVEL UNIVERSITARIO
            </span>
            <span className="avatar" aria-label="Espacio personal local">
              P
            </span>
          </div>
        </header>
        <main id="main-content">
          {page === "lab" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    <span style={{ color: domain.color }}>
                      <DomainIcon size={14} /> {domain.name}
                    </span>
                    <span className="eyebrow-separator">/</span> EXPERIMENTO{" "}
                    {String(experiments.indexOf(experiment) + 1).padStart(
                      2,
                      "0",
                    )}
                  </div>
                  <h1>
                    {experiment.title}
                    <span className="heading-dot">.</span>
                  </h1>
                  <p>{experiment.description}</p>
                </div>
                <button
                  className="secondary-button guide-button"
                  onClick={() => setDialog("guide")}
                >
                  <BookOpen size={16} />
                  Guía de práctica
                  <MoveUpRight size={14} />
                </button>
              </div>
              <div className="experiment-navigation">
                <div
                  className="experiment-tabs"
                  aria-label="Experimentos del dominio"
                >
                  {experiments
                    .filter((item) => item.domain === domain.id)
                    .map((item) => (
                      <button
                        key={item.id}
                        className={item.id === experiment.id ? "active" : ""}
                        aria-current={
                          item.id === experiment.id ? "page" : undefined
                        }
                        onClick={() => selectExperiment(item)}
                      >
                        {item.short}
                        {item.id === experiment.id && (
                          <span className="small-dot" />
                        )}
                      </button>
                    ))}
                </div>
                <span className="reproducible">
                  <span className="small-dot" /> Modelo reproducible
                </span>
              </div>
              <div className="workbench">
                <section
                  className="simulation-panel"
                  aria-label="Simulación interactiva"
                >
                  <div className="panel-header">
                    <div className="panel-title">
                      <span
                        className={`status-dot ${running && !simulation.finished ? "running" : ""}`}
                      />
                      <h2>
                        {running && !simulation.finished
                          ? "Simulación en vivo"
                          : simulation.finished
                            ? "Simulación finalizada"
                            : "Simulación en pausa"}
                      </h2>
                    </div>
                    <div className="canvas-tools">
                      <button
                        className={`icon-button ${options.grid ? "enabled" : ""}`}
                        title="Mostrar cuadrícula"
                        aria-label="Mostrar cuadrícula"
                        aria-pressed={options.grid}
                        onClick={() =>
                          setOptions((current) => ({
                            ...current,
                            grid: !current.grid,
                          }))
                        }
                      >
                        <Grid2X2 size={15} />
                      </button>
                      <button
                        className="icon-button"
                        title="Ampliar simulación"
                        aria-label="Ampliar simulación"
                        onClick={() => setExpanded(true)}
                      >
                        <Expand size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="canvas-wrap">
                    <div className="canvas-caption">
                      <span>{experiment.tag}</span>
                      <span>
                        {experiment.id === "packet" ||
                        experiment.id === "tunnel"
                          ? "ℏ = m = 1"
                          : "MODELO FÍSICO"}
                      </span>
                    </div>
                    {!expanded && canvasElement}
                    <div className="canvas-legend">
                      <span>
                        <i />
                        {experiment.id === "chaos"
                          ? "Sistema A"
                          : experiment.domain === "quantum"
                            ? "Probabilidad"
                            : "Sistema"}
                      </span>
                      <span>
                        <i className="orange" />
                        {experiment.id === "chaos"
                          ? "Sistema B"
                          : experiment.domain === "quantum"
                            ? "Potencial"
                            : "Referencia"}
                      </span>
                      <span className="canvas-dimensions">
                        {experiment.id === "gas" ? "3D → XY" : "2D"}
                      </span>
                    </div>
                  </div>
                  <div className="playback">
                    <div className="playback-buttons">
                      <button
                        className="play-button"
                        aria-label={
                          running ? "Pausar simulación" : "Iniciar simulación"
                        }
                        title="Espacio: reproducir o pausar"
                        onClick={toggleRunning}
                      >
                        {running ? (
                          <Pause size={17} fill="currentColor" />
                        ) : (
                          <Play size={17} fill="currentColor" />
                        )}
                      </button>
                      <button
                        className="icon-button"
                        aria-label="Avanzar un paso"
                        title={`Avanzar ${formatNumber(simulation.rate / 60, 5)} ${experiment.timeUnit}`}
                        disabled={simulation.finished}
                        onClick={() => {
                          setRunning(false);
                          simulation.advance(simulation.rate / 60);
                          setFrame((value) => value + 1);
                        }}
                      >
                        <SkipForward size={17} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label="Reiniciar simulación"
                        title="Reiniciar (R)"
                        onClick={reset}
                      >
                        <RotateCcw size={16} />
                      </button>
                      <span className="playback-divider" />
                      <label className="speed-select">
                        <Gauge size={15} />
                        <select
                          aria-label="Velocidad de reproducción"
                          value={speed}
                          onChange={(event) =>
                            setSpeed(Number(event.target.value))
                          }
                        >
                          {[0.25, 0.5, 1, 2].map((value) => (
                            <option key={value} value={value}>
                              {value}×
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="time-display">
                      <span>t</span>
                      <output>{simulation.time.toFixed(2)}</output>
                      <span>{experiment.timeUnit}</span>
                    </div>
                  </div>
                </section>
                <section
                  className="parameters-panel"
                  aria-labelledby="parameter-title"
                >
                  <div className="panel-header">
                    <div className="panel-title">
                      <Settings2 size={16} />
                      <h2 id="parameter-title">Parámetros</h2>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => {
                        setParams(defaults(experiment));
                        notify("Parámetros originales restaurados");
                      }}
                    >
                      Restaurar
                    </button>
                  </div>
                  <div className="parameter-content">
                    <label className="preset-label" htmlFor="preset">
                      CONFIGURACIÓN INICIAL
                    </label>
                    <div className="preset-select">
                      <FlaskConical size={15} />
                      <select
                        id="preset"
                        value=""
                        onChange={(event) => {
                          const preset =
                            experiment.presets[Number(event.target.value)];
                          if (preset) applyPreset(preset);
                        }}
                      >
                        <option value="" disabled>
                          Elegir una configuración
                        </option>
                        {experiment.presets.map((preset, i) => (
                          <option key={preset.name} value={i}>
                            {preset.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={15} />
                    </div>
                    <div className="sliders">
                      {experiment.controls.map((control) => (
                        <div className="parameter" key={control.key}>
                          <div className="parameter-label">
                            <label htmlFor={`control-${control.key}`}>
                              {control.label}
                            </label>
                            <span className="parameter-value">
                              <output htmlFor={`control-${control.key}`}>
                                {formatNumber(params[control.key], 2)}
                              </output>
                              <small>{control.unit}</small>
                            </span>
                          </div>
                          <input
                            id={`control-${control.key}`}
                            type="range"
                            min={control.min}
                            max={control.max}
                            step={control.step}
                            value={params[control.key]}
                            aria-valuetext={`${formatNumber(params[control.key], 2)} ${control.unit}`}
                            style={
                              {
                                "--range-progress": `${((params[control.key] - control.min) / (control.max - control.min)) * 100}%`,
                              } as CSSProperties
                            }
                            onChange={(event) =>
                              updateParam(
                                control.key,
                                Number(event.target.value),
                              )
                            }
                          />
                          <div className="range-endpoints">
                            <span>{formatNumber(control.min)}</span>
                            <span>
                              {formatNumber(control.max)} {control.unit}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="parameter-hint">
                      <RotateCcw size={12} />
                      Cada cambio reinicia el tiempo.
                    </div>
                    <div className="display-options">
                      <span>VISUALIZACIÓN</span>
                      <label>
                        <input
                          type="checkbox"
                          checked={options.grid}
                          onChange={(event) =>
                            setOptions((current) => ({
                              ...current,
                              grid: event.target.checked,
                            }))
                          }
                        />
                        Cuadrícula
                      </label>
                      {[
                        "oscillator",
                        "orbit",
                        "charge",
                        "wave",
                        "packet",
                        "tunnel",
                      ].includes(experiment.id) && (
                        <label>
                          <input
                            type="checkbox"
                            checked={options.vectors}
                            onChange={(event) =>
                              setOptions((current) => ({
                                ...current,
                                vectors: event.target.checked,
                              }))
                            }
                          />
                          {experiment.domain === "quantum"
                            ? "Re ψ / Im ψ"
                            : experiment.id === "wave"
                              ? "Ondas viajeras"
                              : "Vectores"}
                        </label>
                      )}
                      {["orbit", "chaos", "charge"].includes(experiment.id) && (
                        <label>
                          <input
                            type="checkbox"
                            checked={options.trace}
                            onChange={(event) =>
                              setOptions((current) => ({
                                ...current,
                                trace: event.target.checked,
                              }))
                            }
                          />
                          Trayectoria
                        </label>
                      )}
                    </div>
                  </div>
                </section>
              </div>
              <section className="metrics-row" aria-label="Mediciones actuales">
                {readout.metrics.map((metric, i) => (
                  <div className="metric-card" key={metric.label}>
                    <div className="metric-label">
                      <span className={`metric-line line-${i}`} />
                      {metric.label}
                    </div>
                    <div className="metric-value">
                      <output>{formatNumber(metric.value)}</output>
                      <span>{metric.unit}</span>
                    </div>
                  </div>
                ))}
              </section>
              <div className="analysis-row">
                <section className="chart-panel">
                  <div className="panel-header">
                    <div className="panel-title">
                      <Activity size={16} />
                      <h2>{experiment.chartTitle}</h2>
                    </div>
                    <button
                      className="icon-button"
                      aria-label="Exportar datos como CSV"
                      title="Exportar datos"
                      onClick={exportExperiment}
                    >
                      <ArrowDownToLine size={15} />
                    </button>
                  </div>
                  <div className="chart-legend">
                    <span>
                      <i />
                      {experiment.series[0]}
                    </span>
                    <span>
                      <i className="orange" />
                      {experiment.series[1]}
                    </span>
                    <span className="chart-live">TIEMPO REAL</span>
                  </div>
                  <Plot
                    points={chart.points}
                    xLabel={chart.xLabel}
                    unit={experiment.chartUnit}
                    labels={experiment.series}
                    marker={
                      currentCarnot
                        ? {
                            x: currentCarnot.volume * 1000,
                            y: currentCarnot.pressure / 1000,
                          }
                        : undefined
                    }
                  />
                  <div className="diagnostic">
                    <span className="small-dot" />
                    {readout.note}
                  </div>
                </section>
                <section className="theory-panel">
                  <div
                    className="theory-tabs"
                    aria-label="Información del modelo"
                  >
                    {(
                      [
                        { id: "theory", label: "El modelo" },
                        { id: "method", label: "Método" },
                        { id: "limits", label: "Supuestos" },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        className={theoryTab === tab.id ? "active" : ""}
                        aria-pressed={theoryTab === tab.id}
                        onClick={() => setTheoryTab(tab.id)}
                      >
                        {tab.label}
                      </button>
                    ))}
                    <BookOpen size={15} />
                  </div>
                  <div className="theory-content">
                    {theoryTab === "theory" ? (
                      <>
                        <Formula value={experiment.formula} />
                        <p>{experiment.theory}</p>
                      </>
                    ) : (
                      <>
                        <div className="theory-kicker">
                          {theoryTab === "method"
                            ? "CÓMO SE CALCULA"
                            : "ALCANCE Y LIMITACIONES"}
                        </div>
                        <p>
                          {theoryTab === "method"
                            ? experiment.method
                            : experiment.assumptions}
                        </p>
                      </>
                    )}
                    <a
                      href={experiment.reference.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Consultar referencia
                      <MoveUpRight size={12} />
                    </a>
                  </div>
                </section>
              </div>
              <div className="bottom-actions">
                <div>
                  <Lightbulb size={17} />
                  <span>Cambia una variable. Observa lo que permanece.</span>
                </div>
                <div>
                  <button onClick={share}>
                    <Link2 size={15} />
                    Copiar configuración
                  </button>
                  <button onClick={saveMeasurement}>
                    <BookmarkPlus size={15} />
                    Guardar medición
                  </button>
                </div>
              </div>
            </>
          )}
          {page === "library" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    EL UNIVERSO, UN EXPERIMENTO A LA VEZ
                  </div>
                  <h1>
                    Todo empieza con una pregunta
                    <span className="heading-dot">.</span>
                  </h1>
                  <p>
                    Trece formas de explorar las leyes de la naturaleza. Elige
                    por dónde empezar.
                  </p>
                </div>
              </div>
              <div className="library-toolbar">
                <label className="library-search">
                  <Search size={18} />
                  <input
                    aria-label="Buscar experimentos"
                    placeholder="Busca un fenómeno, una ley, una idea…"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>
                <span>{filtered.length} experimentos</span>
              </div>
              <div className="library-filters">
                <button
                  className={libraryDomain === "all" ? "active" : ""}
                  onClick={() => setLibraryDomain("all")}
                >
                  Todos los dominios
                </button>
                {domains.map((item) => (
                  <button
                    key={item.id}
                    className={libraryDomain === item.id ? "active" : ""}
                    onClick={() => setLibraryDomain(item.id)}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
              <div className="library-grid">
                {filtered.map((item) => {
                  const itemDomain = domains.find((d) => d.id === item.domain)!;
                  const Icon = domainIcons[item.domain];
                  return (
                    <button
                      className="experiment-card"
                      key={item.id}
                      onClick={() => selectExperiment(item)}
                      style={
                        { "--domain-color": itemDomain.color } as CSSProperties
                      }
                    >
                      <div className="experiment-card-art">
                        <Icon size={68} strokeWidth={0.8} />
                        <span>
                          {String(experiments.indexOf(item) + 1).padStart(
                            2,
                            "0",
                          )}
                        </span>
                        <div className="art-orbit" />
                      </div>
                      <div className="experiment-card-content">
                        <span className="eyebrow">{itemDomain.name}</span>
                        <h2>{item.title}</h2>
                        <p>{item.description}</p>
                        <div>
                          <span>Abrir experimento</span>
                          <ArrowRight size={17} />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {filtered.length === 0 && (
                <div className="empty-state">
                  <Search size={32} />
                  <h2>No encontramos ese experimento</h2>
                  <p>
                    Prueba con «onda», «campo» o «energía», o cambia de dominio.
                  </p>
                  <button
                    className="secondary-button"
                    onClick={() => {
                      setSearch("");
                      setLibraryDomain("all");
                    }}
                  >
                    Ver todos
                  </button>
                </div>
              )}
            </>
          )}
          {page === "notebook" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    OBSERVACIONES QUE SE CONVIERTEN EN IDEAS
                  </div>
                  <h1>
                    Mi cuaderno<span className="heading-dot">.</span>
                  </h1>
                  <p>
                    Tus mediciones y parámetros, guardados en este navegador.
                    Hasta 100 capturas.
                  </p>
                </div>
                <button
                  className="secondary-button"
                  onClick={exportNotebook}
                  disabled={!measurements.length}
                >
                  <ArrowDownToLine size={16} />
                  Exportar cuaderno
                </button>
              </div>
              {!measurements.length ? (
                <div className="empty-state">
                  <NotebookPen size={40} strokeWidth={1.1} />
                  <span className="eyebrow">
                    EL INICIO DE UN DESCUBRIMIENTO
                  </span>
                  <h2>Tu primera observación te espera.</h2>
                  <p>
                    Guarda una medición desde el laboratorio para comparar
                    resultados y recuperar su configuración inicial.
                  </p>
                  <button
                    className="primary-button"
                    onClick={() => setPage("lab")}
                  >
                    <Plus size={17} />
                    Ir al laboratorio
                  </button>
                </div>
              ) : (
                <div className="notebook-list">
                  {measurements.map((item) => (
                    <article className="notebook-entry" key={item.id}>
                      <div className="notebook-entry-header">
                        <div>
                          <span className="eyebrow">
                            {new Date(item.created).toLocaleString("es-ES")}
                          </span>
                          <h2>{item.title}</h2>
                          <span className="mono">
                            t = {formatNumber(item.time)} {item.timeUnit}
                          </span>
                        </div>
                        <button
                          className="icon-button"
                          aria-label={`Eliminar medición de ${item.title}`}
                          onClick={() =>
                            persistMeasurements(
                              measurements.filter((m) => m.id !== item.id),
                            )
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="notebook-metrics">
                        {item.metrics.map((m) => (
                          <div key={m.label}>
                            <span>{m.label}</span>
                            <strong>
                              {formatNumber(m.value)} <small>{m.unit}</small>
                            </strong>
                          </div>
                        ))}
                      </div>
                      <button
                        className="text-button"
                        onClick={() => {
                          const original = experiments.find(
                            (e) => e.id === item.experimentId,
                          );
                          if (original) {
                            selectExperiment(original, item.params);
                            notify(
                              "Configuración recuperada · simulación desde t = 0",
                            );
                          }
                        }}
                      >
                        Recuperar configuración inicial <ArrowRight size={13} />
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
          <footer className="main-footer">
            <span>
              PHYSICA <span className="footer-divider">/</span> Un espacio para
              entender el universo.
            </span>
            <span>
              Física clásica & moderna <span className="small-dot" />
            </span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
        </div>
      )}
      {dialog === "guide" && (
        <Dialog
          title={`Guía · ${experiment.title}`}
          close={() => setDialog(null)}
        >
          <div className="guide-body">
            <span className="eyebrow">OBSERVA · FORMULA · CONTRASTA</span>
            <h3>Un experimento, una pregunta.</h3>
            <p className="challenge">{experiment.challenge}</p>
            <ol>
              <li>
                <strong>Prepara el modelo.</strong> Elige una configuración
                inicial y lee los supuestos.
              </li>
              <li>
                <strong>Haz una predicción.</strong> Usa la ecuación antes de
                cambiar un parámetro.
              </li>
              <li>
                <strong>Experimenta.</strong> Pausa, avanza por pasos y guarda
                mediciones.
              </li>
              <li>
                <strong>Contrasta los resultados.</strong> Exporta los datos y
                compara con tu predicción.
              </li>
            </ol>
            <Formula value={experiment.formula} />
            <p className="muted">{experiment.method}</p>
            <a
              className="reference-link"
              href={experiment.reference.url}
              target="_blank"
              rel="noreferrer"
            >
              {experiment.reference.label}
              <MoveUpRight size={14} />
            </a>
            <button className="primary-button" onClick={() => setDialog(null)}>
              Volver al experimento
              <ArrowRight size={16} />
            </button>
          </div>
        </Dialog>
      )}
      {dialog === "help" && (
        <Dialog
          title="Tu laboratorio, a tu ritmo"
          close={() => setDialog(null)}
        >
          <div className="guide-body">
            <p>
              Explora trece experimentos en seis dominios. Todos los modelos se
              ejecutan en tu navegador, sin cuentas ni servicios de cálculo
              externos.
            </p>
            <h3>Controles esenciales</h3>
            <dl className="keyboard-help">
              <div>
                <dt>
                  <kbd>Espacio</kbd>
                </dt>
                <dd>Reproducir o pausar</dd>
              </div>
              <div>
                <dt>
                  <kbd>R</kbd>
                </dt>
                <dd>Reiniciar con los parámetros actuales</dd>
              </div>
              <div>
                <dt>
                  <SkipForward size={16} />
                </dt>
                <dd>Avanzar un paso con la simulación en pausa</dd>
              </div>
            </dl>
            <h3>Reproducibilidad y datos</h3>
            <p>
              Modificar parámetros reinicia el modelo. «Copiar configuración»
              crea un enlace con las condiciones iniciales; requiere acceso a
              esta misma instancia. El cuaderno guarda las últimas 100
              mediciones en este navegador. Exporta un CSV para conservarlas
              fuera de él.
            </p>
            <h3>Tiempo físico y tiempo visual</h3>
            <p>
              La reproducción está escalada según el fenómeno. El reloj muestra
              las unidades del modelo. Óptica, campo estático, Carnot y el
              diagrama de Lorentz incluyen animaciones ilustrativas; sus
              supuestos están indicados en cada experimento.
            </p>
            <p className="muted">
              Las simulaciones son modelos educativos con aproximaciones
              explícitas. Consulta «Método» y «Supuestos» para interpretar sus
              resultados.
            </p>
          </div>
        </Dialog>
      )}
      <dialog
        ref={canvasDialog}
        className="canvas-dialog"
        onCancel={() => setExpanded(false)}
      >
        <div className="panel-header">
          <h2>{experiment.title}</h2>
          <button
            className="icon-button"
            aria-label="Cerrar vista ampliada"
            onClick={() => setExpanded(false)}
          >
            <X size={22} />
          </button>
        </div>
        {expanded && canvasElement}
        <div className="expanded-controls">
          <button className="secondary-button" onClick={toggleRunning}>
            {running ? <Pause size={16} /> : <Play size={16} />}
            {running ? "Pausar" : "Reproducir"}
          </button>
          <span className="mono">
            t = {simulation.time.toFixed(2)} {experiment.timeUnit}
          </span>
          <button className="text-button" onClick={() => setExpanded(false)}>
            <ArrowLeft size={15} />
            Volver al laboratorio
          </button>
        </div>
      </dialog>
    </div>
  );
}

function GraduationIcon() {
  return <Radio size={13} strokeWidth={1.6} />;
}
