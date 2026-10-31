/**
 * Browser-side controller for the Python worker behind "Run this code".
 *
 * - Nothing loads until the first run: the worker (and Pyodide inside it) is
 *   created lazily.
 * - One worker is shared by every Python block on the page; runs are queued.
 * - A run that takes longer than RUN_TIMEOUT_MS is stopped by terminating the
 *   worker. The next run starts a fresh one.
 */

const WORKER_URL = '/workers/pyodide-worker.js';

/** How long a reader's code may run before it is stopped. */
export const RUN_TIMEOUT_MS = 10_000;

/** How long getting Python (and any packages) ready may take. */
const PREPARE_TIMEOUT_MS = 120_000;

export type PythonStream = 'stdout' | 'stderr';

export type PythonRunResult =
  | { status: 'ok' }
  | { status: 'error'; message: string }
  | { status: 'timeout' }
  | { status: 'load-failed'; message: string };

export interface PythonRunEvents {
  /** Called when the code itself starts (Python and packages are ready). */
  onStarted?: () => void;
  onOutput: (stream: PythonStream, text: string) => void;
}

type WorkerMessage =
  | { type: 'ready' }
  | { type: 'started'; id: number }
  | { type: 'stdout' | 'stderr'; id: number; text: string }
  | { type: 'done'; id: number }
  | { type: 'error' | 'load-error'; id: number; message: string };

type ActiveRun = {
  id: number;
  events: PythonRunEvents;
  finish: (result: PythonRunResult) => void;
  started: () => void;
};

let worker: Worker | null = null;
let pythonReady = false;
let nextId = 1;
let active: ActiveRun | null = null;
let queue: Promise<unknown> = Promise.resolve();

/** True once Python has loaded in the current worker. */
export function isPythonReady(): boolean {
  return pythonReady;
}

function stopWorker() {
  worker?.terminate();
  worker = null;
  pythonReady = false;
}

function handleMessage(event: MessageEvent<WorkerMessage>) {
  const data = event.data;
  if (data.type === 'ready') {
    pythonReady = true;
    return;
  }
  if (!active || data.id !== active.id) return;

  switch (data.type) {
    case 'started':
      active.started();
      break;
    case 'stdout':
    case 'stderr':
      active.events.onOutput(data.type, data.text);
      break;
    case 'done':
      active.finish({ status: 'ok' });
      break;
    case 'error':
      active.finish({ status: 'error', message: data.message });
      break;
    case 'load-error':
      active.finish({ status: 'load-failed', message: data.message });
      break;
  }
}

function getWorker(): Worker {
  if (!worker) {
    const created = new Worker(WORKER_URL);
    created.onmessage = handleMessage;
    created.onerror = (event) => {
      event.preventDefault();
      // The worker script itself failed (e.g. blocked or missing). Start over next time.
      if (worker === created) stopWorker();
      active?.finish({ status: 'load-failed', message: event.message || 'The Python worker failed to start.' });
    };
    worker = created;
  }
  return worker;
}

function runNow(code: string, events: PythonRunEvents): Promise<PythonRunResult> {
  return new Promise((resolve) => {
    const id = nextId++;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let settled = false;

    const finish = (result: PythonRunResult) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (active?.id === id) active = null;
      resolve(result);
    };

    // Terminating is the only way to stop Python that is stuck in a loop.
    const stopAfter = (ms: number, result: PythonRunResult) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        stopWorker();
        finish(result);
      }, ms);
    };

    active = {
      id,
      events,
      finish,
      started: () => {
        stopAfter(RUN_TIMEOUT_MS, { status: 'timeout' });
        events.onStarted?.();
      },
    };

    try {
      stopAfter(PREPARE_TIMEOUT_MS, {
        status: 'load-failed',
        message: 'Getting Python ready took too long.',
      });
      getWorker().postMessage({ type: 'run', id, code });
    } catch (error) {
      stopWorker();
      finish({ status: 'load-failed', message: error instanceof Error ? error.message : String(error) });
    }
  });
}

/** Run Python code in the shared worker. Runs are queued, one at a time. */
export function runPython(code: string, events: PythonRunEvents): Promise<PythonRunResult> {
  const job = queue.then(() => runNow(code, events));
  queue = job.catch(() => undefined);
  return job;
}
