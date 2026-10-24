import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import newsletterHtmlSanitizer from '../../lib/utils/newsletter-html-sanitizer.js';

const { sanitizeNewsletterHtml } = newsletterHtmlSanitizer;

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

console.log('newsletter XSS regression checks passed');
