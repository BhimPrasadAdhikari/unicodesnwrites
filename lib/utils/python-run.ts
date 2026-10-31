/**
 * Small pure helpers for the "Run this code" button on Python code blocks.
 * Kept free of React and browser APIs so they can be checked in plain Node.
 */

/** Fenced-code languages that get a "Run this code" button. */
const PYTHON_LANGUAGES = new Set(['python', 'py', 'python3']);

/**
 * True when a code element's className (e.g. "hljs language-python") marks
 * it as Python. Only the `language-*` class counts, so a block without a
 * language never gets the button.
 */
export function isPythonCodeClass(className: string | undefined | null): boolean {
  if (!className) return false;
  const match = /(?:^|\s)language-([\w-]+)/.exec(className);
  return Boolean(match && PYTHON_LANGUAGES.has(match[1].toLowerCase()));
}

/**
 * Pyodide error messages include its own internal stack frames
 * (`/lib/python312.zip/_pyodide/...`). Readers only care about lines in the
 * code they ran, so keep those frames, the error line itself, and turn
 * `File "<exec>", line 3, in <module>` into a plainer `Line 3`.
 */
export function cleanPythonError(message: string): string {
  const lines = message.replace(/\r\n/g, '\n').replace(/\n+$/, '').split('\n');
  const kept: string[] = [];
  let inFrame = false;
  let keepFrame = false;

  for (const line of lines) {
    if (line.startsWith('Traceback (most recent call last)')) {
      continue;
    }

    const frame = /^ {2}File "([^"]*)", line (\d+)(?:, in (.+))?$/.exec(line);
    if (frame) {
      inFrame = true;
      keepFrame = frame[1] === '<exec>';
      if (keepFrame) {
        const where = frame[3] && frame[3] !== '<module>' ? `, in ${frame[3]}` : '';
        kept.push(`Line ${frame[2]}${where}:`);
      }
      continue;
    }

    // Source lines and caret markers under a frame are indented.
    if (inFrame && line.startsWith('    ')) {
      if (keepFrame) kept.push(line);
      continue;
    }

    inFrame = false;
    kept.push(line);
  }

  const cleaned = kept.join('\n').trim();
  return cleaned || message.trim();
}

