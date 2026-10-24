import crypto from 'crypto';

/**
 * Validates a fingerprint or generates a server-side hash
 */
export function generateServerFingerprint(ip: string, userAgent: string): string {
  const data = `${ip}|${userAgent}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Anonymize IP address by hashing it
 */
export function anonymizeIp(ip: string): string {
  // Use a secret salt if available, otherwise just hash
  // In a real app, use an env var for the salt to prevent rainbow table attacks
  const salt = process.env.ANALYTICS_SALT || 'default-salt-change-me';
  return crypto.createHash('sha256').update(`${ip}${salt}`).digest('hex');
}
