/**
 * Keeps only the fields the request actually sent. In zod 4 a `.default()` still fires inside
 * `.partial()`, so a PATCH that leaves a field out would otherwise reset it to its default
 * (a product's currency to USD, a newsletter's template to "simple").
 */
export function onlySentFields<T extends object>(data: T, body: unknown): Partial<T> {
  const sent = body && typeof body === 'object' ? new Set(Object.keys(body)) : new Set<string>();
  return Object.fromEntries(Object.entries(data).filter(([key]) => sent.has(key))) as Partial<T>;
}
