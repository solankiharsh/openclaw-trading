/**
 * Unit tests for Pillar 4: narrative/trend detection.
 */

import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { createNarrativeTrendCallback } from '../src/services/narrative-trend.service.js';

describe('createNarrativeTrendCallback', () => {
  const mockBroadcast = mock(() => {});
  const deps = { websocketEvents: { broadcastFeedEvent: mockBroadcast } };

  beforeEach(() => {
    mockBroadcast.mockClear();
  });

  test('ignores non-tweet events', () => {
    const callback = createNarrativeTrendCallback(deps);
    callback('tokens', 'new_token', { text: 'AI tokens' });
    expect(mockBroadcast).toHaveBeenCalledTimes(0);
  });

  test('extracts theme from tweet text and broadcasts when rising', () => {
    const callback = createNarrativeTrendCallback(deps);
    // Default trendThreshold is 2; need current - previous >= 2. After 10 tweets, current=10, previous=0.
    for (let i = 0; i < 10; i++) {
      callback('tweets', 'new_tweet', { text: 'AI and crypto are trending #AI' });
    }
    expect(mockBroadcast).toHaveBeenCalled();
    const narrativeCalls = mockBroadcast.mock.calls.filter((c) => c[1].type === 'narrative_trend');
    expect(narrativeCalls.length).toBeGreaterThanOrEqual(1);
    const last = narrativeCalls[narrativeCalls.length - 1][1];
    expect(last.theme).toBe('ai');
    expect(last.trend).toBe('rising');
  });
});
