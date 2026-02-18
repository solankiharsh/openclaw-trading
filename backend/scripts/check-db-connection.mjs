#!/usr/bin/env node
/**
 * Verify DATABASE_URL (from .env / .env.local) can connect to the database.
 * Run from backend dir: bun scripts/check-db-connection.mjs  (or node after: bun install)
 */
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const backendRoot = join(__dirname, '..');

function loadEnv(dir) {
  for (const name of ['.env', '.env.local']) {
    const p = join(dir, name);
    if (!existsSync(p)) continue;
    const raw = readFileSync(p, 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
        val = val.slice(1, -1);
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

loadEnv(backendRoot);
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('❌ DATABASE_URL not set. Set it in backend/.env or backend/.env.local');
  process.exit(1);
}

let safe = url;
try {
  const parsed = new URL(url.replace(/^postgres:\/\//, 'postgresql://'));
  safe = `${parsed.protocol}//${parsed.hostname}:${parsed.port || '5432'}***`;
} catch (_) {}
console.log('Checking connection:', safe);

// Prisma CLI reads .env from schema dir; write temp .env so it finds DATABASE_URL
const envPath = join(backendRoot, '.env');
const hadEnv = existsSync(envPath);
let originalEnv = '';
if (hadEnv) originalEnv = readFileSync(envPath, 'utf8');
const prismaBin = join(backendRoot, 'node_modules', '.bin', 'prisma');
const usePrismaBin = existsSync(prismaBin);
try {
  writeFileSync(envPath, `DATABASE_URL="${url.replace(/"/g, '\\"')}"\n`, 'utf8');
  const result = usePrismaBin
    ? spawnSync(prismaBin, ['db', 'execute', '--stdin'], {
        cwd: backendRoot,
        input: 'SELECT 1',
        env: { ...process.env, DATABASE_URL: url },
        encoding: 'utf8',
      })
    : spawnSync(
        process.execPath.includes('bun') ? 'bunx' : 'npx',
        ['prisma', 'db', 'execute', '--stdin'],
        { cwd: backendRoot, input: 'SELECT 1', env: { ...process.env, DATABASE_URL: url }, encoding: 'utf8', shell: true }
      );
  if (result.status === 0) {
    console.log('✅ Database connection OK');
  } else {
    console.error('❌ Database connection failed:', result.stderr || result.error?.message || 'Unknown error');
    process.exit(1);
  }
} finally {
  if (hadEnv) writeFileSync(envPath, originalEnv, 'utf8');
  else if (existsSync(envPath)) unlinkSync(envPath);
}
