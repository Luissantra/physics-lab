# PHYSICA · Physics Lab

Laboratorio virtual universitario de física clásica y moderna, en español.
Trece experimentos interactivos en seis dominios, con ecuaciones, observables,
gráficas sincronizadas, guías de práctica y supuestos explícitos.

## Ejecutar

Requisitos: Node.js 22.12 o posterior compatible con Vite 7, npm.
Desarrollado y validado con Node.js 22.21.0.

```sh
npm ci
npm run dev
```

Vite sirve la aplicación en el puerto 5173. No hacen falta variables de entorno,
credenciales, base de datos ni backend. El cálculo y el almacenamiento del
cuaderno son locales. Las fuentes, iconos y ecuaciones se incluyen en el build.
Los únicos enlaces externos de la aplicación llevan a bibliografía.

```sh
npm run check         # ESLint, TypeScript, pruebas numéricas y build
npm run format:check  # Prettier
npm run build        # Genera dist/
npm run preview      # Sirve el build en el puerto 4173
```

La instalación de dependencias nuevas con npm 10.9.4 puede encontrar un fallo
de resolución de pares opcionales de Vitest (`edgesOut`). Para actualizar
dependencias, se verificó como alternativa `npx npm@11.6.2 install`.
`npm ci` usa el archivo de bloqueo del proyecto.

## Experimentos y métodos

| Dominio              | Experimento           | Modelo / método                                                           |
| -------------------- | --------------------- | ------------------------------------------------------------------------- |
| Mecánica clásica     | Oscilador armónico    | RK4; masa, rigidez y amortiguamiento viscoso; balance cinético/potencial  |
| Mecánica clásica     | Órbitas gravitatorias | Velocity Verlet; partícula de prueba, unidades UA/M☉/año                  |
| Mecánica clásica     | Péndulo doble         | Euler–Lagrange + RK4; dos condiciones iniciales próximas                  |
| Ondas y óptica       | Doble rendija         | Fraunhofer, rendijas de anchura finita, envolvente de difracción          |
| Ondas y óptica       | Ondas estacionarias   | Solución analítica de la cuerda ideal con extremos fijos                  |
| Electromagnetismo    | Fuerza de Lorentz     | Boris; protón en campos E y B cruzados                                    |
| Electromagnetismo    | Dipolo eléctrico      | Superposición de Coulomb, potencial y sonda desplazable                   |
| Termodinámica        | Gas ideal             | Partículas 3D balísticas, paredes elásticas, muestra de Maxwell–Boltzmann |
| Termodinámica        | Motor de Carnot       | Ciclo reversible analítico P–V; γ = 5/3 y n = 1 mol                       |
| Relatividad especial | Diagrama de Minkowski | Transformación de Lorentz, cono de luz e intervalo invariante             |
| Relatividad especial | Viaje de los gemelos  | Tiempo propio por tramos con retorno instantáneo idealizado               |
| Mecánica cuántica    | Paquete de onda       | Schrödinger 1D, partícula libre o potencial armónico                      |
| Mecánica cuántica    | Efecto túnel          | Paquete gaussiano incidente sobre barrera rectangular                     |

### Interpretación física

- **Tiempo:** el reloj usa las unidades de cada modelo. La reproducción por
  segundo de pantalla es 1 s en mecánica/ondas, 0,15 años en órbitas, 5 μs en
  Lorentz, 20 ps en gas, 0,7 años en gemelos y 0,7 unidades atómicas en cuántica.
  El selector 0,25×–2× multiplica estas tasas. Un paso equivale a 1/60 de esa
  tasa base, independientemente del selector.
- **Animaciones ilustrativas:** los frentes ópticos no oscilan a frecuencia
  real. Carnot recorre una etapa en tres segundos visuales. El dipolo es
  estático y el evento de Minkowski no depende de la animación de luz.
- **Cuántica:** ℏ = m = 1, 481 nodos en [−24, 24], Δx = 0,1,
  Crank–Nicolson con Δt ≤ 0,01 y extremos de Dirichlet. La evolución no
  renormaliza la función de onda. Se detiene en t = 8; pueden existir
  efectos de borde, especialmente en las colas de mayor momento.
  La barrera se discretiza como intervalo semiabierto [−w/2, w/2).
  La curva del potencial tiene escala visual separada y normalizada.
  P(derecha) es una probabilidad instantánea, no un coeficiente de transmisión
  asintótico ni la probabilidad de una partícula de energía única.
- **Gas:** 60–300 átomos de argón, sin fuerzas entre partículas. Semilla fija
  42, velocidades gaussianas sin velocidad neta inicial y energía
  normalizada a 3NkBT/2. La presión es la ecuación de estado, no una
  estimación de impactos. La diferencia de entropía compara volúmenes a
  la misma temperatura y número de partículas con V₀ = (20 nm)³.
- **Escala gráfica:** los tamaños de masas, cargas, estrellas y partículas
  son esquemáticos. Las flechas del dipolo se normalizan; los valores
  cuantitativos están en las tarjetas, gráficas y CSV.

Cada experimento incluye su método, condiciones iniciales, limitaciones,
una pregunta de investigación y referencia bibliográfica.

## Uso

- Selecciona un dominio en la barra lateral o busca en «Explorar experimentos».
- Modificar un parámetro o elegir un preset **reinicia el estado y el tiempo**.
- Espacio reproduce/pausa; `R` reinicia. Los atajos no interfieren con campos,
  botones ni diálogos. Se puede avanzar un paso o ampliar la visualización.
- «Copiar configuración» genera una URL con el experimento y parámetros
  validados; reproduce la configuración inicial, no el estado de una
  simulación avanzada. La persona receptora necesita acceso a esa instancia.
- «Guardar medición» captura tiempo, parámetros y observables en el cuaderno.
  Se conservan las últimas 100 capturas en `localStorage`, solo en ese
  navegador/origen. Recuperar una configuración comienza en t = 0.
- El CSV del experimento contiene parámetros, método, observables y el
  perfil actual o las últimas 400 muestras temporales. El CSV del cuaderno
  incluye todas las capturas conservadas. Los números usan punto decimal.
- Con `prefers-reduced-motion`, el laboratorio empieza pausado.

## Estructura

```text
src/physics/catalog.ts       Controles, presets, ecuaciones y guías
src/physics/math.ts          Leyes analíticas y utilidades numéricas
src/physics/quantum.ts       Solver complejo de Crank–Nicolson
src/physics/simulation.ts    Estado físico, avance, medidas y perfiles
src/physics/render.ts        Visualizaciones Canvas 2D
src/physics/physics.test.ts  Pruebas cuantitativas e invariantes
src/components/             Gráficas SVG, fórmulas KaTeX y diálogos
src/storage.ts              Cuaderno, parámetros compartidos y CSV
src/App.tsx                 Interfaz y reproducción
```

React + TypeScript + Vite. No se envían datos a servidores. El cambio de
sección pausa la evolución; ocultar la pestaña no acumula tiempo físico.
Las preferencias de visualización son locales a la sesión.

## Validación científica

Las pruebas comprueban el período y la disipación del oscilador, cierre y
conservación orbital, energía del péndulo, mínimos de interferencia,
extremos de la cuerda, relación E = −∇V, energía y trabajo en Boris,
equipartición y reflexión en el gas, ley de Boyle, continuidad y trabajo
de Carnot, invariancia de Lorentz, tiempo propio de los gemelos,
norma/energía cuánticas, dispersión libre y transmisión de paquetes.

También se ejercitan todos los modelos en los extremos de sus controles.
Estas pruebas validan los modelos implementados y sus tolerancias; no
sustituyen una revisión curricular ni pruebas de interfaz en navegador.

## Publicación

`dist/` es un sitio estático que puede alojarse en cualquier servicio HTTPS.
La navegación usa estado y parámetros de consulta, sin rutas de servidor.
El build usa rutas desde la raíz; para alojarlo bajo un subdirectorio,
configura `base` en Vite antes de compilar.

El repositorio incluye una acción de GitHub que ejecuta los checks en los PR
y en `main`. Publicar el repositorio no despliega automáticamente el sitio.
