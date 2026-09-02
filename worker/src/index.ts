export interface Env {
  AUTH_SECRET?: string;
}

// In-memory rate limiting map (per edge isolate)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(clientIp: string, limit = 30, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(clientIp);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(clientIp, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count++;
  return true;
}

// Timing-safe string comparison to prevent side-channel timing attacks
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const aBuf = await crypto.subtle.digest('SHA-256', enc.encode(a));
  const bBuf = await crypto.subtle.digest('SHA-256', enc.encode(b));
  return crypto.subtle.timingSafeEqual(aBuf, bBuf);
}

// Security headers applied to every response
const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none';",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
};

function secureResponse(body: BodyInit | null, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(body, {
    ...init,
    headers
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const clientIp = request.headers.get('cf-connecting-ip') || 'unknown';

    // 1. Rate Limiting Protection
    if (!checkRateLimit(clientIp, 30, 60000)) {
      return secureResponse(JSON.stringify({ error: 'Too Many Requests' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '60' }
      });
    }

    const url = new URL(request.url);

    // 2. Health check endpoint (public, returns 200 OK)
    if (url.pathname === '/health') {
      if (request.method !== 'GET') {
        return secureResponse('Method Not Allowed', { status: 405 });
      }
      return secureResponse(JSON.stringify({ status: 'ok', time: new Date().toISOString() }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Secure Proxy Endpoint (Strictly hardcoded target to prevent SSRF)
    if (url.pathname === '/api/fetch-sih') {
      if (request.method !== 'GET' && request.method !== 'POST') {
        return secureResponse('Method Not Allowed', { status: 405 });
      }

      // Authentication Check
      const configuredSecret = env.AUTH_SECRET;
      if (configuredSecret) {
        const authHeader = request.headers.get('Authorization') || '';
        const customHeader = request.headers.get('X-API-Key') || '';
        let providedToken = '';

        if (authHeader.startsWith('Bearer ')) {
          providedToken = authHeader.slice(7).trim();
        } else if (customHeader) {
          providedToken = customHeader.trim();
        }

        if (!providedToken) {
          return secureResponse(JSON.stringify({ error: 'Unauthorized: Missing API Key' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const isValid = await timingSafeEqual(providedToken, configuredSecret);
        if (!isValid) {
          return secureResponse(JSON.stringify({ error: 'Unauthorized: Invalid API Key' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }

      // Upstream Fetch (Target is hardcoded - SSRF is impossible)
      try {
        const upstreamResponse = await fetch('https://sih.gov.in/sih2026PS', {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://sih.gov.in/',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin'
          },
          cf: {
            cacheTtl: 300, // Edge cache for 5 minutes to protect upstream and reduce latency
            cacheEverything: false
          }
        });

        if (!upstreamResponse.ok) {
          return secureResponse(
            JSON.stringify({
              error: 'Upstream Error',
              status: upstreamResponse.status
            }),
            {
              status: 502,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }

        const html = await upstreamResponse.text();

        return secureResponse(html, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'private, no-cache, no-store, must-revalidate'
          }
        });
      } catch (err: any) {
        // Mask internal details; do not leak infrastructure specifics
        return secureResponse(
          JSON.stringify({
            error: 'Failed to contact official portal'
          }),
          {
            status: 504,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // 4. Default Fallback: Reject any unknown path
    return secureResponse(JSON.stringify({ error: 'Not Found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
