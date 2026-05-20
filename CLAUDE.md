# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

npm package (`sveltekit-cloudflare-durable-objects`) that solves a specific problem: SvelteKit's Cloudflare adapter generates `_worker.js` at build time, but Durable Object classes must be exported from that entry point. This package patches the generated worker file post-build.

Two delivery mechanisms share one core:

- **Vite plugin** (`src/plugin.ts`) — hooks into `closeBundle`, runs after SvelteKit build
- **CLI tool** (`src/cli.ts`) — standalone binary for manual/script use
- **Core logic** (`src/core.ts`) — `exportDurableObjects()` does the actual work for both

## Commands

```bash
pnpm build          # compile with tsdown → dist/ (ESM + .d.ts)
pnpm prepublishOnly # runs build before npm publish
```

No test suite currently. Build is the main check.

## Build System

Uses `tsdown` (not tsc, not vite). Config in `tsdown.config.ts`:

- Two entry points: `src/plugin.ts` and `src/cli.ts`
- Output: ESM only, Node platform, with declaration files
- `dist/` is cleaned on each build

The `bin/cli.js` wrapper (in `bin/`) points to `dist/cli.js`. Both `dist/` and `bin/` are published.

## Core Logic: How the Patch Works

`exportDurableObjects()` in `src/core.ts`:

1. Resolves worker file path (default: `.svelte-kit/cloudflare/_worker.js`)
2. Checks for idempotency marker `// DURABLE_OBJECTS_EXPORT - do not remove` — skips if present
3. Parses DO source files with `extractExportedNames()` to get named exports
4. Appends named exports (e.g. `export { MyDO } from '../../src/lib/durable-objects.ts'`) to worker file
5. Falls back to `export *` only if no names found

**Why named exports instead of `export *`**: Wrangler can't resolve `DurableObjectNamespace<T>` through wildcard re-exports — it falls back to unparameterised form, losing type info.

## Config Resolution (CLI)

Priority: CLI args > `.do-exporter.json` > `package.json["sveltekit-cloudflare-do"]` > defaults

Default DO path: `src/lib/durable-objects.ts`  
Default worker path: `.svelte-kit/cloudflare/_worker.js`

## Package Exports

```
"."     → dist/plugin.js  (Vite plugin, default export)
"./cli" → dist/cli.js     (CLI internals, named export)
```
