/**
 * Unit and integration tests for Pillar 1: new-token scoring pipeline.
 */

import { describe, test, expect, mock, beforeEach } from 'bun:test';
import {
  parseNewTokenPayload,
  liquidityScore,
  devWalletScore,
  momentumScore,
  createNewTokenScoringCallback,
} from '../src/services/new-token-scoring.service.js';

describe('parseNewTokenPayload', () => {
  test('extracts mint, symbol, name from full payload', () => {
    const data = {
      mint: ' So11111111111111111111111111111111111111112 ',
      symbol: ' SOL ',
      name: ' Wrapped SOL ',
      creatorAddress: 'Creator111111111111111111111111111111111111111',
      liquidityUsd: 5000,
      bondingCurveProgress: 75.5,
    };
    const out = parseNewTokenPayload(data);
    expect(out.mint).toBe('So11111111111111111111111111111111111111112');
    expect(out.symbol).toBe('SOL');
    expect(out.name).toBe('Wrapped SOL');
    expect(out.creatorAddress).toBe('Creator111111111111111111111111111111111111111');
    expect(out.liquidityUsd).toBe(5000);
    expect(out.bondingCurveProgress).toBe(75.5);
  });

  test('uses creator alias when creatorAddress missing', () => {
    const data = { mint: 'mint1', creator: 'CreatorAddr' };
    const out = parseNewTokenPayload(data);
    expect(out.creatorAddress).toBe('CreatorAddr');
  });

  test('uses liquidity alias when liquidityUsd missing', () => {
    const data = { mint: 'mint1', liquidity: 1000 };
    const out = parseNewTokenPayload(data);
    expect(out.liquidityUsd).toBe(1000);
  });

  test('returns UNKNOWN symbol and Unknown Token name when missing', () => {
    const data = { mint: 'mint1' };
    const out = parseNewTokenPayload(data);
    expect(out.symbol).toBe('UNKNOWN');
    expect(out.name).toBe('Unknown Token');
  });

  test('returns empty mint for non-object or empty', () => {
    expect(parseNewTokenPayload(null).mint).toBe('');
    expect(parseNewTokenPayload(undefined).mint).toBe('');
    expect(parseNewTokenPayload({}).mint).toBe('');
  });
});

describe('liquidityScore', () => {
  test('returns 50 when liquidityUsd undefined or 0', () => {
    expect(liquidityScore(undefined)).toBe(50);
    expect(liquidityScore(0)).toBe(50);
  });

  test('scales with liquidity (2.5k => 50, 5k => 100)', () => {
    expect(liquidityScore(2500)).toBe(50);
    expect(liquidityScore(5000)).toBe(100);
  });

  test('caps at 100 for high liquidity', () => {
    expect(liquidityScore(50_000)).toBe(100);
    expect(liquidityScore(100_000)).toBe(100);
  });
});

describe('devWalletScore', () => {
  test('returns placeholder 50', () => {
    expect(devWalletScore(undefined)).toBe(50);
    expect(devWalletScore('someCreator')).toBe(50);
  });
});

describe('momentumScore', () => {
  test('returns 0', () => {
    expect(momentumScore()).toBe(0);
  });
});

describe('createNewTokenScoringCallback (integration)', () => {
  const mockCreate = mock(() => Promise.resolve({ id: 'test-id' }));
  const mockBroadcast = mock(() => {});

  const deps = {
    db: { newTokenAlert: { create: mockCreate } },
    websocketEvents: { broadcastFeedEvent: mockBroadcast },
  } as Parameters<typeof createNewTokenScoringCallback>[0];

  beforeEach(() => {
    mockCreate.mockClear();
    mockBroadcast.mockClear();
  });

  test('ignores non-new_token events', async () => {
    const callback = createNewTokenScoringCallback(deps);
    await callback('tokens', 'new_tweet', { mint: 'mint1' });
    expect(mockCreate).toHaveBeenCalledTimes(0);
  });

  test('skips when mint is empty', async () => {
    const callback = createNewTokenScoringCallback(deps);
    await callback('tokens', 'new_token', {});
    expect(mockCreate).toHaveBeenCalledTimes(0);
  });

  test('persists alert and broadcasts when filter passes (default thresholds)', async () => {
    const callback = createNewTokenScoringCallback(deps);
    await callback('tokens', 'new_token', {
      mint: 'MintPass',
      symbol: 'PASS',
      name: 'Pass Token',
      liquidityUsd: 5000,
    });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const createArg = mockCreate.mock.calls[0][0];
    expect(createArg.data.mint).toBe('MintPass');
    expect(createArg.data.liquidityScore).toBe(100);
    expect(createArg.data.devWalletScore).toBe(50);
    expect(createArg.data.passedFilter).toBe(true);

    expect(mockBroadcast).toHaveBeenCalledTimes(1);
    expect(mockBroadcast.mock.calls[0][0]).toBe('tokens');
    expect(mockBroadcast.mock.calls[0][1].enriched).toBe(true);
    expect(mockBroadcast.mock.calls[0][1].mint).toBe('MintPass');
  });

  test('persists alert but does not broadcast when filter fails (low liquidity)', async () => {
    const callback = createNewTokenScoringCallback(deps);
    await callback('tokens', 'new_token', {
      mint: 'MintFail',
      symbol: 'FAIL',
      name: 'Fail Token',
      liquidityUsd: 100, // liquidityScore(100) = 2, below default min 50
    });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const createArg = mockCreate.mock.calls[0][0];
    expect(createArg.data.liquidityScore).toBe(2);
    expect(createArg.data.passedFilter).toBe(false);
    expect(mockBroadcast).toHaveBeenCalledTimes(0);
  });
});
