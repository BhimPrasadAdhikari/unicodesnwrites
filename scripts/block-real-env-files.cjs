/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const protectedEnvName = /^\.env(?:\.|$)/i;

function toPath(value) {
  if (value instanceof URL) return value.protocol === 'file:' ? value.pathname : '';
  if (Buffer.isBuffer(value)) return value.toString();
  return typeof value === 'string' ? value : '';
}

function isProtectedEnvPath(value) {
  const candidate = toPath(value);
  if (!candidate) return false;

  const resolved = path.resolve(candidate);
  const relative = path.relative(repoRoot, resolved);
  const isInsideRepo = relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));

  const fileName = path.basename(resolved);
  return isInsideRepo && fileName.toLowerCase() !== '.env.sandbox.example' && protectedEnvName.test(fileName);
}

function missingEnvError(value) {
  const error = new Error(`ENOENT: protected environment file is unavailable to the sandbox runtime, '${toPath(value)}'`);
  error.code = 'ENOENT';
  error.errno = -4058;
  error.syscall = 'open';
  error.path = toPath(value);
  return error;
}

for (const methodName of ['statSync', 'lstatSync', 'readFileSync', 'openSync']) {
  const original = fs[methodName].bind(fs);
  fs[methodName] = function guardedSync(value, ...args) {
    if (isProtectedEnvPath(value)) throw missingEnvError(value);
    return original(value, ...args);
  };
}

for (const methodName of ['stat', 'lstat', 'readFile', 'open']) {
  const original = fs.promises[methodName].bind(fs.promises);
  fs.promises[methodName] = async function guardedPromise(value, ...args) {
    if (isProtectedEnvPath(value)) throw missingEnvError(value);
    return original(value, ...args);
  };
}
