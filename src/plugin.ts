import type { Plugin } from "vite";
import {
  exportDurableObjects,
  type DurableObjectsExporterOptions,
} from "./core.js";

/**
 * Vite plugin to automatically export Durable Objects to the Cloudflare Worker bundle
 *
 * @example
 * ```typescript
 * // vite.config.ts
 * import { sveltekit } from '@sveltejs/kit/vite';
 * import cloudflareDoExporter from 'sveltekit-cloudflare-durable-objects';
 *
 * export default defineConfig({
 *   plugins: [
 *     sveltekit(),
 *     cloudflareDoExporter({
 *       durableObjects: ['src/lib/durable-objects.ts']
 *     })
 *   ]
 * });
 * ```
 */
export default function cloudflareDoExporter(
  options: DurableObjectsExporterOptions = {},
): Plugin {
  let root: string;

  return {
    name: "sveltekit-cloudflare-durable-objects",

    // 'post' ensures this plugin's hooks run after all other plugins,
    // including the SvelteKit plugin that runs the Cloudflare adapter.
    enforce: "post",

    // Only run during builds — no-op during `vite dev`.
    apply: "build",

    configResolved(config) {
      root = config.root;
    },

    closeBundle() {
      const result = exportDurableObjects({
        ...options,
        root,
      });

      // In Vite v7+, closeBundle fires once per environment (client, SSR, …).
      // The SvelteKit adapter writes _worker.js during the SSR environment's
      // closeBundle. During the client environment pass the file doesn't exist
      // yet — that is expected, so we skip silently and let the SSR pass handle it.
      if (result.workerNotFound) {
        return;
      }

      if (!result.success && !result.alreadyExported) {
        throw new Error(`[sveltekit-cloudflare-do] ${result.message}`);
      }
    },
  };
}

// Named export for those who prefer it
export { cloudflareDoExporter };

// Re-export types for convenience
export type { DurableObjectsExporterOptions, ExportResult } from "./core.js";
