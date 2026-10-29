// Checks the SNS signature verifier behind /api/webhooks/ses with a locally
// generated key and self-signed certificate. No network: fetch is stubbed.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildSnsStringToSign,
  fetchSnsSigningCert,
  isSnsCertUrl,
  isSnsUrl,
  verifySnsMessage,
  verifySnsSignature,
} from '../../lib/services/sns-verify.mjs';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');

// --- Minimal DER encoder for a self-signed X.509 certificate -------------------
const derLength = (length) => {
  if (length < 0x80) return Buffer.from([length]);
  const bytes = [];
  for (let value = length; value > 0; value >>= 8) bytes.unshift(value & 0xff);
  return Buffer.from([0x80 | bytes.length, ...bytes]);
};
const tlv = (tag, ...parts) => {
  const body = Buffer.concat(parts);
  return Buffer.concat([Buffer.from([tag]), derLength(body.length), body]);
};
const sequence = (...parts) => tlv(0x30, ...parts);
const oid = (hex) => tlv(0x06, Buffer.from(hex, 'hex'));
const utcTime = (date) => tlv(0x17, Buffer.from(`${date.toISOString().slice(2, 19).replace(/[-:T]/g, '')}Z`));
const name = (commonName) => sequence(tlv(0x31, sequence(oid('550403'), tlv(0x0c, Buffer.from(commonName)))));

function selfSignedCert(privateKey, publicKey, { notAfter }) {
  const sha256WithRsa = sequence(oid('2a864886f70d01010b'), Buffer.from([0x05, 0x00]));
  const tbs = sequence(
    tlv(0xa0, tlv(0x02, Buffer.from([0x02]))),
    tlv(0x02, Buffer.from([0x01])),
    sha256WithRsa,
    name('sns.test'),
    sequence(utcTime(new Date(Date.now() - 60_000)), utcTime(notAfter)),
    name('sns.test'),
    publicKey.export({ type: 'spki', format: 'der' }),
  );
  const signature = crypto.sign('sha256', tbs, privateKey);
  const der = sequence(tbs, sha256WithRsa, tlv(0x03, Buffer.from([0x00]), signature));
  const base64 = der.toString('base64').match(/.{1,64}/g).join('\n');
  return `-----BEGIN CERTIFICATE-----\n${base64}\n-----END CERTIFICATE-----\n`;
}

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const certPem = selfSignedCert(privateKey, publicKey, { notAfter: new Date(Date.now() + 86_400_000) });
assert.ok(new crypto.X509Certificate(certPem).verify(publicKey), 'test certificate must be well formed');

const topicArn = 'arn:aws:sns:ap-south-1:123456789012:ses-bounces';
const certUrl = 'https://sns.ap-south-1.amazonaws.com/SimpleNotificationService-abc123.pem';

function sign(message, version = '2') {
  const signed = { ...message, SignatureVersion: version, SigningCertURL: certUrl };
  signed.Signature = crypto
    .createSign(version === '1' ? 'RSA-SHA1' : 'RSA-SHA256')
    .update(buildSnsStringToSign(signed), 'utf8')
    .sign(privateKey, 'base64');
  return signed;
}

// --- Canonical string ----------------------------------------------------------
const notification = {
  Type: 'Notification',
  MessageId: 'msg-1',
  TopicArn: topicArn,
  Subject: 'Amazon SES Email Event Notification',
  Message: '{"notificationType":"Bounce"}',
  Timestamp: '2026-10-29T10:00:00.000Z',
  UnsubscribeURL: 'https://sns.ap-south-1.amazonaws.com/?Action=Unsubscribe',
};
assert.equal(
  buildSnsStringToSign(notification),
  'Message\n{"notificationType":"Bounce"}\nMessageId\nmsg-1\nSubject\nAmazon SES Email Event Notification\n'
    + `Timestamp\n2026-10-29T10:00:00.000Z\nTopicArn\n${topicArn}\nType\nNotification\n`,
  'Notification must sign Message, MessageId, Subject, Timestamp, TopicArn, Type in order',
);
const { Subject, ...noSubject } = notification;
assert.doesNotMatch(buildSnsStringToSign(noSubject), /Subject/, 'a missing Subject is left out of the string to sign');

const confirmation = {
  Type: 'SubscriptionConfirmation',
  MessageId: 'msg-2',
  Token: 'token-1',
  TopicArn: topicArn,
  Message: 'You have chosen to subscribe',
  SubscribeURL: 'https://sns.ap-south-1.amazonaws.com/?Action=ConfirmSubscription&Token=token-1',
  Timestamp: '2026-10-29T10:00:00.000Z',
};
assert.equal(
  buildSnsStringToSign(confirmation),
  `Message\nYou have chosen to subscribe\nMessageId\nmsg-2\nSubscribeURL\n${confirmation.SubscribeURL}\n`
    + `Timestamp\n2026-10-29T10:00:00.000Z\nToken\ntoken-1\nTopicArn\n${topicArn}\nType\nSubscriptionConfirmation\n`,
  'SubscriptionConfirmation must sign SubscribeURL and Token',
);
assert.match(buildSnsStringToSign({ ...confirmation, Type: 'UnsubscribeConfirmation' }), /Token\ntoken-1\n/);
assert.equal(buildSnsStringToSign({ ...notification, Type: 'Other' }), null, 'unknown types have no string to sign');
const { Token, ...noToken } = confirmation;
assert.equal(buildSnsStringToSign(noToken), null, 'a missing required key must fail');

// --- Certificate and SubscribeURL host checks ----------------------------------
for (const good of [certUrl, 'https://sns.us-east-1.amazonaws.com/a/b.pem']) {
  assert.ok(isSnsCertUrl(good), `${good} should be trusted`);
}
for (const bad of [
  'http://sns.ap-south-1.amazonaws.com/cert.pem',
  'https://sns.ap-south-1.amazonaws.com.evil.example/cert.pem',
  'https://evil.example/sns.ap-south-1.amazonaws.com/cert.pem',
  'https://sns.ap-south-1.amazonaws.com/cert.txt',
  'https://sns.ap-south-1.amazonaws.com:8443/cert.pem',
  'https://user@sns.ap-south-1.amazonaws.com/cert.pem',
  'https://xsns.ap-south-1.amazonaws.com/cert.pem',
  'https://sqs.ap-south-1.amazonaws.com/cert.pem',
  'not a url',
  undefined,
]) {
  assert.ok(!isSnsCertUrl(bad), `${bad} must not be trusted`);
}
assert.ok(isSnsUrl(confirmation.SubscribeURL), 'SubscribeURL on an SNS endpoint is allowed');
assert.ok(!isSnsUrl('https://example.com/?Action=ConfirmSubscription'), 'SubscribeURL elsewhere is refused');

// --- Signature round trip --------------------------------------------------------
const loadCert = async (url) => {
  assert.equal(url, certUrl);
  return certPem;
};
for (const version of ['1', '2']) {
  const signed = sign(notification, version);
  assert.ok(verifySnsSignature(signed, certPem), `SignatureVersion ${version} must verify`);
  assert.ok(await verifySnsMessage(signed, { topicArn, loadCert }), `SignatureVersion ${version} message must verify`);
}
assert.ok(await verifySnsMessage(sign(confirmation), { topicArn, loadCert }), 'signed confirmation must verify');

const signed = sign(notification);
const tampered = [
  { ...signed, Message: '{"notificationType":"Complaint"}' },
  { ...signed, MessageId: 'msg-other' },
  { ...signed, Subject: 'changed' },
  { ...signed, SignatureVersion: '3' },
  { ...signed, SignatureVersion: '1' },
  { ...signed, Signature: 'AAAA' },
];
for (const message of tampered) {
  assert.ok(!(await verifySnsMessage(message, { topicArn, loadCert })), 'tampered messages must be rejected');
}
assert.ok(!(await verifySnsMessage(signed, { topicArn: `${topicArn}-other`, loadCert })), 'other topics must be rejected');
assert.ok(!(await verifySnsMessage(signed, { topicArn: '', loadCert })), 'an unset topic must reject everything');
assert.ok(
  !(await verifySnsMessage({ ...signed, SigningCertURL: 'https://evil.example/cert.pem' }, { topicArn, loadCert: async () => certPem })),
  'an untrusted SigningCertURL must be rejected before loading',
);
assert.ok(
  !(await verifySnsMessage(signed, { topicArn, loadCert: async () => { throw new Error('offline'); } })),
  'a certificate failure must reject, not throw',
);
const otherKey = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const otherCert = selfSignedCert(otherKey.privateKey, otherKey.publicKey, { notAfter: new Date(Date.now() + 86_400_000) });
assert.ok(!(await verifySnsMessage(signed, { topicArn, loadCert: async () => otherCert })), 'a different key must be rejected');

// --- Certificate download (fetch stubbed) ---------------------------------------
const realFetch = globalThis.fetch;
let fetches = 0;
globalThis.fetch = async (url, init) => {
  fetches++;
  assert.equal(init?.redirect, 'error', 'certificate fetch must not follow redirects');
  if (String(url).includes('expired')) {
    return new Response(selfSignedCert(privateKey, publicKey, { notAfter: new Date(Date.now() - 1_000) }));
  }
  return new Response(certPem);
};
try {
  assert.equal(await fetchSnsSigningCert(certUrl), certPem);
  assert.equal(await fetchSnsSigningCert(certUrl), certPem);
  assert.equal(fetches, 1, 'certificates must be cached per URL');
  await assert.rejects(fetchSnsSigningCert('https://evil.example/cert.pem'), /Untrusted/);
  assert.equal(fetches, 1, 'untrusted URLs must never be fetched');
  await assert.rejects(fetchSnsSigningCert('https://sns.ap-south-1.amazonaws.com/expired.pem'), /expired/);
  assert.ok(await verifySnsMessage(signed, { topicArn }), 'default loader must verify with the cached certificate');
} finally {
  globalThis.fetch = realFetch;
}

// --- Route wiring ----------------------------------------------------------------
const route = read('app/api/webhooks/ses/route.ts');
const configIndex = route.indexOf('SES_SNS_TOPIC_ARN');
const verifyIndex = route.indexOf('verifySnsMessage(message, { topicArn })');
assert.notEqual(configIndex, -1, 'the webhook must require SES_SNS_TOPIC_ARN');
assert.match(route, /status: 503/, 'an unset topic must return 503');
assert.ok(verifyIndex > configIndex, 'the webhook must verify every message against the topic');
assert.match(route, /status: 403/, 'unverified messages must be rejected with 403');
for (const sink of ['confirmSubscription(message)', 'await dbConnect()', 'applySesEvent(event)']) {
  assert.ok(route.indexOf(sink) > verifyIndex, `${sink} must only run after verification`);
}
assert.match(route, /isSnsUrl\(message\.SubscribeURL\)/, 'SubscribeURL must be host-checked before it is fetched');
assert.match(route, /WebhookEvent\.exists\(\{ provider: 'ses', eventId \}\)/, 'notifications must be idempotent');

const proxy = read('proxy.ts');
assert.doesNotMatch(proxy, /['"]\/api/, 'the auth proxy must not match API routes such as /api/webhooks/ses');

console.log('ses webhook regression checks passed');
