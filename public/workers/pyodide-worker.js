/*
 * Python runner for the "Run this code" button on blog code blocks.
 *
 * Runs in its own Web Worker so a slow or endless loop never freezes the page;
 * the page terminates this worker if a run takes too long. Pyodide (Python
 * compiled to WebAssembly) is loaded from jsDelivr at a pinned version on the
 * first run only. Nothing here talks to our servers.
 *
 * This file is served with its own Content-Security-Policy (see the
 * /workers/pyodide-worker.js entry in next.config.ts), which only allows
 * scripts and fetches from the pinned Pyodide folder on jsDelivr.
 *
 * Messages in:  { type: 'run', id, code }
 * Messages out: { type: 'ready' }
 *               { type: 'load-error', id, message }
 *               { type: 'started', id }            (packages loaded, code starting)
 *               { type: 'stdout' | 'stderr', id, text }
 *               { type: 'done', id }
 *               { type: 'error', id, message }      (Python raised an error)
 */
'use strict';

// Pinned exactly. Must match the CSP paths in next.config.ts.
var PYODIDE_VERSION = '0.26.4';
var PYODIDE_BASE = 'https://cdn.jsdelivr.net/pyodide/v' + PYODIDE_VERSION + '/full/';

// Stop forwarding output after this many characters so a print loop can't
// flood the page.
var MAX_OUTPUT_CHARS = 100000;

var pyodidePromise = null;
var matplotlibPatched = false;
var current = null; // { id, chars, capped }
var queue = Promise.resolve();

function emit(stream, text) {
  if (!current || current.capped) return;
  var remaining = MAX_OUTPUT_CHARS - current.chars;
  if (text.length > remaining) {
    text = text.slice(0, remaining);
    current.capped = true;
  }
  current.chars += text.length;
  if (text) self.postMessage({ type: stream, id: current.id, text: text });
  if (current.capped) {
    self.postMessage({
      type: 'stderr',
      id: current.id,
      text: '\n(There was too much output, so the rest was cut off.)\n',
    });
  }
}

function loadPython() {
  if (!pyodidePromise) {
    pyodidePromise = (async function () {
      self.importScripts(PYODIDE_BASE + 'pyodide.js');
      var pyodide = await self.loadPyodide({ indexURL: PYODIDE_BASE });

      pyodide.setStdout({ batched: function (line) { emit('stdout', line + '\n'); } });
      pyodide.setStderr({ batched: function (line) { emit('stderr', line + '\n'); } });
      // No keyboard here: reading stdin gets end-of-file straight away.
      pyodide.setStdin({ stdin: function () { return null; } });

      // input() can't wait for typing in a worker, so give it an empty answer
      // and say why, instead of failing with a confusing error.
      pyodide.runPython([
        'import builtins, sys',
        'def _blog_input(prompt=""):',
        '    print(str(prompt))',
        '    print("(Typing answers isn\'t supported on this page, so input() got an empty answer.)", file=sys.stderr)',
        '    return ""',
        'builtins.input = _blog_input',
        'del _blog_input',
      ].join('\n'));

      self.postMessage({ type: 'ready' });
      return pyodide;
    })();
    // Let a later click try again if loading failed (e.g. offline).
    pyodidePromise.catch(function () { pyodidePromise = null; });
  }
  return pyodidePromise;
}

// Charts need a page to draw on, which a worker doesn't have. Use the
// non-drawing backend and make plt.show() print a friendly note instead.
function patchMatplotlib(pyodide) {
  if (matplotlibPatched) return;
  pyodide.runPython([
    'import os',
    'os.environ["MPLBACKEND"] = "Agg"',
    'import matplotlib',
    'matplotlib.use("Agg")',
    'import matplotlib.pyplot as _plt',
    'def _blog_show(*args, **kwargs):',
    '    print("(Charts can\'t be shown on this page yet, so this chart was skipped.)")',
    '_plt.show = _blog_show',
    'del _plt, _blog_show',
  ].join('\n'));
  matplotlibPatched = true;
}

function messageOf(error) {
  if (error && typeof error.message === 'string') return error.message;
  return String(error);
}

async function run(id, code) {
  var pyodide;
  try {
    pyodide = await loadPython();
  } catch (error) {
    self.postMessage({ type: 'load-error', id: id, message: messageOf(error) });
    return;
  }

  current = { id: id, chars: 0, capped: false };
  var namespace = null;
  try {
    // Fetches numpy, pandas, etc. on demand when the code imports them.
    await pyodide.loadPackagesFromImports(code);
    if (/\bmatplotlib\b/.test(code)) patchMatplotlib(pyodide);

    self.postMessage({ type: 'started', id: id });
    // Each block runs in a fresh namespace, so blocks don't affect each other.
    namespace = pyodide.globals.get('dict')();
    await pyodide.runPythonAsync(code, { globals: namespace });
    flush(pyodide);
    self.postMessage({ type: 'done', id: id });
  } catch (error) {
    flush(pyodide);
    self.postMessage({ type: 'error', id: id, message: messageOf(error) });
  } finally {
    if (namespace) namespace.destroy();
    current = null;
  }
}

// Push out any half-finished line (e.g. print("x", end="")).
function flush(pyodide) {
  try {
    pyodide.runPython('import sys\nsys.stdout.flush()\nsys.stderr.flush()');
  } catch (_) {
    // Nothing useful to report.
  }
}

self.onmessage = function (event) {
  var data = event.data || {};
  if (data.type !== 'run' || typeof data.code !== 'string') return;
  // One run at a time, in the order they were asked for.
  queue = queue.then(function () { return run(data.id, data.code); });
};
