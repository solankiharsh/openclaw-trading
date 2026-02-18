import { Hono } from 'hono';
import { z } from 'zod';
import { rateLimiter } from 'hono-rate-limiter';
import * as authService from '../services/auth.service';
import { authMiddleware } from '../middleware/auth';
import { getOrCreateQuickstartAgent, issueAgentTokens } from '../services/agent-session.service';
import { getOnboardingProgress } from '../services/onboarding.service';

const auth = new Hono();

const loginSchema = z.object({
  privyToken: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const quickstartSchema = z.object({
  archetypeId: z.string().min(1).optional(),
  name: z.string().min(1).max(32).optional(),
  displayName: z.string().min(1).max(50).optional(),
  twitterUsername: z.string().max(50).optional(),
  avatarUrl: z.string().url().optional(),
});

const quickstartLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-6',
  keyGenerator: (c) =>
    c.get('userId')
    || c.req.header('x-forwarded-for')
    || c.req.header('x-real-ip')
    || 'unknown',
});

// POST /auth/login
auth.post('/login', async (c) => {
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/3b42d969-38a3-41ef-acb2-0b0d1db5bbe4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:POST /login',message:'login handler entered',data:{route:'login'},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
  try {
    const body = await c.req.json();
    const { privyToken } = loginSchema.parse(body);

    const result = await authService.login(privyToken);

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: error.errors,
          },
        },
        400
      );
    }

    // #region agent log
    const errMsg = error instanceof Error ? error.message : String(error);
    const errName = error instanceof Error ? error.constructor.name : 'unknown';
    fetch('http://127.0.0.1:7245/ingest/3b42d969-38a3-41ef-acb2-0b0d1db5bbe4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:POST /login',message:'login error caught',data:{route:'login',errorMessage:errMsg,errorName:errName},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    console.error('Login error:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: error instanceof Error ? error.message : 'Authentication failed',
        },
      },
      401
    );
  }
});

// POST /auth/refresh
auth.post('/refresh', async (c) => {
  try {
    const body = await c.req.json();
    const { refreshToken } = refreshSchema.parse(body);

    const tokens = await authService.refresh(refreshToken);

    return c.json({
      success: true,
      data: tokens,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: error.errors,
          },
        },
        400
      );
    }

    return c.json(
      {
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Invalid refresh token',
        },
      },
      401
    );
  }
});

// GET /auth/me (protected) — returns userId from JWT
auth.get('/me', authMiddleware, async (c) => {
  const user = c.get('user');
  return c.json({
    success: true,
    data: {
      userId: user.sub,
      privyId: user.privyId,
      wallet: user.wallet ?? null,
    },
  });
});

// POST /auth/agent/quickstart (protected) — one-click agent setup for regular users
auth.post('/agent/quickstart', authMiddleware, quickstartLimiter, async (c) => {
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/3b42d969-38a3-41ef-acb2-0b0d1db5bbe4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:POST /agent/quickstart',message:'quickstart handler entered',data:{route:'quickstart'},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
  // #endregion
  try {
    const user = c.get('user');
    const userId = c.get('userId');
    const body = await c.req.json().catch(() => ({}));
    const { archetypeId, name, displayName, twitterUsername, avatarUrl } = quickstartSchema.parse(body || {});

    const agent = await getOrCreateQuickstartAgent({
      userId,
      walletAddress: user.wallet ?? null,
      archetypeId,
      name,
      displayName,
      twitterUsername,
      avatarUrl,
    });

    const subject = user.wallet || userId;
    const tokens = await issueAgentTokens(agent.id, subject);
    const onboarding = await getOnboardingProgress(agent.id);

    return c.json({
      success: true,
      data: {
        agent,
        onboarding,
        token: tokens.token,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: error.errors,
          },
        },
        400
      );
    }

    // #region agent log
    const errMsg = error instanceof Error ? error.message : String(error);
    const errName = error instanceof Error ? error.constructor.name : 'unknown';
    fetch('http://127.0.0.1:7245/ingest/3b42d969-38a3-41ef-acb2-0b0d1db5bbe4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:POST /agent/quickstart',message:'quickstart error caught',data:{route:'quickstart',errorMessage:errMsg,errorName:errName},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    console.error('Quickstart error:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Quickstart failed',
        },
      },
      500
    );
  }
});

export { auth };
