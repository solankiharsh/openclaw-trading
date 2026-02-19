import { Context, Next } from 'hono';
import * as jose from 'jose';

declare module 'hono' {
  interface ContextVariableMap {
    agentId: string;
    agentPubkey: string;
  }
}

const JWT_SECRET = process.env.JWT_SECRET;

export async function agentAuthMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Authorization required' }, 401);
  }

  const token = authHeader.slice(7);
  if (!JWT_SECRET) {
    return c.json({ success: false, error: 'Server configuration error' }, 500);
  }

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);

    if (payload.type !== 'agent') {
      return c.json({ success: false, error: 'Invalid token type' }, 401);
    }

    c.set('agentId', payload.agentId as string);
    c.set('agentPubkey', payload.sub as string);
    await next();
  } catch {
    return c.json({ success: false, error: 'Invalid or expired token' }, 401);
  }
}
