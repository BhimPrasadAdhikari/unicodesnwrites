// The visitor's IP address, for rate limits and hashed analytics.
//
// Only headers set by our own edge can be trusted. On Vercel the edge overwrites
// x-vercel-forwarded-for / x-forwarded-for. Elsewhere (the AWS Lightsail load
// balancer) the proxy APPENDS the address it saw to X-Forwarded-For, so earlier
// entries are whatever the client sent and only the last TRUSTED_PROXY_HOPS-th
// entry from the end is real. x-vercel-* and x-real-ip are ignored off Vercel,
// because a client can send them directly.

type HeaderGetter = (name: string) => string | null | undefined;

const onVercel = Boolean(process.env.VERCEL);

function trustedHops() {
  const hops = Number.parseInt(process.env.TRUSTED_PROXY_HOPS || '1', 10);
  return Number.isFinite(hops) && hops > 0 ? hops : 1;
}

export function clientAddressFrom(get: HeaderGetter): string {
  if (onVercel) {
    const value = get('x-vercel-forwarded-for') || get('x-forwarded-for') || get('x-real-ip');
    return value?.split(',')[0].trim() || 'unknown';
  }
  const entries = (get('x-forwarded-for') || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (entries.length === 0) return 'unknown';
  return entries[Math.max(0, entries.length - trustedHops())];
}

/** For a Fetch API Headers object (route handlers, next/headers). */
export function clientAddressFromHeaders(headers: { get(name: string): string | null }): string {
  return clientAddressFrom((name) => headers.get(name));
}

/** For a Node-style header record (NextAuth's authorize request). */
export function clientAddressFromRecord(headers: Record<string, string | string[] | undefined> | undefined): string {
  return clientAddressFrom((name) => {
    const value = headers?.[name];
    return Array.isArray(value) ? value.join(',') : value;
  });
}
