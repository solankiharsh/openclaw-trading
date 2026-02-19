/**
 * New-token scoring pipeline (Pillar 1).
 * Consumes DevPrint new_token events via callback, scores and filters, persists to NewTokenAlert,
 * and broadcasts enriched events for tokens that pass the filter.
 */

import { db } from '../lib/db.js';
import { alphaNewToken } from '../lib/alpha-config.js';
import { websocketEvents } from './websocket-events.js';
import type { DevPrintOnEvent } from './devprint-feed.service.js';

const SOURCE = 'devprint';

/** Normalize to 0–100. */
function clampScore(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

/**
 * Parse new_token payload into typed fields.
 * DevPrint may send mint, symbol, name, creator, liquidityUsd, bondingCurveProgress, etc.
 */
export function parseNewTokenPayload(data: unknown): {
  mint: string;
  symbol: string;
  name: string;
  creatorAddress?: string;
  liquidityUsd?: number;
  bondingCurveProgress?: number;
} {
  const o = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  const mint = typeof o.mint === 'string' ? o.mint.trim() : '';
  const symbol = typeof o.symbol === 'string' ? o.symbol.trim() : 'UNKNOWN';
  const name = typeof o.name === 'string' ? o.name.trim() : 'Unknown Token';
  const creatorAddress =
    typeof o.creatorAddress === 'string'
      ? o.creatorAddress.trim()
      : typeof o.creator === 'string'
        ? (o.creator as string).trim()
        : undefined;
  let liquidityUsd: number | undefined;
  if (typeof o.liquidityUsd === 'number' && !Number.isNaN(o.liquidityUsd)) liquidityUsd = o.liquidityUsd;
  if (typeof o.liquidity === 'number' && !Number.isNaN(o.liquidity)) liquidityUsd = o.liquidity;
  let bondingCurveProgress: number | undefined;
  if (typeof o.bondingCurveProgress === 'number' && !Number.isNaN(o.bondingCurveProgress))
    bondingCurveProgress = o.bondingCurveProgress;
  if (typeof o.bonding_curve_progress === 'number' && !Number.isNaN(o.bonding_curve_progress))
    bondingCurveProgress = o.bonding_curve_progress;
  return { mint, symbol, name, creatorAddress, liquidityUsd, bondingCurveProgress };
}

/**
 * Liquidity score 0–100. Uses payload liquidity if present; otherwise placeholder.
 */
export function liquidityScore(liquidityUsd: number | undefined): number {
  if (liquidityUsd === undefined || liquidityUsd <= 0) return 50; // placeholder
  // Simple curve: scale by log or linear cap (e.g. 10k USD => 100)
  const capped = Math.min(liquidityUsd, 50_000);
  return clampScore((capped / 500) * 10); // 2.5k => 50, 5k => 100
}

/** Placeholder: dev-wallet score. Blocklist or future Birdeye/Helius check. */
export function devWalletScore(_creatorAddress: string | undefined): number {
  // TODO: blocklist check → 0; optional on-chain or API score
  return 50; // placeholder
}

/** Placeholder: momentum (e.g. first-minute buys). */
export function momentumScore(): number {
  return 0;
}

export interface NewTokenScoringDeps {
  db: typeof db;
  websocketEvents: typeof websocketEvents;
}

/**
 * Returns the onEvent callback for DevPrint feed. When eventType === 'new_token',
 * runs the scoring pipeline, persists to NewTokenAlert, and broadcasts if passedFilter.
 * Optional deps for testing.
 */
export function createNewTokenScoringCallback(deps?: NewTokenScoringDeps): DevPrintOnEvent {
  const prisma = deps?.db ?? db;
  const wsEvents = deps?.websocketEvents ?? websocketEvents;

  return async (streamName: string, eventType: string, data: unknown) => {
    if (eventType !== 'new_token') return;

    const parsed = parseNewTokenPayload(data);
    if (!parsed.mint) return;

    const liquidityScoreVal = liquidityScore(parsed.liquidityUsd);
    const devWalletScoreVal = devWalletScore(parsed.creatorAddress);
    const momentumScoreVal = momentumScore();

    const passedFilter =
      liquidityScoreVal >= alphaNewToken.minLiquidityScore &&
      devWalletScoreVal >= alphaNewToken.minDevWalletScore;

    const rawPayload = data && typeof data === 'object' ? (data as object) : {};

    try {
      await prisma.newTokenAlert.create({
        data: {
          mint: parsed.mint,
          symbol: parsed.symbol,
          name: parsed.name,
          source: SOURCE,
          creatorAddress: parsed.creatorAddress ?? null,
          liquidityUsd: parsed.liquidityUsd ?? null,
          bondingCurveProgress: parsed.bondingCurveProgress ?? null,
          devWalletScore: devWalletScoreVal,
          liquidityScore: liquidityScoreVal,
          momentumScore: momentumScoreVal,
          passedFilter,
          rawPayload: rawPayload as object,
        },
      });
    } catch (err) {
      console.error('[NewTokenScoring] Failed to persist NewTokenAlert:', err);
      return;
    }

    if (passedFilter) {
      wsEvents.broadcastFeedEvent('tokens', {
        type: 'new_token',
        enriched: true,
        mint: parsed.mint,
        symbol: parsed.symbol,
        name: parsed.name,
        creatorAddress: parsed.creatorAddress,
        liquidityUsd: parsed.liquidityUsd,
        bondingCurveProgress: parsed.bondingCurveProgress,
        liquidityScore: liquidityScoreVal,
        devWalletScore: devWalletScoreVal,
        momentumScore: momentumScoreVal,
        timestamp: new Date().toISOString(),
        ...(typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {}),
      });
    }
  };
}
