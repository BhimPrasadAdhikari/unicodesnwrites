import { Parser } from '@json2csv/plainjs';

/**
 * Converts an array of objects to a CSV string
 */
// Spreadsheet apps run cells starting with these as formulas (CSV injection).
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

function neutralize(value: unknown): unknown {
  return typeof value === 'string' && FORMULA_PREFIX.test(value) ? `'${value}` : value;
}

export function toCSV<T extends object>(data: T[], fields?: string[]): string {
  // json2csv refuses an empty list unless it knows the columns; an empty export is just a header (or nothing).
  if (data.length === 0) return fields ? `${fields.map((field) => `"${field}"`).join(',')}\n` : '';
  try {
    const opts = fields ? { fields } : {};
    const parser = new Parser(opts);
    const safe = data.map((row) =>
      Object.fromEntries(Object.entries(row).map(([key, value]) => [key, neutralize(value)]))
    );
    return parser.parse(safe);
  } catch (err) {
    console.error('Error converting to CSV:', err);
    throw new Error('Failed to generate CSV');
  }
}

/**
 * Simple CSV parser for import
 * Note: For production use with large files, use a library like 'papaparse' on the client
 * or 'csv-parse' on the server. This is a simple implementation for string input.
 */
export function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const result = [];

  for (let i = 1; i < lines.length; i++) {
    const currentLine = lines[i].split(',');
    
    // Simple handling for quoted commas would require a more robust regex or library
    // This assumes simple CSV without commas in values for now
    
    if (currentLine.length === headers.length) {
      const obj: Record<string, string> = Object.create(null);
      for (let j = 0; j < headers.length; j++) {
        if (headers[j] === '__proto__' || headers[j] === 'constructor' || headers[j] === 'prototype') continue;
        obj[headers[j]] = currentLine[j].trim().replace(/^"|"$/g, '');
      }
      result.push(obj);
    }
  }

  return result;
}
