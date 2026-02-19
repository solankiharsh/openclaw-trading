/**
 * Whale trade persistence and PnL (Pillar 2).
 * Persists every detected trade from tracked wallets and computes per-wallet PnL (FIFO).
 * Detects whale clustering (N+ wallets bought same token in window) and broadcasts.
 */

import { db } from '../lib/db.js';
import { alphaWhaleCluster } from '../lib/alpha-config.js';
import { websocketEvents } from './websocket-events.js';
import type { Chain } from '@prisma/client';
import type { DetectedTrade } from './trigger-engine.js';
import type { TrackedWallet } from '@prisma/client';

const chainMap = { SOLANA: 'SOLANA' as Chain, BSC: 'BSC' as Chain };

/**
 * Persist a detected trade as TrackedWalletTrade for each tracker.
 * Call this when we have already resolved trackers (e.g. inside evaluateTriggers).
 */
export async function persistWhaleTrades(
  trade: DetectedTrade,
  trackers: TrackedWallet[]
): Promise<void> {
  const chain = chainMap[trade.chain];
  const amount = String(trade.amount);
  const tokenAmount = String(trade.tokenAmount ?? 0);
  const priceUsd = trade.priceUsd != null ? String(trade.priceUsd) : null;

  await db.trackedWalletTrade.createMany({
    data: trackers.map((t) => ({
      trackedWalletId: t.id,
      agentId: t.agentId,
      walletAddress: trade.walletAddress,
      tokenMint: trade.tokenMint,
      tokenSymbol: trade.tokenSymbol,
      action: trade.action,
      chain,
      amount,
      tokenAmount,
      signature: trade.signature || null,
      priceUsd,
    })),
  });

  if (trade.action === 'BUY') {
    checkWhaleCluster(trade.tokenMint, trade.tokenSymbol, chain).catch((err) =>
      console.error('[WhaleTrade] checkWhaleCluster failed:', err)
    );
  }
}

/**
 * If N+ distinct tracked wallets bought this token in the last windowMinutes, broadcast whale_cluster.
 */
async function checkWhaleCluster(tokenMint: string, tokenSymbol: string, chain: Chain): Promise<void> {
  const windowMs = alphaWhaleCluster.windowMinutes * 60 * 1000;
  const since = new Date(Date.now() - windowMs);

  const buys = await db.trackedWalletTrade.findMany({
    where: {
      tokenMint,
      chain,
      action: 'BUY',
      createdAt: { gte: since },
    },
    select: { walletAddress: true },
    distinct: ['walletAddress'],
  });

  const walletCount = buys.length;
  if (walletCount >= alphaWhaleCluster.minWallets) {
    websocketEvents.broadcastFeedEvent('godwallet', {
      type: 'whale_cluster',
      tokenMint,
      tokenSymbol,
      walletCount,
      windowMinutes: alphaWhaleCluster.windowMinutes,
      timestamp: new Date().toISOString(),
    });
  }
}

export interface TradeRow {
  tokenMint: string;
  action: 'BUY' | 'SELL';
  tokenAmount: string;
  priceUsd: string | null;
}

/** Pure FIFO PnL from ordered trades. Exported for unit tests. */
export function computePnLFromTrades(trades: TradeRow[]): { totalPnlUsd: number; tradeCount: number; winCount: number } {
  let totalPnlUsd = 0;
  let winCount = 0;
  const positions = new Map<string, Array<{ amount: number; costUsd: number }>>();

  for (const t of trades) {
    const amount = Number(t.tokenAmount);
    const priceUsd = t.priceUsd != null ? Number(t.priceUsd) : 0;
    const costOrProceeds = amount * priceUsd;

    if (t.action === 'BUY') {
      const stack = positions.get(t.tokenMint) ?? [];
      stack.push({ amount, costUsd: costOrProceeds || 0 });
      positions.set(t.tokenMint, stack);
    } else {
      let remaining = amount;
      let costBasis = 0;
      const stack = positions.get(t.tokenMint) ?? [];

      while (remaining > 0 && stack.length > 0) {
        const lot = stack[0];
        const take = Math.min(remaining, lot.amount);
        const ratio = take / lot.amount;
        costBasis += lot.costUsd * ratio;
        remaining -= take;
        lot.amount -= take;
        lot.costUsd -= lot.costUsd * ratio;
        if (lot.amount <= 0) stack.shift();
      }

      const proceeds = costOrProceeds || 0;
      const pnl = proceeds - costBasis;
      totalPnlUsd += pnl;
      if (pnl > 0) winCount++;
    }
  }

  return { totalPnlUsd, tradeCount: trades.length, winCount };
}

/**
 * Recompute PnL for a wallet (FIFO cost basis) and upsert TrackedWalletStats.
 */
export async function updatePnLForWallet(walletAddress: string, chain: Chain): Promise<void> {
  const trades = await db.trackedWalletTrade.findMany({
    where: { walletAddress, chain },
    orderBy: { createdAt: 'asc' },
    select: { tokenMint: true, action: true, tokenAmount: true, priceUsd: true },
  });

  const { totalPnlUsd, tradeCount, winCount } = computePnLFromTrades(
    trades.map((t) => ({
      tokenMint: t.tokenMint,
      action: t.action,
      tokenAmount: String(t.tokenAmount),
      priceUsd: t.priceUsd != null ? String(t.priceUsd) : null,
    }))
  );

  await db.trackedWalletStats.upsert({
    where: {
      walletAddress_chain: { walletAddress, chain },
    },
    create: {
      walletAddress,
      chain,
      totalPnlUsd: String(totalPnlUsd),
      tradeCount,
      winCount,
    },
    update: {
      totalPnlUsd: String(totalPnlUsd),
      tradeCount,
      winCount,
    },
  });
}
