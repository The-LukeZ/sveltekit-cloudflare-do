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

    configResolved(config) {
      // Store the resolved project root
      root = config.root;
    },

    closeBundle() {
      // Run after the bundle is written
      const result = exportDurableObjects({
        ...options,
        root,
      });

      // Exit with error if the export failed
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
