export const isObjectId = (value: string | null | undefined): value is string =>
  typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
