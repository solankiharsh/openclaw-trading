/**
 * Alpha features config: filter thresholds and windows.
 * Used by new-token scoring, whale clustering, signal aggregation, narrative trend.
 */

function envInt(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return defaultValue;
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? defaultValue : n;
}

function envFloat(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return defaultValue;
  const n = parseFloat(raw);
  return Number.isNaN(n) ? defaultValue : n;
}

/** Pillar 1: New-token filter thresholds (0–100). */
export const alphaNewToken = {
  minLiquidityScore: envInt('ALPHA_NEW_TOKEN_MIN_LIQUIDITY_SCORE', 50),
  minDevWalletScore: envInt('ALPHA_NEW_TOKEN_MIN_DEV_WALLET_SCORE', 30),
} as const;

/** Pillar 2: Whale clustering. */
export const alphaWhaleCluster = {
  windowMinutes: envInt('ALPHA_WHALE_CLUSTER_WINDOW_MINUTES', 5),
  minWallets: envInt('ALPHA_WHALE_CLUSTER_MIN_WALLETS', 2),
} as const;

/** Pillar 3: Signal aggregation. */
export const alphaSignals = {
  windowMinutes: envFloat('ALPHA_SIGNAL_WINDOW_MINUTES', 5),
  momentumThreshold: envInt('ALPHA_SIGNAL_MOMENTUM_THRESHOLD', 3),
} as const;

/** Pillar 4: Narrative trend. */
export const alphaNarrative = {
  windowHours: envFloat('ALPHA_NARRATIVE_WINDOW_HOURS', 24),
  trendThreshold: envInt('ALPHA_NARRATIVE_TREND_THRESHOLD', 2),
} as const;
