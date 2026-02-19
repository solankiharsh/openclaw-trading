-- CreateTable
CREATE TABLE "new_token_alerts" (
    "id" TEXT NOT NULL,
    "mint" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'devprint',
    "creatorAddress" TEXT,
    "liquidityUsd" DECIMAL(18,2),
    "bondingCurveProgress" DECIMAL(5,2),
    "devWalletScore" INTEGER,
    "liquidityScore" INTEGER,
    "momentumScore" INTEGER,
    "passedFilter" BOOLEAN NOT NULL DEFAULT false,
    "rawPayload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "new_token_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "new_token_alerts_mint_idx" ON "new_token_alerts"("mint");

-- CreateIndex
CREATE INDEX "new_token_alerts_source_idx" ON "new_token_alerts"("source");

-- CreateIndex
CREATE INDEX "new_token_alerts_passedFilter_idx" ON "new_token_alerts"("passedFilter");

-- CreateIndex
CREATE INDEX "new_token_alerts_createdAt_idx" ON "new_token_alerts"("createdAt");
