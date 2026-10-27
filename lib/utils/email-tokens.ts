import crypto from 'crypto';

// The development fallback is public (this repo is), so production never uses it:
// without a dedicated secret it derives one from NEXTAUTH_SECRET instead.
const SECRET =
  process.env.NEWSLETTER_UNSUBSCRIBE_SECRET ||
  (process.env.NEXTAUTH_SECRET
    ? crypto.createHash('sha256').update(`unsubscribe:${process.env.NEXTAUTH_SECRET}`).digest('hex')
    : process.env.NODE_ENV === 'production'
      ? crypto.randomBytes(32).toString('hex')
      : 'fallback-secret-for-dev-only-do-not-use-in-prod');

/**
 * Generates a secure token for one-click unsubscribe links
 * The token is a hash of the email and a server-side secret
 */
export function generateUnsubscribeToken(email: string): string {
  return crypto
    .createHmac('sha256', SECRET)
    .update(email.toLowerCase().trim())
    .digest('hex');
}

/**
 * Validates an unsubscribe token
 */
export function validateUnsubscribeToken(email: string, token: string): boolean {
  if (!email || !token) return false;
  
  const expectedToken = generateUnsubscribeToken(email);
  
  // Use timingSafeEqual to prevent timing attacks
  try {
    const tokenParams = Buffer.from(token, 'hex');
    const expectedParams = Buffer.from(expectedToken, 'hex');
    
    if (tokenParams.length !== expectedParams.length) return false;
    
    return crypto.timingSafeEqual(tokenParams, expectedParams);
  } catch {
    return false;
  }
}
