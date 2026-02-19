/**
 * Signal aggregation (Pillar 3 – Blitzkrieg).
 * Consumes DevPrint buy_signal / signal_detected via callback, aggregates by token in a sliding window,
 * computes conviction score and momentum; broadcasts aggregated_signal when momentum is detected.
 */

import { alphaSignals } from '../lib/alpha-config.js';
import { websocketEvents } from './websocket-events.js';
import type { DevPrintOnEvent } from './devprint-feed.service.js';

const WINDOW_MS = alphaSignals.windowMinutes * 60 * 1000;

interface WindowEvent {
  at: number;
  source?: string;
}

const tokenWindows = new Map<string, WindowEvent[]>();

function getTokenMint(data: unknown): string | null {
  const o = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  const mint = o.mint ?? o.tokenMint ?? o.token;
  return typeof mint === 'string' ? mint.trim() || null : null;
}

function getSource(data: unknown): string | undefined {
  const o = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  const s = o.source ?? o.origin;
  return typeof s === 'string' ? s : undefined;
}

function prune(window: WindowEvent[]): void {
  const cutoff = Date.now() - WINDOW_MS;
  while (window.length > 0 && window[0].at < cutoff) {
    window.shift();
  }
}

/** Conviction 0–100 from count and recency (last event). */
function convictionScore(count: number, lastAt: number): number {
  const recency = Math.max(0, 1 - (Date.now() - lastAt) / WINDOW_MS);
  return Math.min(100, Math.round(count * 25 + recency * 20));
}

export interface SignalAggregationDeps {
  websocketEvents: { broadcastFeedEvent: (channel: string, data: unknown) => void };
}

/**
 * Returns the onEvent callback for DevPrint feed. On buy_signal / signal_detected,
 * adds to per-token window and broadcasts aggregated_signal when momentum is reached.
 */
export function createSignalAggregationCallback(deps?: SignalAggregationDeps): DevPrintOnEvent {
  const wsEvents = deps?.websocketEvents ?? websocketEvents;

  return (streamName: string, eventType: string, data: unknown) => {
    if (eventType !== 'buy_signal' && eventType !== 'signal_detected') return;

    const mint = getTokenMint(data);
    if (!mint) return;

    let window = tokenWindows.get(mint);
    if (!window) {
      window = [];
      tokenWindows.set(mint, window);
    }

    window.push({ at: Date.now(), source: getSource(data) });
    prune(window);

    const signalCount = window.length;
    const uniqueSources = new Set(window.map((e) => e.source).filter(Boolean)).size;
    const momentumDetected = signalCount >= alphaSignals.momentumThreshold;
    const lastAt = window.length > 0 ? window[window.length - 1].at : 0;
    const conviction = convictionScore(signalCount, lastAt);

    if (momentumDetected) {
      const tokenSymbol = (data && typeof data === 'object' && (data as Record<string, unknown>).symbol) as string | undefined;
      wsEvents.broadcastFeedEvent('signals', {
        type: 'aggregated_signal',
        tokenMint: mint,
        tokenSymbol: tokenSymbol ?? 'UNKNOWN',
        signalCount,
        uniqueSources,
        convictionScore: conviction,
        momentumDetected: true,
        windowMinutes: alphaSignals.windowMinutes,
        timestamp: new Date().toISOString(),
      });
    }
  };
}
