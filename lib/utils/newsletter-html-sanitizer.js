const ALLOWED_TAGS = new Set([
  'a',
  'b',
  'blockquote',
  'br',
  'code',
  'div',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'img',
  'li',
  'ol',
  'p',
  'pre',
  's',
  'span',
  'strong',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
]);

const GLOBAL_ATTRIBUTES = new Set(['title']);
const ATTRIBUTES_BY_TAG = {
  a: new Set(['href', 'rel', 'target', 'title']),
  img: new Set(['alt', 'src', 'title']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan']),
};

const URI_ATTRIBUTES = new Set(['href', 'src']);
const SAFE_URI_PATTERN = /^(https?:|mailto:|tel:|\/|#)/i;

const escapeHtml = (value) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const decodeEntitiesForProtocolCheck = (value) =>
  value
    .replace(/&#(\d+);?/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);?/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&colon;/gi, ':')
    .replace(/&tab;/gi, '\t')
    .replace(/&newline;/gi, '\n')
    .replace(/&amp;/gi, '&');

const isSafeUri = (value) => {
  const normalized = decodeEntitiesForProtocolCheck(value).replace(/[\u0000-\u001F\u007F\s]+/g, '');
  return SAFE_URI_PATTERN.test(normalized);
};

const sanitizeAttributes = (tagName, rawAttributes) => {
  const allowedForTag = ATTRIBUTES_BY_TAG[tagName] ?? new Set();
  const attributes = [];
  const attrPattern = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;

  while ((match = attrPattern.exec(rawAttributes)) !== null) {
    const name = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? '';

    if (name.startsWith('on') || name === 'style' || name === 'srcdoc') {
      continue;
    }

    if (!GLOBAL_ATTRIBUTES.has(name) && !allowedForTag.has(name)) {
      continue;
    }

    if (URI_ATTRIBUTES.has(name) && !isSafeUri(value)) {
      continue;
    }

    if ((name === 'colspan' || name === 'rowspan') && !/^[1-9]\d{0,2}$/.test(value)) {
      continue;
    }

    if (tagName === 'a' && name === 'target' && value !== '_blank') {
      continue;
    }

    attributes.push(`${name}="${escapeHtml(value)}"`);
  }

  if (tagName === 'a' && attributes.some((attribute) => attribute === 'target="_blank"')) {
    const hasRel = attributes.some((attribute) => attribute.startsWith('rel='));
    if (!hasRel) {
      attributes.push('rel="noopener noreferrer"');
    }
  }

  return attributes.length > 0 ? ` ${attributes.join(' ')}` : '';
};

function sanitizeNewsletterHtml(input) {
  if (!input) {
    return '';
  }

  return String(input)
    .replace(/<\s*(script|style|iframe|object|embed|svg|math|template)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|svg|math|template)\b[^>]*\/?\s*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]*>/g, (tag) => {
      const closingMatch = tag.match(/^<\s*\/\s*([a-z0-9-]+)\s*>$/i);
      if (closingMatch) {
        const tagName = closingMatch[1].toLowerCase();
        return ALLOWED_TAGS.has(tagName) ? `</${tagName}>` : '';
      }

      const openingMatch = tag.match(/^<\s*([a-z0-9-]+)([\s\S]*?)\/?\s*>$/i);
      if (!openingMatch) {
        return escapeHtml(tag);
      }

      const tagName = openingMatch[1].toLowerCase();
      if (!ALLOWED_TAGS.has(tagName)) {
        return '';
      }

      const attributes = sanitizeAttributes(tagName, openingMatch[2] || '');
      const selfClosing = tag.endsWith('/>') || tagName === 'br' || tagName === 'hr' || tagName === 'img';
      return selfClosing ? `<${tagName}${attributes}>` : `<${tagName}${attributes}>`;
    });
}

module.exports = {
  sanitizeNewsletterHtml,
};
