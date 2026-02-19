/**
 * Unit tests for Pillar 3: signal aggregation and momentum.
 */

import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { createSignalAggregationCallback } from '../src/services/signal-aggregation.service.js';

describe('createSignalAggregationCallback', () => {
  const mockBroadcast = mock(() => {});
  const deps = { websocketEvents: { broadcastFeedEvent: mockBroadcast } };

  beforeEach(() => {
    mockBroadcast.mockClear();
  });

  test('ignores non-signal events', () => {
    const callback = createSignalAggregationCallback(deps);
    callback('tokens', 'new_token', { mint: 'mint1' });
    expect(mockBroadcast).toHaveBeenCalledTimes(0);
  });

  test('ignores signal event when mint is missing', () => {
    const callback = createSignalAggregationCallback(deps);
    callback('signals', 'buy_signal', {});
    expect(mockBroadcast).toHaveBeenCalledTimes(0);
  });

  test('broadcasts aggregated_signal when momentum threshold reached (3 signals)', () => {
    const callback = createSignalAggregationCallback(deps);
    const payload = { mint: 'MintSame', symbol: 'TKN' };
    callback('signals', 'buy_signal', payload);
    callback('signals', 'buy_signal', payload);
    callback('signals', 'signal_detected', payload);
    expect(mockBroadcast).toHaveBeenCalledTimes(1);
    expect(mockBroadcast.mock.calls[0][0]).toBe('signals');
    expect(mockBroadcast.mock.calls[0][1].type).toBe('aggregated_signal');
    expect(mockBroadcast.mock.calls[0][1].tokenMint).toBe('MintSame');
    expect(mockBroadcast.mock.calls[0][1].momentumDetected).toBe(true);
    expect(mockBroadcast.mock.calls[0][1].signalCount).toBe(3);
  });
});
