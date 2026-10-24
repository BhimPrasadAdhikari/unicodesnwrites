const DISALLOWED_CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function cleanSingleLine(value: string) {
  return value
    .replace(DISALLOWED_CONTROL_CHARACTERS, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanMultiline(value: string) {
  return value
    .replace(DISALLOWED_CONTROL_CHARACTERS, '')
    .replace(/\r\n?/g, '\n')
    .trim();
}

export function escapeHtml(value: string) {
  const entities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  return value.replace(/[&<>"']/g, (character) => entities[character]);
}
