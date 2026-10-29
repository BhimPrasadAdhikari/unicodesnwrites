import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import newsletterHtmlSanitizer from '../../lib/utils/newsletter-html-sanitizer.js';

import welcomeSeriesTemplate from '../../lib/email-templates/welcome-series.js';

const { sanitizeNewsletterHtml } = newsletterHtmlSanitizer;
const { renderWelcomeSeriesEmail } = welcomeSeriesTemplate;

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');

const payload = [
  '<p onclick="alert(1)">Hello <strong>reader</strong></p>',
  '<script>alert(1)</script>',
  '<img src="javascript:alert(1)" onerror="alert(2)" alt="x">',
  '<a href="java&#x73;cript:alert(3)" target="_blank">bad</a>',
  '<a href="https://example.com" target="_blank">good</a>',
].join('');

const sanitized = sanitizeNewsletterHtml(payload);

assert.doesNotMatch(sanitized, /<script/i, 'script tags must be removed');
assert.doesNotMatch(sanitized, /onclick|onerror/i, 'event handler attributes must be removed');
assert.doesNotMatch(sanitized, /javascript:/i, 'javascript URLs must be removed');
assert.match(sanitized, /<strong>reader<\/strong>/, 'legitimate formatting must survive');
assert.match(
  sanitized,
  /<a href="https:\/\/example\.com" target="_blank" rel="noopener noreferrer">good<\/a>/,
  'safe links should survive with noopener protection'
);

const createRoute = read('app/api/newsletters/route.ts');
const updateRoute = read('app/api/newsletters/[id]/route.ts');
const publicPage = read('app/(public)/newsletter/[id]/page.tsx');

assert.match(createRoute, /content:\s*sanitizeNewsletterHtml\(result\.data\.content\)/, 'newsletter create must sanitize content before storage');
assert.match(updateRoute, /updateData\.content\s*=\s*sanitizeNewsletterHtml\(result\.data\.content\)/, 'newsletter update must sanitize content before storage');
assert.match(publicPage, /SandboxedHtml\s+html=\{sanitizeNewsletterHtml\(newsletter\.content\)\}/s, 'public newsletter render must sanitize content before passing it into the sandboxed renderer');

// Welcome-series emails mix admin copy with post/course titles: everything must be escaped
// and only http(s) links may survive.
const welcome = renderWelcomeSeriesEmail({
  subject: '<script>alert(1)</script>',
  intro: 'Hi <img src=x onerror=alert(1)>\n\nSecond "paragraph"',
  sections: [{
    heading: '<b>Start</b>',
    links: [
      { title: '<script>alert(2)</script>', url: 'https://example.com/blog/a?x="><script>', description: '<svg onload=alert(3)>' },
      { title: 'bad link', url: 'javascript:alert(4)' },
    ],
  }],
  unsubscribeUrl: 'https://example.com/newsletter/unsubscribe?email=a%40b.c&token=t',
  postalAddress: 'Somewhere <script>',
});
assert.doesNotMatch(welcome.html, /<script|<img|<svg|<b>/i, 'welcome series email must escape dynamic text');
assert.doesNotMatch(welcome.html, /javascript:/i, 'welcome series email must drop non-http links');
assert.doesNotMatch(welcome.html, /bad link/, 'links with unsafe URLs must be dropped entirely');
assert.match(welcome.html, /&lt;script&gt;alert\(2\)&lt;\/script&gt;/, 'escaped titles must still be shown');
assert.match(welcome.html, /href="https:\/\/example\.com\/newsletter\/unsubscribe\?email=a%40b\.c&amp;token=t"/, 'welcome series email must carry the unsubscribe link');
assert.match(welcome.html, /Somewhere &lt;script&gt;/, 'welcome series email must carry the postal address footer');
assert.match(welcome.text, /Unsubscribe: https:\/\/example\.com\/newsletter\/unsubscribe/, 'welcome series text version must carry the unsubscribe link');

const emailService = read('lib/services/email.tsx');
assert.match(emailService, /renderWelcomeSeriesEmail\(/, 'welcome series sends must use the escaping renderer');

console.log('newsletter XSS regression checks passed');
