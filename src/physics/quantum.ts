export class WaveFunction {
  readonly dx = 0.1;
  readonly n = 481;
  readonly x = Array.from({ length: this.n }, (_, i) => -24 + i * this.dx);
  real = new Float64Array(this.n);
  imag = new Float64Array(this.n);
  readonly potential: Float64Array;
  private cr = new Float64Array(this.n);
  private ci = new Float64Array(this.n);
  private dr = new Float64Array(this.n);
  private di = new Float64Array(this.n);

  constructor(
    momentum: number,
    sigma: number,
    potential: (x: number) => number,
  ) {
    this.potential = Float64Array.from(this.x, potential);
    for (let i = 1; i < this.n - 1; i++) {
      const amplitude = Math.exp(-((this.x[i] + 7) ** 2) / (4 * sigma * sigma));
      this.real[i] = amplitude * Math.cos(momentum * this.x[i]);
      this.imag[i] = amplitude * Math.sin(momentum * this.x[i]);
    }
    const normalization = Math.sqrt(this.norm());
    for (let i = 0; i < this.n; i++) {
      this.real[i] /= normalization;
      this.imag[i] /= normalization;
    }
  }

  density(i: number): number {
    return this.real[i] ** 2 + this.imag[i] ** 2;
  }

  norm(): number {
    let norm = 0;
    for (let i = 0; i < this.n; i++) norm += this.density(i) * this.dx;
    return norm;
  }

  meanX(): number {
    let result = 0;
    for (let i = 0; i < this.n; i++)
      result += this.x[i] * this.density(i) * this.dx;
    return result / this.norm();
  }

  variance(): number {
    const mean = this.meanX();
    let result = 0;
    for (let i = 0; i < this.n; i++)
      result += (this.x[i] - mean) ** 2 * this.density(i) * this.dx;
    return result / this.norm();
  }

  energy(): number {
    let result = 0;
    for (let i = 1; i < this.n - 1; i++) {
      const kinetic =
        -(
          this.real[i] *
            (this.real[i + 1] - 2 * this.real[i] + this.real[i - 1]) +
          this.imag[i] *
            (this.imag[i + 1] - 2 * this.imag[i] + this.imag[i - 1])
        ) /
        (2 * this.dx ** 2);
      result += (kinetic + this.potential[i] * this.density(i)) * this.dx;
    }
    return result;
  }

  probabilityRight(edge: number): number {
    let result = 0;
    for (let i = 0; i < this.n; i++)
      if (this.x[i] > edge + 1e-9) result += this.density(i) * this.dx;
    return result;
  }

  step(dt: number): void {
    const h = dt / (4 * this.dx ** 2);
    for (let i = 1; i < this.n - 1; i++) {
      const diagonal = (dt / 2) * (1 / this.dx ** 2 + this.potential[i]);
      let rr =
        this.real[i] +
        diagonal * this.imag[i] -
        h * (this.imag[i - 1] + this.imag[i + 1]);
      let ri =
        this.imag[i] -
        diagonal * this.real[i] +
        h * (this.real[i - 1] + this.real[i + 1]);
      const denominatorR = 1 - h * this.ci[i - 1];
      const denominatorI = diagonal + h * this.cr[i - 1];
      rr -= h * this.di[i - 1];
      ri += h * this.dr[i - 1];
      const square = denominatorR ** 2 + denominatorI ** 2;
      this.cr[i] = (-h * denominatorI) / square;
      this.ci[i] = (-h * denominatorR) / square;
      this.dr[i] = (rr * denominatorR + ri * denominatorI) / square;
      this.di[i] = (ri * denominatorR - rr * denominatorI) / square;
    }
    for (let i = this.n - 2; i >= 1; i--) {
      this.real[i] =
        this.dr[i] -
        (this.cr[i] * this.real[i + 1] - this.ci[i] * this.imag[i + 1]);
      this.imag[i] =
        this.di[i] -
        (this.cr[i] * this.imag[i + 1] + this.ci[i] * this.real[i + 1]);
    }
  }
}
