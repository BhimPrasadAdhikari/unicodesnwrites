# Agent Instructions

These instructions apply to the entire repository.

## Runtime And Secret Boundaries

- Treat `.env`, `.env.local`, `.env.production`, and any other real `.env*` file as protected secrets.
- Do not read, print, diff, patch, copy, rename, delete, grep, cat, or summarize real `.env*` files.
- Use `.env.sandbox` as the only runtime env file for agent-run commands.
- `.env.sandbox` must contain sandbox, local, or test credentials only.
- Do not copy values from real env files into `.env.sandbox`.
- `.env.sandbox.example` is the only env template that may be read or edited.

## Command Execution

Run development, lint, test, and build commands through the sandbox env wrapper:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/with-sandbox-env.ps1 npm run lint
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/with-sandbox-env.ps1 npm run build
```

Prefer the npm shortcuts when available:

```powershell
npm run lint:sandbox
npm run build:sandbox
npm run dev:sandbox
```

Do not run production-oriented commands from agent sessions, including:

- `npm run seed:prod`
- `tsx scripts/seed-production.ts`
- `tsx scripts/migrate-to-blob.ts`
- `next start`

If a task appears to require production data, production credentials, or a production service, stop and ask the user for a sandbox-safe alternative.

## Codex Sandbox Configuration

This repo uses project-local Codex guardrails in `.codex/config.toml`:

- `sandbox_mode = "workspace-write"`
- `approval_policy = "on-request"`
- sandbox network access disabled by default
- shell environment policy excludes secret-like variables
- a PreToolUse hook blocks accidental real env-file references

After changing `.codex/config.toml` or `.codex/hooks/protect-env-files.ps1`, remind the user to restart Codex and review/trust the updated hook with `/hooks`.

## Codex Security Agent Guidance

When running security review or analysis:

- Assume configured secrets are represented by environment variable names only, not by real values.
- Use `.env.sandbox.example` to understand expected variable names and integrations.
- Do not inspect real env files to validate findings.
- Do not require production credentials to reproduce a finding.
- Prefer static analysis, local unit tests, mocked services, and sandbox credentials.
- Treat any code path that depends on production credentials or live provider side effects as out of bounds unless the user explicitly supplies a sandbox-safe reproduction.
- If a vulnerability depends on secret contents, report the assumption and the variable name, not the secret value.

## Related Documentation

See `RUNTIME_SANDBOX.md` for the setup and usage guide.
