/**
 * Rate Curve Bootstrapping Library
 * 
 * Implements multiple bootstrapping methods:
 * - Simple/Linear interpolation
 * - Cubic Spline interpolation
 * - Nelson-Siegel parametric model
 */

// ============ Types ============

export interface BootstrapPoint {
  tenor: number; // in years
  rate: number;  // in decimal (e.g., 0.0425 for 4.25%)
  source: 'futures' | 'swap';
}

export interface DiscountFactor {
  tenor: number;
  df: number;
  zeroRate: number;
  forwardRate?: number;
}

export interface BootstrapResult {
  method: BootstrapMethod;
  discountFactors: DiscountFactor[];
  parameters?: NelsonSiegelParams;
  curvePoints: { tenor: number; rate: number }[];
}

export type BootstrapMethod = 'linear' | 'cubic_spline' | 'nelson_siegel';

export interface NelsonSiegelParams {
  beta0: number;
  beta1: number;
  beta2: number;
  lambda: number;
}

// ============ Utility Functions ============

/**
 * Convert maturity string like "Dec '25" to years from now
 */
export function maturityToYears(maturity: string): number {
  const match = maturity.match(/(\w{3})\s*'?(\d{2})/);
  if (!match) return 0;

  const monthNames: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };

  const monthNum = monthNames[match[1]] ?? 0;
  const yearNum = 2000 + parseInt(match[2], 10);

  const maturityDate = new Date(yearNum, monthNum, 15);
  const today = new Date();
  const yearsToMaturity = (maturityDate.getTime() - today.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

  return Math.max(0.01, yearsToMaturity);
}

/**
 * Convert price to effective rate (for futures: 100 - price)
 */
export function priceToRate(price: number): number {
  return (100 - price) / 100;
}

// ============ Discount Factor Calculations ============

/**
 * Calculate discount factor from zero rate
 * DF = exp(-r * t)
 */
export function calculateDiscountFactor(rate: number, tenor: number): number {
  return Math.exp(-rate * tenor);
}

/**
 * Calculate zero rate from discount factor
 * r = -ln(DF) / t
 */
export function calculateZeroRate(df: number, tenor: number): number {
  if (tenor <= 0) return 0;
  return -Math.log(df) / tenor;
}

/**
 * Calculate forward rate between two tenors
 * f(t1,t2) = (r2*t2 - r1*t1) / (t2 - t1)
 */
export function calculateForwardRate(
  rate1: number,
  tenor1: number,
  rate2: number,
  tenor2: number
): number {
  if (tenor2 <= tenor1) return rate2;
  return (rate2 * tenor2 - rate1 * tenor1) / (tenor2 - tenor1);
}

// ============ Linear Interpolation ============

export function linearInterpolation(
  points: BootstrapPoint[],
  targetTenor: number
): number {
  if (points.length === 0) return 0;
  if (points.length === 1) return points[0].rate;

  const sorted = [...points].sort((a, b) => a.tenor - b.tenor);

  if (targetTenor <= sorted[0].tenor) return sorted[0].rate;
  if (targetTenor >= sorted[sorted.length - 1].tenor) return sorted[sorted.length - 1].rate;

  for (let i = 0; i < sorted.length - 1; i++) {
    if (targetTenor >= sorted[i].tenor && targetTenor <= sorted[i + 1].tenor) {
      const t1 = sorted[i].tenor;
      const t2 = sorted[i + 1].tenor;
      const r1 = sorted[i].rate;
      const r2 = sorted[i + 1].rate;
      const weight = (targetTenor - t1) / (t2 - t1);
      return r1 + weight * (r2 - r1);
    }
  }

  return sorted[sorted.length - 1].rate;
}

export function bootstrapLinear(points: BootstrapPoint[]): BootstrapResult {
  const sorted = [...points].sort((a, b) => a.tenor - b.tenor);
  const discountFactors: DiscountFactor[] = [];

  // Generate curve at regular intervals
  const maxTenor = Math.max(...sorted.map(p => p.tenor), 1);
  const step = maxTenor > 10 ? 0.5 : 0.25;
  const curvePoints: { tenor: number; rate: number }[] = [];

  for (let t = step; t <= maxTenor + step; t += step) {
    const rate = linearInterpolation(sorted, t);
    curvePoints.push({ tenor: t, rate });

    const df = calculateDiscountFactor(rate, t);
    const prevDf = discountFactors.length > 0 ? discountFactors[discountFactors.length - 1] : null;

    discountFactors.push({
      tenor: t,
      df,
      zeroRate: rate,
      forwardRate: prevDf
        ? calculateForwardRate(prevDf.zeroRate, prevDf.tenor, rate, t)
        : rate,
    });
  }

  return {
    method: 'linear',
    discountFactors,
    curvePoints,
  };
}

// ============ Cubic Spline Interpolation ============

interface SplineCoefficients {
  a: number[];
  b: number[];
  c: number[];
  d: number[];
  x: number[];
}

function calculateSplineCoefficients(points: BootstrapPoint[]): SplineCoefficients {
  const n = points.length;
  if (n < 2) {
    return { a: [points[0]?.rate || 0], b: [0], c: [0], d: [0], x: [points[0]?.tenor || 0] };
  }

  const x = points.map(p => p.tenor);
  const y = points.map(p => p.rate);

  const h: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    h.push(x[i + 1] - x[i]);
  }

  // Natural spline: solve tridiagonal system for second derivatives
  const alpha: number[] = [0];
  for (let i = 1; i < n - 1; i++) {
    alpha.push(
      (3 / h[i]) * (y[i + 1] - y[i]) - (3 / h[i - 1]) * (y[i] - y[i - 1])
    );
  }

  const l: number[] = [1];
  const mu: number[] = [0];
  const z: number[] = [0];

  for (let i = 1; i < n - 1; i++) {
    l.push(2 * (x[i + 1] - x[i - 1]) - h[i - 1] * mu[i - 1]);
    mu.push(h[i] / l[i]);
    z.push((alpha[i] - h[i - 1] * z[i - 1]) / l[i]);
  }

  l.push(1);
  z.push(0);

  const c: number[] = new Array(n).fill(0);
  const b: number[] = new Array(n - 1).fill(0);
  const d: number[] = new Array(n - 1).fill(0);

  for (let j = n - 2; j >= 0; j--) {
    c[j] = z[j] - mu[j] * c[j + 1];
    b[j] = (y[j + 1] - y[j]) / h[j] - h[j] * (c[j + 1] + 2 * c[j]) / 3;
    d[j] = (c[j + 1] - c[j]) / (3 * h[j]);
  }

  return { a: y.slice(0, n - 1), b, c: c.slice(0, n - 1), d, x };
}

function evaluateSpline(coeffs: SplineCoefficients, targetX: number): number {
  const { a, b, c, d, x } = coeffs;
  const n = x.length;

  if (n === 1) return a[0];
  if (targetX <= x[0]) return a[0];
  if (targetX >= x[n - 1]) {
    const i = n - 2;
    const dx = x[n - 1] - x[i];
    return a[i] + b[i] * dx + c[i] * dx * dx + d[i] * dx * dx * dx;
  }

  let i = 0;
  for (let j = 0; j < n - 1; j++) {
    if (targetX >= x[j] && targetX <= x[j + 1]) {
      i = j;
      break;
    }
  }

  const dx = targetX - x[i];
  return a[i] + b[i] * dx + c[i] * dx * dx + d[i] * dx * dx * dx;
}

export function bootstrapCubicSpline(points: BootstrapPoint[]): BootstrapResult {
  const sorted = [...points].sort((a, b) => a.tenor - b.tenor);
  const coeffs = calculateSplineCoefficients(sorted);
  const discountFactors: DiscountFactor[] = [];

  const maxTenor = Math.max(...sorted.map(p => p.tenor), 1);
  const step = maxTenor > 10 ? 0.5 : 0.25;
  const curvePoints: { tenor: number; rate: number }[] = [];

  for (let t = step; t <= maxTenor + step; t += step) {
    const rate = evaluateSpline(coeffs, t);
    curvePoints.push({ tenor: t, rate });

    const df = calculateDiscountFactor(rate, t);
    const prevDf = discountFactors.length > 0 ? discountFactors[discountFactors.length - 1] : null;

    discountFactors.push({
      tenor: t,
      df,
      zeroRate: rate,
      forwardRate: prevDf
        ? calculateForwardRate(prevDf.zeroRate, prevDf.tenor, rate, t)
        : rate,
    });
  }

  return {
    method: 'cubic_spline',
    discountFactors,
    curvePoints,
  };
}

// ============ Nelson-Siegel Model ============

/**
 * Nelson-Siegel model formula:
 * r(t) = β0 + β1 * ((1 - e^(-λt)) / (λt)) + β2 * ((1 - e^(-λt)) / (λt) - e^(-λt))
 */
export function nelsonSiegelRate(t: number, params: NelsonSiegelParams): number {
  const { beta0, beta1, beta2, lambda } = params;

  if (t <= 0.001) return beta0 + beta1; // Limit as t -> 0

  const lambdaT = lambda * t;
  const expTerm = Math.exp(-lambdaT);
  const factor1 = (1 - expTerm) / lambdaT;
  const factor2 = factor1 - expTerm;

  return beta0 + beta1 * factor1 + beta2 * factor2;
}

/**
 * Fit Nelson-Siegel parameters to observed rates
 * Uses gradient descent optimization
 */
function fitNelsonSiegel(points: BootstrapPoint[]): NelsonSiegelParams {
  // Initial guesses
  let beta0 = points.length > 0 ? Math.max(...points.map(p => p.rate)) : 0.03;
  let beta1 = points.length > 1 ? points[0].rate - beta0 : -0.01;
  let beta2 = 0;
  let lambda = 0.5;

  const learningRate = 0.0001;
  const iterations = 5000;

  for (let iter = 0; iter < iterations; iter++) {
    let gradBeta0 = 0;
    let gradBeta1 = 0;
    let gradBeta2 = 0;
    let gradLambda = 0;

    for (const point of points) {
      const t = point.tenor;
      if (t <= 0.001) continue;

      const lambdaT = lambda * t;
      const expTerm = Math.exp(-lambdaT);
      const factor1 = (1 - expTerm) / lambdaT;
      const factor2 = factor1 - expTerm;

      const predicted = beta0 + beta1 * factor1 + beta2 * factor2;
      const error = predicted - point.rate;

      gradBeta0 += 2 * error;
      gradBeta1 += 2 * error * factor1;
      gradBeta2 += 2 * error * factor2;

      // Gradient for lambda (more complex)
      const dFactor1_dLambda = t * expTerm / lambdaT - (1 - expTerm) * t / (lambdaT * lambdaT);
      const dFactor2_dLambda = dFactor1_dLambda + t * expTerm;
      gradLambda += 2 * error * (beta1 * dFactor1_dLambda + beta2 * dFactor2_dLambda);
    }

    beta0 -= learningRate * gradBeta0;
    beta1 -= learningRate * gradBeta1;
    beta2 -= learningRate * gradBeta2;
    lambda -= learningRate * 0.1 * gradLambda;

    // Constrain lambda to reasonable range
    lambda = Math.max(0.1, Math.min(3.0, lambda));
  }

  return { beta0, beta1, beta2, lambda };
}

export function bootstrapNelsonSiegel(points: BootstrapPoint[]): BootstrapResult {
  const sorted = [...points].sort((a, b) => a.tenor - b.tenor);
  const params = fitNelsonSiegel(sorted);
  const discountFactors: DiscountFactor[] = [];

  const maxTenor = Math.max(...sorted.map(p => p.tenor), 1);
  const step = maxTenor > 10 ? 0.5 : 0.25;
  const curvePoints: { tenor: number; rate: number }[] = [];

  for (let t = step; t <= maxTenor + step; t += step) {
    const rate = nelsonSiegelRate(t, params);
    curvePoints.push({ tenor: t, rate });

    const df = calculateDiscountFactor(rate, t);
    const prevDf = discountFactors.length > 0 ? discountFactors[discountFactors.length - 1] : null;

    discountFactors.push({
      tenor: t,
      df,
      zeroRate: rate,
      forwardRate: prevDf
        ? calculateForwardRate(prevDf.zeroRate, prevDf.tenor, rate, t)
        : rate,
    });
  }

  return {
    method: 'nelson_siegel',
    discountFactors,
    curvePoints,
    parameters: params,
  };
}

// ============ Main Bootstrap Function ============

export function bootstrap(
  points: BootstrapPoint[],
  method: BootstrapMethod
): BootstrapResult {
  if (points.length === 0) {
    return {
      method,
      discountFactors: [],
      curvePoints: [],
    };
  }

  switch (method) {
    case 'linear':
      return bootstrapLinear(points);
    case 'cubic_spline':
      return bootstrapCubicSpline(points);
    case 'nelson_siegel':
      return bootstrapNelsonSiegel(points);
    default:
      return bootstrapLinear(points);
  }
}

// ============ Export Functions ============

export function exportToCSV(result: BootstrapResult): string {
  const headers = ['Tenor', 'Discount Factor', 'Zero Rate (%)', 'Forward Rate (%)'];
  const rows = result.discountFactors.map(df => [
    df.tenor.toFixed(2),
    df.df.toFixed(8),
    (df.zeroRate * 100).toFixed(4),
    df.forwardRate ? (df.forwardRate * 100).toFixed(4) : 'N/A',
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
