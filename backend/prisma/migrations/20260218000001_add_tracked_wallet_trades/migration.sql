-- CreateEnum
CREATE TYPE "TrackedWalletTradeAction" AS ENUM ('BUY', 'SELL');

-- CreateTable
CREATE TABLE "tracked_wallet_trades" (
    "id" TEXT NOT NULL,
    "trackedWalletId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "tokenMint" TEXT NOT NULL,
    "tokenSymbol" TEXT NOT NULL,
    "action" "TrackedWalletTradeAction" NOT NULL,
    "chain" "Chain" NOT NULL DEFAULT 'SOLANA',
    "amount" DECIMAL(18,9) NOT NULL,
    "tokenAmount" DECIMAL(18,9) NOT NULL,
    "signature" TEXT,
    "priceUsd" DECIMAL(18,6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracked_wallet_trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracked_wallet_stats" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "chain" "Chain" NOT NULL DEFAULT 'SOLANA',
    "totalPnlUsd" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "tradeCount" INTEGER NOT NULL DEFAULT 0,
    "winCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tracked_wallet_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tracked_wallet_trades_trackedWalletId_idx" ON "tracked_wallet_trades"("trackedWalletId");

-- CreateIndex
CREATE INDEX "tracked_wallet_trades_agentId_idx" ON "tracked_wallet_trades"("agentId");

-- CreateIndex
CREATE INDEX "tracked_wallet_trades_walletAddress_chain_idx" ON "tracked_wallet_trades"("walletAddress", "chain");

-- CreateIndex
CREATE INDEX "tracked_wallet_trades_tokenMint_idx" ON "tracked_wallet_trades"("tokenMint");

-- CreateIndex
CREATE INDEX "tracked_wallet_trades_createdAt_idx" ON "tracked_wallet_trades"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "tracked_wallet_stats_walletAddress_chain_key" ON "tracked_wallet_stats"("walletAddress", "chain");

-- CreateIndex
CREATE INDEX "tracked_wallet_stats_chain_idx" ON "tracked_wallet_stats"("chain");

-- AddForeignKey
ALTER TABLE "tracked_wallet_trades" ADD CONSTRAINT "tracked_wallet_trades_trackedWalletId_fkey" FOREIGN KEY ("trackedWalletId") REFERENCES "tracked_wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
