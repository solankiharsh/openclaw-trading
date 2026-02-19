/**
 * Unit tests for Pillar 2: whale trade PnL (FIFO) and clustering.
 */

import { describe, test, expect } from 'bun:test';
import { computePnLFromTrades, type TradeRow } from '../src/services/whale-trade.service.js';

describe('computePnLFromTrades (FIFO)', () => {
  test('empty trades yields zero', () => {
    const out = computePnLFromTrades([]);
    expect(out.totalPnlUsd).toBe(0);
    expect(out.tradeCount).toBe(0);
    expect(out.winCount).toBe(0);
  });

  test('BUY only: no PnL', () => {
    const trades: TradeRow[] = [
      { tokenMint: 'mint1', action: 'BUY', tokenAmount: '100', priceUsd: '10' },
    ];
    const out = computePnLFromTrades(trades);
    expect(out.totalPnlUsd).toBe(0);
    expect(out.winCount).toBe(0);
  });

  test('BUY then SELL with profit: positive PnL, winCount 1', () => {
    const trades: TradeRow[] = [
      { tokenMint: 'mint1', action: 'BUY', tokenAmount: '100', priceUsd: '10' },
      { tokenMint: 'mint1', action: 'SELL', tokenAmount: '100', priceUsd: '15' },
    ];
    const out = computePnLFromTrades(trades);
    expect(out.totalPnlUsd).toBe(500); // 100*15 - 100*10
    expect(out.winCount).toBe(1);
  });

  test('BUY then SELL with loss: negative PnL, winCount 0', () => {
    const trades: TradeRow[] = [
      { tokenMint: 'mint1', action: 'BUY', tokenAmount: '100', priceUsd: '10' },
      { tokenMint: 'mint1', action: 'SELL', tokenAmount: '100', priceUsd: '5' },
    ];
    const out = computePnLFromTrades(trades);
    expect(out.totalPnlUsd).toBe(-500);
    expect(out.winCount).toBe(0);
  });

  test('FIFO: two BUYs then one SELL', () => {
    const trades: TradeRow[] = [
      { tokenMint: 'mint1', action: 'BUY', tokenAmount: '50', priceUsd: '10' },
      { tokenMint: 'mint1', action: 'BUY', tokenAmount: '50', priceUsd: '20' },
      { tokenMint: 'mint1', action: 'SELL', tokenAmount: '100', priceUsd: '18' },
    ];
    const out = computePnLFromTrades(trades);
    // Cost basis: 50*10 + 50*20 = 1500. Proceeds: 100*18 = 1800. PnL = 300
    expect(out.totalPnlUsd).toBe(300);
    expect(out.winCount).toBe(1);
  });
});
