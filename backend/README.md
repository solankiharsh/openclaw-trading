# Backend

## Deploy from scratch (Railway + Supabase DB)

**Important:** Root Directory and build settings live on the **service** (the app you deploy), not in **Project Settings**. Project Settings (General, Usage, Shared Variables, etc.) are for the whole project. After you add a service from GitHub, you configure that **service**.

### Step 1: Get Supabase database URL

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → **New project** (or use an existing one).
2. Create the project (name, password, region). Wait for the DB to be ready.
3. **Settings** (gear) → **Database**.
4. Under **Connection string**, choose **URI**.
5. Copy the URI and replace `[YOUR-PASSWORD]` with your database password.  
   **Two URLs are required** (see `backend/.env.example`):  
   - **`DATABASE_URL`**: Use the **transaction-mode pooler** (port **6543**) for the app, e.g.  
     `postgresql://postgres.xxx:[PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require`  
   - **`DIRECT_URL`**: Use the **session-mode pooler** (port **5432**) for Prisma migrations and `db push`.  
     Same host and path as above, but change the port from **6543** to **5432**.  
     If you use 6543 for `DIRECT_URL`, `npx prisma db push` will hang (Supavisor transaction mode doesn’t support the operations Prisma runs).  
   Ensure SSL: add `?sslmode=require` (or `&sslmode=require` if the URL already has `?`).

### Step 2: Create Railway project and backend service

1. Go to [Railway Dashboard](https://railway.app/dashboard) → **New Project**.
2. Choose **Deploy from GitHub repo** (connect GitHub if needed).
3. Select the **openclaw-trading** repo and the branch (e.g. `main`). Confirm.
4. Railway creates a **service** (one box/card). **Click that service** so you’re inside it (you should see its deploy logs, Details, Build Logs, etc.), not the project-wide “Settings”.

### Step 3: Set Root Directory (on the service)

1. With the **service** selected, open **Settings** (tab or sidebar for this service).
2. Find **Source** (or **Build** / **Repository**). There you’ll see **Root Directory** (or “Monorepo root”).
3. Set **Root Directory** to: `backend`  
   (no leading slash). Save.

This makes install/build run inside `backend/`, so `bun install` and `bun run start` use `backend/package.json` and resolve `hono`. Your repo’s `backend/nixpacks.toml` and `backend/railway.json` are used automatically once the root is `backend`.

### Step 4: Add variables (on the service)

**Required:** If `DATABASE_URL` is missing, the deploy will crash with Prisma error `P1012: Environment variable not found: DATABASE_URL`.

1. In the same **service**, go to **Variables** (tab or **Variables** in the service sidebar).
2. Add (or in **Raw Editor** paste):

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | Supabase Postgres URI (transaction pooler, port 6543). |
| `DIRECT_URL` | Supabase Postgres URI for migrations (session pooler, port 5432 — same URL as above but use port **5432** so `db push` doesn’t hang). |
| `PRIVY_APP_ID` | From [Privy Dashboard](https://dashboard.privy.io) → your app. |
| `PRIVY_APP_SECRET` | From Privy Dashboard. |
| `JWT_SECRET` | At least 32 characters (e.g. run `openssl rand -base64 32`). |
| `NODE_ENV` | `production` |

3. Save. Railway will redeploy when you change variables.

### Step 5: Deploy and check

1. If the service didn’t deploy after setting Root Directory and variables, trigger **Redeploy** (e.g. from the **Deployments** tab or the three-dots menu).
2. Check **Deploy Logs** and **Build Logs**. Build should run `bun install` in `backend/` and start with `bun run start` (from `backend/railway.json`).
3. Open the generated URL (e.g. **Settings** → **Networking** → **Generate domain** if needed). Hit `/health` to confirm the app is up.

### Why do I see "web" and "frontend" on Railway?

Railway is for deploying the **backend** only. Your frontend is on Vercel. The "web" and "frontend" services were likely created when you added the repo twice or from a template. You only need **one** service that runs the backend:

- **Keep one service** (e.g. rename it to "backend" in Railway).
- Set its **Root Directory** to `backend` and add the required variables (DATABASE_URL, PRIVY_APP_ID, PRIVY_APP_SECRET, JWT_SECRET, NODE_ENV).
- **Remove or ignore** the other service(s). You can delete the extra service in Railway → that service → Settings → Danger → Remove.

### Connect Vercel frontend to the Railway backend

Once the backend is **Online** on Railway, use its URL for your Vercel frontend:

1. In **Railway** → your backend service → copy the public URL (e.g. `https://web-production-564c3.up.railway.app`).
2. In **Vercel** → your frontend project → **Settings** → **Environment Variables**.
3. Add (or update):
   - **`NEXT_PUBLIC_API_URL`** = `https://<your-railway-url>` (e.g. `https://web-production-564c3.up.railway.app`) — no trailing slash.
   - **`NEXT_PUBLIC_WS_URL`** = `wss://<your-railway-url>` (same host, `wss://` for WebSockets).
4. Redeploy the Vercel app so the new variables are picked up. The frontend will then call the Railway backend for auth, arena, and API.

### "cd: web: No such file or directory" in deploy logs

Railway runs `cd <Root Directory>` before build/start. If your service is **named "web"**, Railway may have set Root Directory to `web` (the frontend folder). This repo’s backend lives in **`backend/`**, not `web/`. Fix:

1. Open the **service** that should run the backend (the one showing this error).
2. Go to **Settings** → **Source** (or **Build** / **Repository**).
3. Set **Root Directory** to **`backend`** (not `web`). Save.
4. Redeploy. Commands will run from `backend/`, so `bun install` and `bun run start` use the correct package.json.

### Check DATABASE_URL locally (Supabase)

From the backend directory, after `bun install`:

```bash
cd backend && bun install && node scripts/check-db-connection.mjs
```

The script loads `backend/.env` and `backend/.env.local`, then verifies the database connection. If it prints `✅ Database connection OK`, the same `DATABASE_URL` should work on Railway (copy it into the backend service Variables).

### Optional: Use Railway Postgres instead of Supabase

- In the same Railway project: **Add Service** → **Database** → **PostgreSQL**.  
- In the **backend** service → **Variables**, add or reference `DATABASE_URL` (Railway often injects it when you link the Postgres service).  
- Then you can skip Step 1 and use Railway’s `DATABASE_URL`.

---

## Deploying to Railway (reference)

1. **Set Root Directory**: In Railway → **your backend service** (not Project Settings) → **Settings** → **Source** → set **Root Directory** to `backend`.  
   If this is not set, `bun install` runs at repo root (no backend deps), and the app fails at start with "Could not resolve: hono". The `build` script in package.json is a no-op so Nixpacks doesn't need to bundle; the process runs via `bun run src/index.ts` in `start`.

2. Build (from `backend/railway.json`): runs `bun install && bunx prisma generate && bunx prisma db push --accept-data-loss` so the DB is ready before the container starts. Start command is `bun run src/index.ts` only, so the server listens immediately and the healthcheck can pass. `DATABASE_URL` must be set in the service (Railway provides it at build time). To produce a `dist/` bundle locally use `bun run build:bundle`.

3. **Variables**: In Railway → your backend service → **Variables** (or **Settings** → **Variables**), add the following.  
   Use **Add Variable** / **Raw Editor** and paste name/value. Replace placeholders with real values.

### Required (app will not start without these)

| Variable | Example / notes |
|----------|------------------|
| `DATABASE_URL` | From Railway: add a **PostgreSQL** plugin to the project, then reference `DATABASE_URL` (Railway injects it) or copy the connection string. For Supabase use pooler port 6543. |
| `DIRECT_URL` | For **Supabase**: same as `DATABASE_URL` but port **5432** (session mode), so Prisma `db push` / migrations don’t hang. For **Railway** or single DB: set to the same value as `DATABASE_URL`. |
| `PRIVY_APP_ID` | From [Privy Dashboard](https://dashboard.privy.io) → your app. |
| `PRIVY_APP_SECRET` | From Privy Dashboard → your app (keep secret). |
| `JWT_SECRET` | Any random string **at least 32 characters** (e.g. `openssl rand -base64 32`). |
| `JWT_EXPIRES_IN` | `15m` (default). |
| `JWT_REFRESH_EXPIRES_IN` | `7d` (default). |

### Optional (set only if you use the feature)

| Variable | Example / notes |
|----------|------------------|
| `PORT` | `3001` (Railway often sets this automatically). |
| `NODE_ENV` | `production`. |
| `REDIS_URL` | e.g. Upstash Redis: `redis://default:xxx@xxx.upstash.io:6379`. Needed for WebSocket adapter and webhook queue when running multiple replicas. |
| `DEVPRINT_URL` | DevPrint API base URL if using AI trading. |
| `DEVPRINT_WS_URL` | Default `wss://devprint-v2-production.up.railway.app`. |
| `INTERNAL_API_KEY` | Random 16+ char string for DevPrint → backend internal calls. |
| `SOLANA_NETWORK` | `devnet` or `mainnet-beta`. |
| `SOLANA_RPC_URL` | RPC URL (e.g. Helius, QuickNode). |
| `HELIUS_API_KEY` | For Helius WebSocket / RPC. |
| `HELIUS_WEBHOOK_SECRET` | Must match Helius dashboard if using webhooks. |
| `BIRDEYE_API_KEY` | Birdeye token data. |
| `BSC_RPC_URL` | BSC RPC if using BSC features. |
| `BSC_TREASURY_PRIVATE_KEY` | `0x...` for BSC/Four.Meme. |
| `BSC_REWARD_TOKEN_ADDRESS` | Token contract for rewards. |
| `KALSHI_API_KEY` / `KALSHI_PRIVATE_KEY_PEM` / `KALSHI_MODE` | Kalshi prediction markets. |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GROQ_API_KEY` | LLM services. |
| `SIWE_DOMAIN` / `SIWE_URI` | Sign-in with Ethereum (defaults to supermolt.xyz). |

### Quick copy-paste (required only)

Add a PostgreSQL service in Railway first, then in the backend service Variables add:

- `PRIVY_APP_ID` = (from Privy)
- `PRIVY_APP_SECRET` = (from Privy)
- `JWT_SECRET` = (min 32 chars, e.g. from `openssl rand -base64 32`)
- `DATABASE_URL` = (usually auto-set by Railway when you link the Postgres service; otherwise paste the connection string)
- `DIRECT_URL` = (same as `DATABASE_URL` for Railway; for Supabase use the same URL with port 5432 instead of 6543)
- `NODE_ENV` = `production`
