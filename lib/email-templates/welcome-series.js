// Plain HTML + text for the welcome-series follow-ups. Kept as a dependency-free
// CommonJS module (like the newsletter sanitizer) so the XSS regression script can
// render it directly. Every dynamic value is escaped; links must be http(s).

const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[character] || character));

/** The URL when it is an absolute http(s) link, otherwise null. */
function safeUrl(value) {
  try {
    const url = new URL(String(value ?? ''));
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

const paragraphs = (text) => String(text ?? '')
  .split(/\r?\n\s*\r?\n/)
  .map((part) => part.trim())
  .filter(Boolean);

const styles = {
  main: 'margin:0;padding:24px 0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,Roboto,&quot;Helvetica Neue&quot;,Ubuntu,sans-serif;',
  container: 'max-width:600px;margin:0 auto;background:#ffffff;padding:20px 0 40px;',
  header: 'padding:24px;text-align:center;border-bottom:1px solid #e5e7eb;font-size:24px;font-weight:bold;color:#8b5cf6;',
  content: 'padding:24px;color:#374151;font-size:16px;line-height:1.6;',
  heading: 'font-size:20px;font-weight:bold;color:#1f2937;margin:24px 0 12px;',
  item: 'margin:0 0 16px;',
  itemLink: 'color:#8b5cf6;font-weight:600;text-decoration:underline;',
  itemText: 'display:block;color:#4b5563;font-size:15px;',
  footer: 'border-top:1px solid #e5e7eb;margin-top:12px;padding:16px 20px 0;text-align:center;font-size:12px;color:#9ca3af;',
  footerLink: 'color:#8b5cf6;text-decoration:underline;',
};

/**
 * @typedef {{ title: string; url: string; description?: string }} WelcomeSeriesLink
 * @typedef {{
 *   subject: string;
 *   intro: string;
 *   sections: Array<{ heading: string; links: WelcomeSeriesLink[] }>;
 *   unsubscribeUrl: string;
 *   postalAddress?: string;
 * }} WelcomeSeriesEmailInput
 */

/**
 * @param {WelcomeSeriesEmailInput} input
 * @returns {{ html: string; text: string }}
 */
function renderWelcomeSeriesEmail(input) {
  const year = new Date().getFullYear();
  const unsubscribeUrl = safeUrl(input.unsubscribeUrl);
  const sections = (input.sections || [])
    .map((section) => ({
      heading: String(section.heading ?? ''),
      links: (section.links || [])
        .map((link) => ({ ...link, url: safeUrl(link.url) }))
        .filter((link) => link.url && link.title),
    }))
    .filter((section) => section.links.length);

  const htmlSections = sections.map((section) => [
    `<h2 style="${styles.heading}">${escapeHtml(section.heading)}</h2>`,
    ...section.links.map((link) => `<p style="${styles.item}"><a href="${escapeHtml(link.url)}" style="${styles.itemLink}">${escapeHtml(link.title)}</a>${
      link.description ? `<span style="${styles.itemText}">${escapeHtml(link.description)}</span>` : ''
    }</p>`),
  ].join('')).join('');

  const html = [
    '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(input.subject)}</title></head>`,
    `<body style="${styles.main}"><div style="${styles.container}">`,
    `<div style="${styles.header}">unicodesnwrites</div>`,
    `<div style="${styles.content}">`,
    paragraphs(input.intro).map((part) => `<p>${escapeHtml(part)}</p>`).join(''),
    htmlSections,
    '</div>',
    `<div style="${styles.footer}">`,
    `<p>&copy; ${year} unicodesnwrites.</p>`,
    input.postalAddress ? `<p>${escapeHtml(input.postalAddress)}</p>` : '',
    '<p>You are receiving this email because you subscribed to our newsletter.</p>',
    unsubscribeUrl ? `<p><a href="${escapeHtml(unsubscribeUrl)}" style="${styles.footerLink}">Unsubscribe</a></p>` : '',
    '</div></div></body></html>',
  ].join('');

  const text = [
    ...paragraphs(input.intro),
    ...sections.map((section) => [
      section.heading,
      ...section.links.map((link) => `- ${link.title}: ${link.url}${link.description ? `\n  ${link.description}` : ''}`),
    ].join('\n')),
    '--',
    `(c) ${year} unicodesnwrites.`,
    input.postalAddress || '',
    'You are receiving this email because you subscribed to our newsletter.',
    unsubscribeUrl ? `Unsubscribe: ${unsubscribeUrl}` : '',
  ].filter(Boolean).join('\n\n');

  return { html, text };
}

module.exports = {
  renderWelcomeSeriesEmail,
};
