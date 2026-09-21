export type DomainId =
  | "mechanics"
  | "waves"
  | "electromagnetism"
  | "thermodynamics"
  | "relativity"
  | "quantum";
export type ExperimentId =
  | "oscillator"
  | "orbit"
  | "chaos"
  | "interference"
  | "wave"
  | "charge"
  | "dipole"
  | "gas"
  | "carnot"
  | "lorentz"
  | "twin"
  | "packet"
  | "tunnel";
export type Params = Record<string, number>;
export interface Control {
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  value: number;
}
export interface Experiment {
  id: ExperimentId;
  domain: DomainId;
  title: string;
  short: string;
  description: string;
  tag: string;
  controls: Control[];
  formula: string;
  theory: string;
  method: string;
  assumptions: string;
  challenge: string;
  reference: { label: string; url: string };
  presets: { name: string; params: Params }[];
  timeUnit: string;
  chartTitle: string;
  series: [string, string];
  chartUnit: string;
}

export const domains: {
  id: DomainId;
  name: string;
  subtitle: string;
  color: string;
}[] = [
  {
    id: "mechanics",
    name: "Mecánica clásica",
    subtitle: "Movimiento y equilibrio",
    color: "#b5f6cd",
  },
  {
    id: "waves",
    name: "Ondas y óptica",
    subtitle: "La naturaleza de la luz",
    color: "#93c5fd",
  },
  {
    id: "electromagnetism",
    name: "Electromagnetismo",
    subtitle: "Campos e interacciones",
    color: "#f7cd87",
  },
  {
    id: "thermodynamics",
    name: "Termodinámica",
    subtitle: "Del micro al macro",
    color: "#f5a893",
  },
  {
    id: "relativity",
    name: "Relatividad especial",
    subtitle: "Espacio y tiempo",
    color: "#c6b0ff",
  },
  {
    id: "quantum",
    name: "Mecánica cuántica",
    subtitle: "Más allá de lo clásico",
    color: "#8ce0e2",
  },
];

const c = (
  key: string,
  label: string,
  unit: string,
  min: number,
  max: number,
  step: number,
  value: number,
): Control => ({ key, label, unit, min, max, step, value });
const reference = (volume: number, chapter: string) => ({
  label: `OpenStax · University Physics, vol. ${volume}`,
  url: `https://openstax.org/books/university-physics-volume-${volume}/pages/${chapter}`,
});

export const experiments: Experiment[] = [
  {
    id: "oscillator",
    domain: "mechanics",
    title: "Oscilador armónico",
    short: "Oscilaciones",
    description:
      "Una masa, un muelle y las leyes que conectan el movimiento con la energía.",
    tag: "DINÁMICA",
    controls: [
      c("mass", "Masa", "kg", 0.2, 5, 0.1, 1),
      c("k", "Constante elástica", "N/m", 1, 40, 0.5, 8),
      c("amplitude", "Desplazamiento inicial", "m", 0.1, 2, 0.05, 1),
      c("damping", "Amortiguamiento", "kg/s", 0, 5, 0.05, 0),
    ],
    formula: String.raw`m\ddot{x}+b\dot{x}+kx=0 \qquad E=\tfrac12 m v^2+\tfrac12 kx^2`,
    theory:
      "La fuerza recuperadora es proporcional al desplazamiento. Sin rozamiento, la energía alterna entre cinética y potencial y el período es T = 2π√(m/k). Con amortiguamiento, dE/dt = −bv²; la energía mecánica ya no se conserva.",
    method:
      "Runge–Kutta de cuarto orden, paso interno ≤ 1/240 s. Condiciones iniciales: x(0) = A, v(0) = 0.",
    assumptions:
      "Muelle ideal y lineal, masa puntual, movimiento unidimensional y rozamiento viscoso. La escala visual del muelle es esquemática.",
    challenge:
      "Duplica la masa. ¿En qué factor cambia el período? Después aumenta el amortiguamiento hasta b = 2√(mk) y observa la transición crítica.",
    reference: reference(1, "15-1-simple-harmonic-motion"),
    presets: [
      {
        name: "Sin rozamiento",
        params: { mass: 1, k: 8, amplitude: 1, damping: 0 },
      },
      {
        name: "Amortiguado",
        params: { mass: 1, k: 8, amplitude: 1, damping: 0.8 },
      },
      { name: "Crítico", params: { mass: 1, k: 4, amplitude: 1, damping: 4 } },
    ],
    timeUnit: "s",
    chartTitle: "Intercambio de energía",
    series: ["Cinética", "Potencial"],
    chartUnit: "J",
  },
  {
    id: "orbit",
    domain: "mechanics",
    title: "Órbitas gravitatorias",
    short: "Órbitas",
    description:
      "Traza una órbita y descubre el equilibrio entre inercia y atracción gravitatoria.",
    tag: "GRAVITACIÓN",
    controls: [
      c("radius", "Distancia inicial", "UA", 0.5, 2, 0.05, 1),
      c("speed", "Velocidad / circular", "×", 0.55, 1.35, 0.01, 1),
      c("star", "Masa estelar", "M☉", 0.5, 2, 0.1, 1),
    ],
    formula: String.raw`\ddot{\mathbf r}=-\frac{GM}{r^3}\mathbf r \qquad \varepsilon=\frac{v^2}{2}-\frac{GM}{r}`,
    theory:
      "Las órbitas keplerianas conservan energía específica y momento angular. La velocidad circular es √(GM/r); a partir de √2 veces ese valor, la trayectoria deja de estar ligada.",
    method:
      "Velocity Verlet con paso ≤ 1/4000 años. G = 4π² UA³ M☉⁻¹ año⁻². La masa central permanece fija.",
    assumptions:
      "Partícula de prueba, gravedad newtoniana y dos cuerpos sin perturbaciones. Los radios de los objetos se exageran para hacerlos visibles.",
    challenge:
      "Reduce la velocidad inicial a 0,75 veces la circular. Compara las velocidades en periastro y apoastro y verifica que el momento angular se mantiene.",
    reference: reference(1, "13-5-keplers-laws-of-planetary-motion"),
    presets: [
      { name: "Circular", params: { radius: 1, speed: 1, star: 1 } },
      { name: "Elíptica", params: { radius: 1, speed: 0.75, star: 1 } },
    ],
    timeUnit: "años",
    chartTitle: "Energía específica",
    series: ["Cinética", "Potencial"],
    chartUnit: "UA²/año²",
  },
  {
    id: "chaos",
    domain: "mechanics",
    title: "Péndulo doble",
    short: "Caos",
    description:
      "Dos condiciones casi idénticas. Dos trayectorias que acaban siendo distintas.",
    tag: "CAOS",
    controls: [
      c("angle", "Ángulo inicial", "°", 10, 170, 1, 120),
      c("length", "Longitud de cada varilla", "m", 0.5, 2, 0.1, 1),
      c("delta", "Perturbación angular", "°", 0.01, 2, 0.01, 0.2),
    ],
    formula: String.raw`\frac{d}{dt}\frac{\partial L}{\partial\dot{\theta}_i}-\frac{\partial L}{\partial\theta_i}=0,\quad L=T-V`,
    theory:
      "La dinámica no lineal del péndulo doble puede amplificar pequeñas diferencias iniciales. Las dos trayectorias usan masas y longitudes iguales; solo difiere el ángulo inicial de la primera varilla.",
    method:
      "Ecuaciones de Euler–Lagrange para dos masas de 1 kg, integradas por RK4 con paso ≤ 1/480 s; g = 9,81 m/s². Ambas masas parten del reposo con el mismo ángulo.",
    assumptions:
      "Varillas rígidas sin masa y articulaciones sin fricción. La separación no es un cálculo del exponente de Lyapunov.",
    challenge:
      "Compara 20° con 120°. ¿La misma perturbación crece igual de rápido? Observa la energía total para distinguir caos físico de error numérico.",
    reference: {
      label: "MIT OCW · Classical Mechanics",
      url: "https://ocw.mit.edu/courses/8-01sc-classical-mechanics-fall-2016/",
    },
    presets: [
      {
        name: "Régimen caótico",
        params: { angle: 120, length: 1, delta: 0.2 },
      },
      { name: "Ángulo pequeño", params: { angle: 20, length: 1, delta: 0.2 } },
    ],
    timeUnit: "s",
    chartTitle: "Conservación de energía",
    series: ["Sistema A", "Sistema B"],
    chartUnit: "J",
  },
  {
    id: "interference",
    domain: "waves",
    title: "La doble rendija",
    short: "Interferencia",
    description:
      "Superpón dos fuentes coherentes y revela la estructura de la interferencia.",
    tag: "ÓPTICA",
    controls: [
      c("lambda", "Longitud de onda", "nm", 380, 750, 5, 550),
      c("separation", "Separación de rendijas", "mm", 0.1, 0.8, 0.01, 0.3),
      c("width", "Ancho / separación", "×", 0.05, 0.8, 0.01, 0.2),
      c("screen", "Distancia a la pantalla", "m", 0.5, 3, 0.1, 1.5),
    ],
    formula: String.raw`\frac{I}{I_0}=\cos^2\!\left(\frac{\pi d\sin\theta}{\lambda}\right)\operatorname{sinc}^2\!\left(\frac{\pi a\sin\theta}{\lambda}\right)`,
    theory:
      "El término cos² genera las franjas de interferencia y el término sinc² aporta la envolvente de difracción de cada rendija. Se usa sinc(u) = sin(u)/u y sinθ = y/√(L²+y²).",
    method:
      "Solución analítica de Fraunhofer. Perfil de intensidad en la pantalla; los frentes de onda se animan a velocidad ilustrativa, no a la frecuencia óptica real.",
    assumptions:
      "Luz monocromática y coherente, rendijas idénticas uniformes y campo lejano. Se muestra el número de Fresnel a²/(λL) para comprobar la aproximación.",
    challenge:
      "Duplica la longitud de onda y mide la separación aproximada Δy ≈ λL/d. Luego aumenta el ancho relativo: ¿qué sucede con la envolvente?",
    reference: reference(3, "4-3-double-slit-diffraction"),
    presets: [
      {
        name: "Luz verde",
        params: { lambda: 550, separation: 0.3, width: 0.2, screen: 1.5 },
      },
      {
        name: "Luz roja",
        params: { lambda: 700, separation: 0.3, width: 0.2, screen: 1.5 },
      },
    ],
    timeUnit: "s visuales",
    chartTitle: "Intensidad en la pantalla",
    series: ["Interferencia", "Envolvente"],
    chartUnit: "I/I₀",
  },
  {
    id: "wave",
    domain: "waves",
    title: "Ondas estacionarias",
    short: "Propagación",
    description:
      "Dos ondas que viajan en sentidos opuestos construyen nodos y vientres.",
    tag: "SUPERPOSICIÓN",
    controls: [
      c("mode", "Modo normal", "n", 1, 6, 1, 2),
      c("length", "Longitud de la cuerda", "m", 1, 5, 0.1, 2),
      c("tension", "Tensión", "N", 1, 30, 1, 8),
      c("density", "Densidad lineal", "kg/m", 0.1, 2, 0.1, 0.5),
    ],
    formula: String.raw`y(x,t)=2A\sin\!\left(\frac{n\pi x}{L}\right)\cos(\omega_n t),\quad \omega_n=\frac{n\pi}{L}\sqrt{\frac{T}{\mu}}`,
    theory:
      "Los extremos fijos seleccionan longitudes de onda λn = 2L/n. La superposición de dos ondas de amplitud A = 0,1 m forma una onda estacionaria de amplitud máxima 0,2 m.",
    method:
      "Solución analítica de la ecuación de ondas ideal. Perfil espacial actualizado con el tiempo físico.",
    assumptions:
      "Cuerda ideal, tensión constante y amplitudes pequeñas; se ignoran dispersión y pérdidas.",
    challenge:
      "Cuadruplica la tensión. Predice cómo cambian la frecuencia y la velocidad de propagación antes de observarlas.",
    reference: reference(1, "16-6-standing-waves-and-resonance"),
    presets: [
      {
        name: "Fundamental",
        params: { mode: 1, length: 2, tension: 8, density: 0.5 },
      },
      {
        name: "Tercer armónico",
        params: { mode: 3, length: 2, tension: 8, density: 0.5 },
      },
    ],
    timeUnit: "s",
    chartTitle: "Perfil de la cuerda",
    series: ["Desplazamiento", "Envolvente"],
    chartUnit: "m",
  },
  {
    id: "charge",
    domain: "electromagnetism",
    title: "Partícula en un campo",
    short: "Fuerza de Lorentz",
    description:
      "Desvía un protón con campos eléctricos y magnéticos uniformes.",
    tag: "ELECTRODINÁMICA",
    controls: [
      c("magnetic", "Campo magnético Bz", "mT", 1, 10, 0.1, 4),
      c("electric", "Campo eléctrico Ey", "V/m", -300, 300, 10, 0),
      c("velocity", "Velocidad inicial vx", "km/s", 30, 200, 5, 100),
    ],
    formula: String.raw`m\dot{\mathbf v}=q(\mathbf E+\mathbf v\times\mathbf B),\qquad r_L=\frac{mv_\perp}{|q|B}`,
    theory:
      "El campo magnético cambia la dirección de la velocidad sin realizar trabajo. Un campo eléctrico perpendicular añade una deriva E×B de velocidad Ey/Bz en la dirección x.",
    method:
      "Integrador de Boris con paso ≤ 0,01 μs. Protón: q = 1,602176634×10⁻¹⁹ C y m = 1,672621924×10⁻²⁷ kg.",
    assumptions:
      "Campos uniformes, régimen no relativista, sin radiación ni interacción con otras partículas. Los puntos representan Bz positivo, saliendo del plano.",
    challenge:
      "Sin campo eléctrico, duplica B. ¿Se reduce el radio a la mitad sin cambiar la energía cinética? Activa Ey y observa la deriva.",
    reference: reference(
      2,
      "11-3-motion-of-a-charged-particle-in-a-magnetic-field",
    ),
    presets: [
      {
        name: "Órbita ciclotrón",
        params: { magnetic: 4, electric: 0, velocity: 100 },
      },
      {
        name: "Campos cruzados",
        params: { magnetic: 4, electric: 200, velocity: 100 },
      },
    ],
    timeUnit: "μs",
    chartTitle: "Velocidad de la partícula",
    series: ["vx", "vy"],
    chartUnit: "km/s",
  },
  {
    id: "dipole",
    domain: "electromagnetism",
    title: "Campo de un dipolo",
    short: "Campos eléctricos",
    description:
      "Explora el potencial y el campo que emergen de dos cargas opuestas.",
    tag: "ELECTROSTÁTICA",
    controls: [
      c("q", "Magnitud de las cargas", "nC", 1, 10, 0.5, 3),
      c("distance", "Separación", "m", 0.5, 2, 0.1, 1),
      c("probe", "Posición x de la sonda", "m", -2, 2, 0.05, 0.6),
      c("height", "Posición y de la sonda", "m", 0.2, 1.8, 0.05, 0.8),
    ],
    formula: String.raw`\mathbf E(\mathbf r)=k_e\sum_i\frac{q_i(\mathbf r-\mathbf r_i)}{|\mathbf r-\mathbf r_i|^3},\qquad V=k_e\sum_i\frac{q_i}{|\mathbf r-\mathbf r_i|}`,
    theory:
      "La superposición vectorial de dos campos de Coulomb produce el dipolo. El campo apunta en la dirección de máximo descenso del potencial: E = −∇V.",
    method:
      "Evaluación analítica con ke = 8,9875517923×10⁹ N m²/C². Sonda en (x, y); perfil del potencial a la altura de la sonda.",
    assumptions:
      "Cargas puntuales fijas en el vacío, +q a la izquierda y −q a la derecha. Las flechas se normalizan para mostrar dirección; no representan la magnitud a escala. Modelo estático: el reloj no cambia el campo.",
    challenge:
      "Sitúa la sonda en x = 0. Comprueba que V = 0 y explica por qué el campo eléctrico no es cero.",
    reference: reference(2, "5-2-coulombs-law"),
    presets: [
      {
        name: "Dipolo simétrico",
        params: { q: 3, distance: 1, probe: 0, height: 0.8 },
      },
    ],
    timeUnit: "s",
    chartTitle: "Potencial a la altura de la sonda",
    series: ["Potencial", "Referencia cero"],
    chartUnit: "V",
  },
  {
    id: "gas",
    domain: "thermodynamics",
    title: "Gas ideal",
    short: "Teoría cinética",
    description:
      "Conecta el movimiento microscópico con temperatura, presión y entropía.",
    tag: "FÍSICA ESTADÍSTICA",
    controls: [
      c("temperature", "Temperatura", "K", 100, 800, 10, 300),
      c("size", "Lado del recipiente", "nm", 10, 40, 1, 20),
      c("count", "Número de partículas", "", 60, 300, 20, 160),
    ],
    formula: String.raw`PV=Nk_BT,\quad v_{\rm rms}=\sqrt{\frac{3k_BT}{m}},\quad \Delta S=Nk_B\ln\frac{V}{V_0}`,
    theory:
      "Un conjunto de átomos de argón sin interacciones representa el gas ideal clásico. Las velocidades iniciales siguen una distribución gaussiana, se elimina el movimiento del centro de masa y se normaliza su energía para fijar T. La entropía mostrada compara volúmenes a igual T y N con un cubo de 20 nm.",
    method:
      "Movimiento balístico 3D y reflexión especular exacta en las paredes. Proyección XY; masa del argón = 39,948 u. Presión calculada por PV = NkBT, no estimada de impactos.",
    assumptions:
      "Gas clásico diluido, sin colisiones entre partículas ni fuerzas intermoleculares. La distribución de rapidez es una muestra finita, no una curva exacta de Maxwell–Boltzmann. Cambiar parámetros prepara un nuevo equilibrio.",
    challenge:
      "Duplica el lado del recipiente a temperatura fija. ¿Por qué la presión se divide por ocho? Compara el histograma con la distribución teórica.",
    reference: reference(2, "2-3-heat-capacity-and-equipartition-of-energy"),
    presets: [
      { name: "Ambiente", params: { temperature: 300, size: 20, count: 160 } },
      {
        name: "Gas caliente",
        params: { temperature: 700, size: 20, count: 160 },
      },
    ],
    timeUnit: "ps",
    chartTitle: "Distribución de rapidez",
    series: ["Muestra", "Maxwell–Boltzmann"],
    chartUnit: "probabilidad / intervalo",
  },
  {
    id: "carnot",
    domain: "thermodynamics",
    title: "Motor de Carnot",
    short: "Ciclos y entropía",
    description:
      "Recorre el límite ideal de eficiencia de una máquina térmica reversible.",
    tag: "TERMODINÁMICA",
    controls: [
      c("hot", "Foco caliente", "K", 450, 900, 10, 600),
      c("cold", "Foco frío", "K", 200, 400, 10, 300),
      c("ratio", "Expansión isotérmica V₂/V₁", "×", 1.2, 3, 0.1, 2),
    ],
    formula: String.raw`\eta=1-\frac{T_c}{T_h},\quad Q_h=nRT_h\ln\frac{V_2}{V_1},\quad \oint dS=0`,
    theory:
      "Dos isotermas y dos adiabáticas forman un ciclo reversible. El trabajo neto es el área encerrada en el diagrama P–V y la eficiencia solo depende de las temperaturas de los focos.",
    method:
      "Trayectoria analítica de un mol de gas ideal monoatómico, γ = 5/3, V₁ = 10 L. Se recorre una etapa cada 3 segundos visuales, sin modelar una velocidad física del pistón.",
    assumptions:
      "Procesos cuasiestáticos y reversibles, sin fricción, gradientes ni pérdidas. ΔS del gas es cero por ciclo; durante cada etapa puede cambiar.",
    challenge:
      "Mantén las temperaturas y cambia la razón de expansión. Explica por qué aumenta el trabajo por ciclo sin cambiar la eficiencia.",
    reference: reference(2, "4-5-the-carnot-cycle"),
    presets: [
      {
        name: "Ciclo de referencia",
        params: { hot: 600, cold: 300, ratio: 2 },
      },
      { name: "Mayor eficiencia", params: { hot: 900, cold: 200, ratio: 2 } },
    ],
    timeUnit: "s visuales",
    chartTitle: "Diagrama presión–volumen",
    series: ["Ciclo de Carnot", "Estado actual"],
    chartUnit: "kPa",
  },
  {
    id: "lorentz",
    domain: "relativity",
    title: "Espacio-tiempo de Minkowski",
    short: "Transformaciones",
    description:
      "El mismo suceso, dos observadores. Cambia de marco sin cambiar las leyes.",
    tag: "RELATIVIDAD",
    controls: [
      c("beta", "Velocidad relativa v/c", "", -0.95, 0.95, 0.01, 0.6),
      c("eventX", "Posición del suceso x", "s-luz", -3, 3, 0.1, 1.5),
      c("eventT", "Tiempo del suceso t", "s", 0.5, 4, 0.1, 2.5),
    ],
    formula: String.raw`ct'=\gamma(ct-\beta x),\quad x'=\gamma(x-\beta ct),\quad \gamma=(1-\beta^2)^{-1/2}`,
    theory:
      "La transformación de Lorentz mezcla espacio y tiempo y conserva el intervalo s² = (ct)² − x². Las rectas de simultaneidad del observador móvil están inclinadas respecto a las del laboratorio.",
    method:
      "Transformación analítica en unidades c = 1 segundo-luz por segundo. Los ejes ct′ y x′ corresponden al sistema que se mueve a +βc. Los pulsos muestran el cono de luz.",
    assumptions:
      "Espacio-tiempo plano con una dimensión espacial. El suceso se fija con los controles; la animación de luz es ilustrativa y no modifica sus coordenadas.",
    challenge:
      "Elige un suceso con x > ct. Busca una velocidad para la que t′ cambie de signo. ¿Podría ocurrir lo mismo con un suceso de tipo tiempo?",
    reference: reference(3, "5-5-the-lorentz-transformation"),
    presets: [
      { name: "β = 0,6", params: { beta: 0.6, eventX: 1.5, eventT: 2.5 } },
      {
        name: "Separación espacial",
        params: { beta: 0.8, eventX: 3, eventT: 1 },
      },
    ],
    timeUnit: "s visuales",
    chartTitle: "Coordenadas del suceso al variar β",
    series: ["ct′", "x′"],
    chartUnit: "s-luz",
  },
  {
    id: "twin",
    domain: "relativity",
    title: "El viaje de los gemelos",
    short: "Tiempo propio",
    description:
      "Compara el tiempo acumulado a lo largo de dos trayectorias en el espacio-tiempo.",
    tag: "TIEMPO PROPIO",
    controls: [
      c("beta", "Rapidez de la nave v/c", "", 0.1, 0.95, 0.01, 0.8),
      c("duration", "Duración terrestre del viaje", "años", 2, 20, 1, 10),
    ],
    formula: String.raw`\tau=\int \sqrt{1-\frac{v(t)^2}{c^2}}\,dt,\qquad \tau_{\rm nave}=\frac{T}{\gamma}`,
    theory:
      "La Tierra permanece en un marco inercial mientras la nave cambia de dirección a mitad de viaje. La asimetría entre sus trayectorias produce distintos tiempos propios al reencontrarse.",
    method:
      "Movimiento rectilíneo a rapidez constante por tramos, inversión instantánea idealizada en t = T/2. Los relojes muestran el tiempo propio acumulado en cada línea de universo.",
    assumptions:
      "Se desprecia la gravedad y se idealiza la aceleración de retorno. El viaje se detiene al reunirse los gemelos; se puede reiniciar.",
    challenge:
      "Para β = 0,8, predice cuántos años envejece la persona que viaja durante diez años terrestres.",
    reference: reference(3, "5-2-time-dilation"),
    presets: [
      { name: "Viaje de 10 años", params: { beta: 0.8, duration: 10 } },
      { name: "Velocidad extrema", params: { beta: 0.95, duration: 10 } },
    ],
    timeUnit: "años",
    chartTitle: "Relojes de los gemelos",
    series: ["Tierra", "Nave"],
    chartUnit: "años",
  },
  {
    id: "packet",
    domain: "quantum",
    title: "Paquete de onda",
    short: "Función de onda",
    description:
      "Observa cómo una amplitud compleja evoluciona y distribuye la probabilidad.",
    tag: "SCHRÖDINGER",
    controls: [
      c("momentum", "Momento medio k₀", "a.u.", 0, 3, 0.1, 1.5),
      c("sigma", "Anchura inicial σx", "a.u.", 0.7, 2, 0.1, 1),
      c("omega", "Frecuencia del potencial", "a.u.", 0, 0.6, 0.05, 0),
    ],
    formula: String.raw`i\hbar\partial_t\psi=\left[-\frac{\hbar^2}{2m}\partial_x^2+\frac12m\omega^2x^2\right]\psi,\quad \int|\psi|^2dx=1`,
    theory:
      "La función de onda inicial es una gaussiana de mínima incertidumbre centrada en x = −7: ψ ∝ exp[−(x+7)²/(4σx²)+ik₀x]. En el espacio libre el paquete se dispersa; el potencial armónico confina su movimiento.",
    method:
      "Crank–Nicolson complejo, Δx = 0,1 y Δt ≤ 0,01 en unidades ℏ = m = 1. Dominio [−24, 24], 481 nodos, extremos de Dirichlet ψ = 0. Sin renormalización durante la evolución.",
    assumptions:
      "Una partícula no relativista en una dimensión. Los bordes reflejan el paquete; la animación se detiene en t = 8 para limitar esos efectos. Las curvas Re ψ e Im ψ no son densidades de probabilidad.",
    challenge:
      "Con ω = 0, reduce σx. ¿Aumenta la dispersión? Comprueba ΔxΔp = ℏ/2 al inicio y observa que la norma se conserva.",
    reference: reference(3, "7-2-the-heisenberg-uncertainty-principle"),
    presets: [
      {
        name: "Partícula libre",
        params: { momentum: 1.5, sigma: 1, omega: 0 },
      },
      {
        name: "Confinamiento",
        params: { momentum: 1.5, sigma: 1, omega: 0.3 },
      },
    ],
    timeUnit: "a.u.",
    chartTitle: "Densidad de probabilidad",
    series: ["|ψ|²", "Potencial / escala"],
    chartUnit: "a.u.",
  },
  {
    id: "tunnel",
    domain: "quantum",
    title: "Efecto túnel",
    short: "Barreras de potencial",
    description:
      "Una barrera que sería infranqueable para una partícula clásica deja pasar probabilidad.",
    tag: "FÍSICA CUÁNTICA",
    controls: [
      c("momentum", "Momento medio k₀", "a.u.", 1, 3, 0.1, 2),
      c("sigma", "Anchura inicial σx", "a.u.", 0.7, 2, 0.1, 1.2),
      c("barrier", "Altura de la barrera", "a.u.", 0.5, 6, 0.1, 3),
      c("width", "Anchura de la barrera", "a.u.", 0.4, 2, 0.2, 0.8),
    ],
    formula: String.raw`i\partial_t\psi=-\tfrac12\partial_x^2\psi+V(x)\psi,\quad P_{\rm derecha}(t)=\int_{w/2}^{24}|\psi(x,t)|^2dx`,
    theory:
      "Un paquete gaussiano incidente se refleja y transmite ante una barrera rectangular centrada en x = 0. La energía no es única: el paquete contiene una distribución de momentos. La probabilidad a la derecha es instantánea y solo aproxima la transmisión final después de la colisión.",
    method:
      "Crank–Nicolson, ℏ = m = 1, Δx = 0,1, Δt ≤ 0,01, x ∈ [−24,24]. Gaussiana inicial centrada en −7. Se detiene en t = 8.",
    assumptions:
      "Barrera estática, extremos reflectantes lejanos y partícula no relativista. La anchura de la barrera se discretiza en la malla; la transmisión depende de toda la distribución de energías.",
    challenge:
      "Mantén E media por debajo de la barrera y duplica su anchura. Compara la probabilidad que llega a la derecha cuando la interacción haya terminado.",
    reference: reference(
      3,
      "7-6-the-quantum-tunneling-of-particles-through-potential-barriers",
    ),
    presets: [
      {
        name: "Túnel cuántico",
        params: { momentum: 2, sigma: 1.2, barrier: 3, width: 0.8 },
      },
      {
        name: "Sobre la barrera",
        params: { momentum: 3, sigma: 1.2, barrier: 1.5, width: 0.8 },
      },
    ],
    timeUnit: "a.u.",
    chartTitle: "Paquete y barrera",
    series: ["|ψ|²", "Potencial / escala"],
    chartUnit: "a.u.",
  },
];

export function defaults(experiment: Experiment): Params {
  return Object.fromEntries(
    experiment.controls.map((control) => [control.key, control.value]),
  );
}

export function findExperiment(id: string): Experiment {
  return (
    experiments.find((experiment) => experiment.id === id) ?? experiments[0]
  );
}
