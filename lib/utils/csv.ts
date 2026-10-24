import { Parser } from '@json2csv/plainjs';

/**
 * Converts an array of objects to a CSV string
 */
export function toCSV<T extends object>(data: T[], fields?: string[]): string {
  try {
    const opts = fields ? { fields } : {};
    const parser = new Parser(opts);
    return parser.parse(data);
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
      const obj: Record<string, string> = {};
      for (let j = 0; j < headers.length; j++) {
        obj[headers[j]] = currentLine[j].trim().replace(/^"|"$/g, '');
      }
      result.push(obj);
    }
  }

  return result;
}
