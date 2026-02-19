/**
 * Narrative / trend detection (Pillar 4).
 * Consumes DevPrint events (e.g. tweets) via callback, extracts themes (keywords/hashtags),
 * counts mentions in sliding windows and detects rising/falling narratives.
 */

import { alphaNarrative } from '../lib/alpha-config.js';
import { websocketEvents } from './websocket-events.js';
import type { DevPrintOnEvent } from './devprint-feed.service.js';

const WINDOW_MS = alphaNarrative.windowHours * 60 * 60 * 1000;

/** Known themes (sectors) to count. Lowercase for matching. */
const THEMES = [
  'ai',
  'meme',
  'rwa',
  'defi',
  'gaming',
  'solana',
  'btc',
  'ethereum',
  'nft',
  'layer2',
  'l2',
  'depin',
  'gpu',
  'agent',
  'token',
];

interface ThemeCount {
  count: number;
  lastAt: number;
}

/** Current window: theme -> count. Previous window for trend. */
let currentWindow = new Map<string, ThemeCount>();
let previousWindow = new Map<string, number>();
let lastRotate = Date.now();

function getText(data: unknown): string {
  const o = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  const text = o.text ?? o.content ?? o.message ?? o.body ?? '';
  return typeof text === 'string' ? text : '';
}

function extractThemes(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const theme of THEMES) {
    if (lower.includes(theme)) found.push(theme);
  }
  // Hashtags: #AITokens -> ai
  const hashtagRe = /#(\w+)/g;
  let m: RegExpExecArray | null;
  while ((m = hashtagRe.exec(text)) !== null) {
    const tag = m[1].toLowerCase();
    if (THEMES.includes(tag) && !found.includes(tag)) found.push(tag);
  }
  return found;
}

function rotateWindow(): void {
  previousWindow = new Map<string, number>();
  currentWindow.forEach((v, k) => {
    previousWindow.set(k, v.count);
  });
  currentWindow = new Map();
  lastRotate = Date.now();
}

function addToCurrent(theme: string): void {
  const now = Date.now();
  if (now - lastRotate > WINDOW_MS) rotateWindow();
  const entry = currentWindow.get(theme);
  if (entry) {
    entry.count++;
    entry.lastAt = now;
  } else {
    currentWindow.set(theme, { count: 1, lastAt: now });
  }
}

/** Compare current to previous; return 'rising' | 'stable' | 'falling' and score. */
function getTrend(theme: string): { trend: 'rising' | 'stable' | 'falling'; score: number } {
  const cur = currentWindow.get(theme)?.count ?? 0;
  const prev = previousWindow.get(theme) ?? 0;
  const delta = cur - prev;
  if (delta >= alphaNarrative.trendThreshold) return { trend: 'rising', score: Math.min(100, cur * 10 + delta * 5) };
  if (delta <= -alphaNarrative.trendThreshold) return { trend: 'falling', score: Math.max(0, 50 + delta * 5) };
  return { trend: 'stable', score: Math.min(100, cur * 5) };
}

export interface NarrativeTrendDeps {
  websocketEvents: { broadcastFeedEvent: (channel: string, data: unknown) => void };
}

/**
 * Returns the onEvent callback for DevPrint feed. On new_tweet (or narrative-like events),
 * extracts themes, updates window, and broadcasts narrative_trend when a theme is rising.
 */
export function createNarrativeTrendCallback(deps?: NarrativeTrendDeps): DevPrintOnEvent {
  const wsEvents = deps?.websocketEvents ?? websocketEvents;

  return (streamName: string, eventType: string, data: unknown) => {
    if (eventType !== 'new_tweet' && eventType !== 'narrative') return;

    const text = getText(data);
    if (!text.trim()) return;

    const themes = extractThemes(text);
    for (const theme of themes) addToCurrent(theme);

    for (const theme of themes) {
      const { trend, score } = getTrend(theme);
      if (trend === 'rising') {
        wsEvents.broadcastFeedEvent('market', {
          type: 'narrative_trend',
          theme,
          score,
          trend: 'rising',
          windowHours: alphaNarrative.windowHours,
          timestamp: new Date().toISOString(),
        });
      }
    }
  };
}
