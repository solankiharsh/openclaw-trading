# 🚀 Next Improvements - SuperClaw

**Status:** Backend team delivered 3 major commits ✅  
**What's Done:** PrismaClient singleton + Webhook security + XP system  
**Time:** Feb 8, 2026, 1:30 PM Sofia

---

## ✅ What's Already Fixed (Commits 889492b, 31ff212, 11e205e)

1. ✅ **PrismaClient Singleton** - 20+ instances → 1 shared instance
2. ✅ **Webhook Signature Enforcement** - Production now rejects unsigned webhooks
3. ✅ **SIWS Authentication** - Full wallet-based auth system
4. ✅ **XP System** - Levels, onboarding tasks, auto-completes
5. ✅ **9 Critical Bugs** - SIWS signature, token refresh, trade stats, etc.
6. ✅ **Error Sanitization** - No more stack trace leaks

**Impact:** Database stable, security hardened, auth working, XP live

---

## 🎯 Remaining Quick Wins (45 min total)

### 1. CORS - Add Production Domains (5 min) 🟡

**Issue:** Frontend domains not in allowedOrigins  
**Current:**
```typescript
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:8081',
  'exp://localhost:8081',
  'https://sr-mobile-production.up.railway.app',
];
```

**Missing:**
- `https://www.superclaw.xyz` ← Production frontend
- `https://superclaw.xyz` ← Production frontend (no www)
- `https://trench-terminal-omega.vercel.app` ← Vercel preview

**Fix:**
```typescript
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001', // Next.js dev
  'http://localhost:8081',
  'exp://localhost:8081',
  'https://sr-mobile-production.up.railway.app',
  'https://www.superclaw.xyz', // Production
  'https://superclaw.xyz', // Production (no www)
  'https://trench-terminal-omega.vercel.app', // Vercel
];
```

**Deploy:**
```bash
cd backend
# Edit src/index.ts - add 3 lines to allowedOrigins array
git add src/index.ts
git commit -m "fix: add production frontend domains to CORS allowlist"
git push origin main
```

**Impact:** Frontend can now call backend APIs from production

---

### 2. Frontend Token Refresh Interceptor (20 min) 🟡

**Issue:** Users silently logged out after 15 minutes  
**Impact:** Bad UX, confusing "unauthorized" errors

**Fix:**
```typescript
// web/lib/api.ts
import { useAuthStore } from '../store/authStore';

// Add axios interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If 401 and haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const { refreshToken } = useAuthStore.getState();
      
      if (!refreshToken) {
        // No refresh token, sign out
        useAuthStore.getState().clearAuth();
        window.location.href = '/';
        return Promise.reject(error);
      }
      
      try {
        // Call refresh endpoint
        const res = await fetch(`${API_URL}/auth/agent/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        
        if (!res.ok) throw new Error('Refresh failed');
        
        const { token: newToken } = await res.json();
        
        // Update store
        useAuthStore.getState().setToken(newToken);
        
        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, sign out
        useAuthStore.getState().clearAuth();
        window.location.href = '/';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);
```

**Impact:** Seamless auth, users never randomly logged out

---

### 3. Concurrency Limiter Utility (20 min) 🟢

**Issue:** Some bulk operations hit rate limits  
**Example:** Observer agents fetching DexScreener for 10+ tokens simultaneously

**Fix:**
```typescript
// backend/src/lib/concurrency.ts
export async function mapConcurrent<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency = 5
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  
  return results;
}

// Usage example:
import { mapConcurrent } from '../lib/concurrency';

// Instead of:
const data = await Promise.all(tokens.map(fetchDexScreener));

// Do:
const data = await mapConcurrent(tokens, fetchDexScreener, 3);
```

**Use in:**
- Observer agent token analysis
- Bulk task creation
- Batch webhook processing

**Impact:** Prevents API rate limiting, more stable under load

---

## 🔍 Additional Improvements (Optional)

### 4. Rate Limiting per Agent (30 min) 🟢

**Why:** Prevent single agent from spamming endpoints  
**Current:** Global rate limits only  
**Improvement:** Per-agent rate limits

```typescript
// backend/src/middleware/agent-rate-limit.ts
import { RateLimiter } from 'limiter';

const agentLimiters = new Map<string, RateLimiter>();

export function agentRateLimit(requestsPerMinute = 30) {
  return async (c: Context, next: Next) => {
    const agentId = c.get('agentId'); // From JWT
    
    if (!agentId) return next();
    
    let limiter = agentLimiters.get(agentId);
    
    if (!limiter) {
      limiter = new RateLimiter({ tokensPerInterval: requestsPerMinute, interval: 'minute' });
      agentLimiters.set(agentId, limiter);
    }
    
    const allowed = await limiter.tryRemoveTokens(1);
    
    if (!allowed) {
      return c.json({ 
        error: { 
          code: 'RATE_LIMIT_EXCEEDED', 
          message: `Rate limit: ${requestsPerMinute} requests/min` 
        } 
      }, 429);
    }
    
    return next();
  };
}

// Apply to endpoints:
app.post('/arena/tasks/:id/proof', agentRateLimit(10), async (c) => { ... });
```

**Impact:** Prevents abuse, fair resource distribution

---

### 5. Database Indexes Audit (15 min) 🟢

**Why:** Ensure all frequent queries have indexes  
**Check these tables:**

```sql
-- Verify indexes exist
SELECT tablename, indexname FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;

-- Add missing indexes if needed:
CREATE INDEX IF NOT EXISTS idx_trading_agents_pubkey ON trading_agents(pubkey);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_agent ON agent_tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_paper_trades_scanner ON paper_trades(scanner_id);
CREATE INDEX IF NOT EXISTS idx_paper_trades_status ON paper_trades(status);
```

**Impact:** Faster queries, especially leaderboards and task lookups

---

### 6. Monitoring & Alerting (1 hour) 🟢

**Why:** Know when things break before users complain  
**Tools:** Sentry, LogDNA, or Railway built-in

**Setup:**
```typescript
// backend/src/lib/monitoring.ts
import * as Sentry from '@sentry/node';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
}

export function captureError(error: Error, context?: any) {
  console.error('[Error]', error, context);
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error, { extra: context });
  }
}

// Use in catch blocks:
try {
  await someOperation();
} catch (error) {
  captureError(error, { operation: 'someOperation', agentId });
  return c.json({ error: 'Operation failed' }, 500);
}
```

**Impact:** Faster bug detection, better debugging

---

### 7. API Response Caching (30 min) 🟢

**Why:** Reduce database load for read-heavy endpoints  
**Candidates:** Leaderboards, skills pack, task lists

```typescript
// backend/src/middleware/cache.ts
const cache = new Map<string, { data: any; expires: number }>();

export function cached(ttlSeconds = 60) {
  return async (c: Context, next: Next) => {
    const key = c.req.url;
    const now = Date.now();
    
    const cached = cache.get(key);
    if (cached && cached.expires > now) {
      return c.json(cached.data);
    }
    
    await next();
    
    const response = await c.res.json();
    cache.set(key, { data: response, expires: now + ttlSeconds * 1000 });
  };
}

// Use:
app.get('/api/leaderboard', cached(30), async (c) => { ... });
app.get('/skills/pack', cached(300), async (c) => { ... });
```

**Impact:** Faster responses, lower DB load

---

## 📋 Priority Order

### Today (15 min)
1. ✅ CORS - Add production domains (5 min)
2. ✅ Frontend token refresh (10 min deploy, already coded)

### This Week (1.5 hours)
3. Concurrency limiter utility (20 min)
4. Rate limiting per agent (30 min)
5. Database indexes audit (15 min)
6. API response caching (30 min)

### Next Sprint (1+ hours)
7. Monitoring & alerting setup (1 hour)
8. Performance profiling (1 hour)
9. Load testing (1 hour)

---

## ✅ Success Metrics

**After today's fixes:**
- ✅ Frontend works from production domains
- ✅ Users never randomly logged out
- ✅ No rate limiting errors

**After this week:**
- ✅ Per-agent fair usage
- ✅ Fast leaderboard queries (cached)
- ✅ No API throttling
- ✅ All queries indexed

---

## 📊 Quick Impact Assessment

| Improvement | Time | Impact | Priority |
|-------------|------|--------|----------|
| CORS domains | 5 min | HIGH | Do now |
| Token refresh | 20 min | HIGH | Do now |
| Concurrency limiter | 20 min | MEDIUM | This week |
| Per-agent rate limit | 30 min | MEDIUM | This week |
| Database indexes | 15 min | MEDIUM | This week |
| Response caching | 30 min | MEDIUM | This week |
| Monitoring | 1 hour | LOW | Next sprint |

---

**Recommendation:** Deploy CORS + token refresh today (25 min total). Everything else this week. 🚀
