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

/**
 * Libraries that can't run in a browser (GPU frameworks, network clients, web
 * servers). Examples that import them don't get a Run button at all, rather
 * than a button that can only fail.
 */
const BROWSER_UNAVAILABLE = [
  'torch', 'tensorflow', 'jax', 'keras', 'transformers', 'datasets', 'accelerate',
  'openai', 'anthropic', 'groq', 'google', 'langchain', 'llama_index', 'requests', 'httpx', 'aiohttp',
  'fastapi', 'flask', 'django', 'uvicorn', 'mcp', 'dotenv', 'boto3', 'pinecone', 'chromadb',
];

/** The top-level modules a Python snippet imports. */
export function importedModules(code: string): string[] {
  const modules = new Set<string>();
  for (const match of code.matchAll(/^[ \t]*(?:from[ \t]+([\w.]+)[ \t]+import\b.*|import[ \t]+([\w., \t]+?))[ \t]*(?:#.*)?$/gm)) {
    const names = match[1] ? [match[1]] : match[2].split(',').map((part) => part.trim().split(/\s+as\s+/)[0]);
    for (const name of names) if (name) modules.add(name.split('.')[0]);
  }
  return [...modules];
}

/** False when the snippet needs a library a browser can't provide. */
export function canRunInBrowser(code: string): boolean {
  return !importedModules(code).some((name) => BROWSER_UNAVAILABLE.includes(name));
}

/** "No module named 'x'" in plain words; other errors pass through unchanged. */
export function friendlyPythonError(message: string): string {
  const missing = /No module named '([\w.]+)'/.exec(message);
  if (!missing) return message;
  return `This example needs the "${missing[1].split('.')[0]}" library, which can't run in your browser. Try it on your own computer instead.`;
}
