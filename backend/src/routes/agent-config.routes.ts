import { Hono } from 'hono';
import { db } from '../lib/db';
import { agentAuthMiddleware as jwtAuth } from '../middleware/agent-auth';
import { z } from 'zod';
import { getBSCMonitor } from '../services/bsc-monitor';

// Lazy import to avoid circular dependency (index.ts exports getHeliusMonitor)
async function getHeliusMonitor() {
  const indexModule = await import('../index.js');
  return indexModule.getHeliusMonitor();
}

/** Activate a wallet on the appropriate real-time monitor */
async function activateWalletMonitor(address: string, chain: string, agentId: string) {
  if (chain === 'BSC') {
    getBSCMonitor()?.addWallet(address, agentId);
  } else {
    const monitor = await getHeliusMonitor();
    monitor?.addWallet(address);
  }
}

/** Deactivate a wallet from the appropriate real-time monitor */
async function deactivateWalletMonitor(address: string, chain: string) {
  if (chain === 'BSC') {
    getBSCMonitor()?.removeWallet(address);
  } else {
    const monitor = await getHeliusMonitor();
    monitor?.removeWallet(address);
  }
}

const agentConfigRoutes = new Hono();

// ── Validation Schemas ────────────────────────────────────

const trackedWalletSchema = z.object({
  address: z.string().min(32),
  label: z.string().optional(),
  chain: z.enum(['SOLANA', 'BSC']).default('SOLANA'),
});

const buyTriggerSchema = z.object({
  type: z.enum(['consensus', 'volume', 'liquidity', 'godwallet']),
  enabled: z.boolean().default(true),
  config: z.record(z.any()),
});

const configUpdateSchema = z.object({
  archetypeId: z.string().optional(),
  trackedWallets: z.array(trackedWalletSchema).optional(),
  triggers: z.array(buyTriggerSchema).optional(),
});

// ── GET /arena/me/config ──────────────────────────────────
// Get agent configuration (tracked wallets + buy triggers)

agentConfigRoutes.get('/config', jwtAuth, async (c) => {
  try {
    const agentId = c.get('agentId');

    // Get tracked wallets
    const trackedWallets = await db.trackedWallet.findMany({
      where: { agentId },
      select: {
        id: true,
        address: true,
        label: true,
        chain: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Get buy triggers
    const buyTriggers = await db.buyTrigger.findMany({
      where: { agentId },
      select: {
        id: true,
        type: true,
        enabled: true,
        config: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Get agent config (archetype, etc.)
    const agent = await db.tradingAgent.findUnique({
      where: { id: agentId },
      select: { archetypeId: true, config: true },
    });

    return c.json({
      success: true,
      data: {
        archetypeId: agent?.archetypeId,
        config: agent?.config || {},
        trackedWallets,
        buyTriggers,
      },
    });
  } catch (error) {
    console.error('❌ Failed to fetch agent config:', error);
    return c.json(
      { success: false, error: 'Failed to fetch configuration' },
      500
    );
  }
});

// ── PUT /arena/me/config ──────────────────────────────────
// Update agent configuration

agentConfigRoutes.put('/config', jwtAuth, async (c) => {
  try {
    const agentId = c.get('agentId');
    const body = await c.req.json();

    // Validate input
    const parsed = configUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { success: false, error: 'Invalid configuration', details: parsed.error },
        400
      );
    }

    const { archetypeId, trackedWallets, triggers } = parsed.data;

    // Update archetype if provided
    if (archetypeId) {
      await db.tradingAgent.update({
        where: { id: agentId },
        data: { archetypeId },
      });
    }

    // Update tracked wallets if provided
    if (trackedWallets) {
      // Get existing wallets to deactivate monitors
      const existingWallets = await db.trackedWallet.findMany({
        where: { agentId },
        select: { address: true, chain: true },
      });

      // Delete existing wallets
      await db.trackedWallet.deleteMany({
        where: { agentId },
      });

      // Deactivate old wallet monitors (only if no other agent tracks them)
      for (const old of existingWallets) {
        const otherTrackers = await db.trackedWallet.count({
          where: { address: old.address, chain: old.chain },
        });
        if (otherTrackers === 0) {
          await deactivateWalletMonitor(old.address, old.chain);
        }
      }

      // Create new wallets + activate monitors
      if (trackedWallets.length > 0) {
        await db.trackedWallet.createMany({
          data: trackedWallets.map((w) => ({
            agentId,
            address: w.address,
            label: w.label,
            chain: w.chain || 'SOLANA',
          })),
        });

        for (const w of trackedWallets) {
          await activateWalletMonitor(w.address, w.chain || 'SOLANA', agentId);
        }
      }
    }

    // Update buy triggers if provided
    if (triggers) {
      // Delete existing triggers
      await db.buyTrigger.deleteMany({
        where: { agentId },
      });

      // Create new triggers
      if (triggers.length > 0) {
        await db.buyTrigger.createMany({
          data: triggers.map((t) => ({
            agentId,
            type: t.type,
            enabled: t.enabled,
            config: t.config as any,
          })),
        });
      }
    }

    return c.json({
      success: true,
      message: 'Configuration updated successfully',
    });
  } catch (error) {
    console.error('❌ Failed to update agent config:', error);
    return c.json(
      { success: false, error: 'Failed to update configuration' },
      500
    );
  }
});

// ── POST /arena/me/wallets ────────────────────────────────
// Add a tracked wallet

agentConfigRoutes.post('/wallets', jwtAuth, async (c) => {
  try {
    const agentId = c.get('agentId');
    const body = await c.req.json();

    const parsed = trackedWalletSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { success: false, error: 'Invalid wallet data', details: parsed.error },
        400
      );
    }

    const wallet = await db.trackedWallet.create({
      data: {
        agentId,
        address: parsed.data.address,
        label: parsed.data.label,
        chain: parsed.data.chain,
      },
    });

    // Activate real-time monitoring for this wallet
    await activateWalletMonitor(parsed.data.address, parsed.data.chain, agentId);
    console.log(`✅ Wallet ${parsed.data.address.slice(0, 10)}... added + monitor activated (${parsed.data.chain})`);

    return c.json({
      success: true,
      data: wallet,
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return c.json(
        { success: false, error: 'Wallet already tracked' },
        409
      );
    }
    console.error('❌ Failed to add wallet:', error);
    return c.json(
      { success: false, error: 'Failed to add wallet' },
      500
    );
  }
});

// ── DELETE /arena/me/wallets/:id ──────────────────────────
// Remove a tracked wallet

agentConfigRoutes.delete('/wallets/:id', jwtAuth, async (c) => {
  try {
    const agentId = c.get('agentId');
    const walletId = c.req.param('id');

    // Verify wallet belongs to agent
    const wallet = await db.trackedWallet.findFirst({
      where: { id: walletId, agentId },
    });

    if (!wallet) {
      return c.json(
        { success: false, error: 'Wallet not found' },
        404
      );
    }

    await db.trackedWallet.delete({
      where: { id: walletId },
    });

    // Deactivate real-time monitoring for this wallet
    // Only remove from monitor if no other agent is tracking it
    const otherTrackers = await db.trackedWallet.count({
      where: { address: wallet.address, chain: wallet.chain },
    });
    if (otherTrackers === 0) {
      await deactivateWalletMonitor(wallet.address, wallet.chain);
      console.log(`🗑️ Wallet ${wallet.address.slice(0, 10)}... removed from monitor (${wallet.chain})`);
    }

    return c.json({
      success: true,
      message: 'Wallet removed',
    });
  } catch (error) {
    console.error('❌ Failed to delete wallet:', error);
    return c.json(
      { success: false, error: 'Failed to remove wallet' },
      500
    );
  }
});

export default agentConfigRoutes;
