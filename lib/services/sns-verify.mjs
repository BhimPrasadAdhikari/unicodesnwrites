// Amazon SNS message signature verification for the SES bounce webhook. Plain
// ESM with no app imports so the security regression script can import it
// directly. Follows https://docs.aws.amazon.com/sns/latest/dg/sns-verify-signature-of-message.html
import crypto from 'node:crypto';

const SNS_HOST = /^sns\.[a-z0-9-]+\.amazonaws\.com$/;
const CERT_CACHE_LIMIT = 20;
const FETCH_TIMEOUT_MS = 5_000;

// The signed keys, in the byte order AWS signs them. Subject is only signed when present.
const SIGNED_KEYS = {
  Notification: ['Message', 'MessageId', 'Subject', 'Timestamp', 'TopicArn', 'Type'],
  SubscriptionConfirmation: ['Message', 'MessageId', 'SubscribeURL', 'Timestamp', 'Token', 'TopicArn', 'Type'],
  UnsubscribeConfirmation: ['Message', 'MessageId', 'SubscribeURL', 'Timestamp', 'Token', 'TopicArn', 'Type'],
};

const ALGORITHMS = { 1: 'RSA-SHA1', 2: 'RSA-SHA256' };

/**
 * The string AWS signed for this message ("Key\nValue\n" per signed key), or
 * null when the type is unknown or a required key is missing.
 * @param {Record<string, unknown>} message
 * @returns {string | null}
 */
export function buildSnsStringToSign(message) {
  const keys = SIGNED_KEYS[/** @type {keyof typeof SIGNED_KEYS} */ (String(message?.Type))];
  if (!keys) return null;
  let result = '';
  for (const key of keys) {
    const value = message[key];
    if (value === undefined || value === null) {
      if (key === 'Subject') continue;
      return null;
    }
    if (typeof value !== 'string') return null;
    result += `${key}\n${value}\n`;
  }
  return result;
}

/**
 * True for an https URL on an SNS regional endpoint (sns.<region>.amazonaws.com).
 * @param {unknown} value
 * @returns {boolean}
 */
export function isSnsUrl(value) {
  try {
    const url = new URL(String(value ?? ''));
    return url.protocol === 'https:' && !url.port && !url.username && !url.password && SNS_HOST.test(url.hostname);
  } catch {
    return false;
  }
}

/**
 * True when a SigningCertURL is safe to fetch: an SNS endpoint serving a .pem file.
 * @param {unknown} value
 * @returns {boolean}
 */
export function isSnsCertUrl(value) {
  if (!isSnsUrl(value)) return false;
  return new URL(String(value)).pathname.endsWith('.pem');
}

/**
 * Checks the RSA signature against the certificate. Never throws.
 * @param {Record<string, unknown>} message
 * @param {string} certPem
 * @returns {boolean}
 */
export function verifySnsSignature(message, certPem) {
  const algorithm = ALGORITHMS[/** @type {1 | 2} */ (Number(message?.SignatureVersion))];
  const stringToSign = buildSnsStringToSign(message);
  if (!algorithm || !stringToSign || typeof message.Signature !== 'string' || !certPem) return false;
  try {
    return crypto.createVerify(algorithm).update(stringToSign, 'utf8').verify(certPem, message.Signature, 'base64');
  } catch {
    return false;
  }
}

/** @type {Map<string, string>} */
const certCache = new Map();

/**
 * Downloads (once per URL) the PEM certificate SNS signed with. Throws when the
 * URL is not an SNS endpoint or the certificate is unusable or expired.
 * @param {string} certUrl
 * @returns {Promise<string>}
 */
export async function fetchSnsSigningCert(certUrl) {
  if (!isSnsCertUrl(certUrl)) throw new Error('Untrusted SigningCertURL');
  const cached = certCache.get(certUrl);
  if (cached) return cached;

  const response = await fetch(certUrl, { redirect: 'error', signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`SigningCertURL returned ${response.status}`);
  const pem = await response.text();
  const certificate = new crypto.X509Certificate(pem);
  if (Date.parse(certificate.validTo) < Date.now()) throw new Error('SNS signing certificate expired');

  if (certCache.size >= CERT_CACHE_LIMIT) certCache.delete(certCache.keys().next().value);
  certCache.set(certUrl, pem);
  return pem;
}

/**
 * Full check of a parsed SNS message: TopicArn, cert URL and signature. Never
 * throws. `loadCert` is injectable so tests can supply a local certificate.
 * @param {Record<string, unknown>} message
 * @param {{ topicArn: string, loadCert?: (url: string) => Promise<string> }} options
 * @returns {Promise<boolean>}
 */
export async function verifySnsMessage(message, { topicArn, loadCert = fetchSnsSigningCert }) {
  if (!message || typeof message !== 'object' || !topicArn || message.TopicArn !== topicArn) return false;
  if (!isSnsCertUrl(message.SigningCertURL)) return false;
  try {
    const pem = await loadCert(String(message.SigningCertURL));
    return verifySnsSignature(message, pem);
  } catch {
    return false;
  }
}
