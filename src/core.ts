import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, relative } from "path";

export interface DurableObjectsExporterOptions {
  /**
   * Path(s) to your Durable Object file(s)
   * @default ['src/lib/durable-objects.ts']
   */
  durableObjects?: string | string[];

  /**
   * Path to the worker file (relative to project root)
   * @default '.svelte-kit/cloudflare/_worker.js'
   */
  workerPath?: string;

  /**
   * Custom marker comment (advanced usage)
   * @default '// DURABLE_OBJECTS_EXPORT - do not remove'
   */
  marker?: string;

  /**
   * Project root directory
   * @default process.cwd()
   */
  root?: string;

  /**
   * Enable verbose logging
   * @default false
   */
  verbose?: boolean;
}

export interface ExportResult {
  success: boolean;
  message: string;
  filesExported?: string[];
  alreadyExported?: boolean;
  /**
   * True when the worker file was not found on disk.
   * The Vite plugin uses this to silently skip during build passes
   * where the SvelteKit adapter has not yet written the file
   * (e.g. the client-environment pass in Vite v7+).
   */
  workerNotFound?: boolean;
}

const DEFAULT_OPTIONS: Required<Omit<DurableObjectsExporterOptions, "root">> = {
  durableObjects: ["src/lib/durable-objects.ts"],
  workerPath: ".svelte-kit/cloudflare/_worker.js",
  marker: "// DURABLE_OBJECTS_EXPORT - do not remove",
  verbose: false,
};

/**
 * Extracts exported names from a TypeScript/JavaScript source file by scanning
 * for `export class Foo`, `export abstract class Foo`, and `export { Foo, Bar as Baz }`.
 *
 * Named exports are preferred over `export * from` because wrangler does not
 * follow wildcard re-exports when resolving the DurableObjectNamespace<T> type
 * parameter. Without this, wrangler falls back to the unparameterised form:
 *
 *   // wildcard (broken):  DOSTORE: DurableObjectNamespace /* DurableObjectStore *\/;
 *   // named   (correct):  DOSTORE: DurableObjectNamespace<DurableObjectStore>;
 */
export function extractExportedNames(filePath: string): string[] {
  const content = readFileSync(filePath, "utf-8");
  const names = new Set<string>();

  // export class Foo / export abstract class Foo
  for (const match of content.matchAll(
    /export\s+(?:abstract\s+)?class\s+(\w+)/g,
  )) {
    names.add(match[1]);
  }

  // export { Foo, Bar as Baz } — capture the public (aliased) name
  for (const match of content.matchAll(/export\s*\{([^}]+)\}/g)) {
    for (const part of match[1].split(",")) {
      const alias = part
        .trim()
        .split(/\s+as\s+/)
        .pop()
        ?.trim();
      if (alias && /^\w+$/.test(alias)) {
        names.add(alias);
      }
    }
  }

  return [...names];
}

/**
 * Main function to export Durable Objects to the worker file
 */
export function exportDurableObjects(
  options: DurableObjectsExporterOptions = {},
): ExportResult {
  const opts = {
    ...DEFAULT_OPTIONS,
    ...options,
    root: options.root || process.cwd(),
  };

  const durableObjectPaths = Array.isArray(opts.durableObjects)
    ? opts.durableObjects
    : [opts.durableObjects];

  const workerPath = resolve(opts.root, opts.workerPath);

  if (opts.verbose) {
    console.log(`[sveltekit-cloudflare-do] Worker path: ${workerPath}`);
    console.log(
      `[sveltekit-cloudflare-do] Durable Objects: ${durableObjectPaths.join(", ")}`,
    );
  }

  if (!existsSync(workerPath)) {
    return {
      success: false,
      workerNotFound: true,
      message: `Worker file not found at ${workerPath}.\n\nMake sure to run the SvelteKit build first:\n  npm run build\n  # or\n  pnpm build\n  # or\n  vite build`,
    };
  }

  let workerContent = readFileSync(workerPath, "utf-8");

  if (workerContent.includes(opts.marker)) {
    if (opts.verbose) {
      console.log("✓ Durable object exports already present in worker file");
    }
    return {
      success: true,
      message: "Durable object exports already present in worker file",
      alreadyExported: true,
    };
  }

  const missingFiles: string[] = [];
  for (const doPath of durableObjectPaths) {
    if (!existsSync(resolve(opts.root, doPath))) {
      missingFiles.push(doPath);
    }
  }

  if (missingFiles.length > 0) {
    return {
      success: false,
      message: `Durable Object files not found: ${missingFiles.join(", ")}\n\nMake sure:\n  1. The file paths are correct relative to your project root\n  2. Your Durable Object classes are created in the specified locations\n  3. The class names in your wrangler.jsonc match the exported classes`,
    };
  }

  const workerDir = resolve(workerPath, "..");

  const exportStatements = durableObjectPaths
    .map((doPath) => {
      const absoluteDoPath = resolve(opts.root, doPath);
      const relativePath = relative(workerDir, absoluteDoPath)
        .split("\\")
        .join("/");

      // Use named exports so wrangler can resolve DurableObjectNamespace<T>.
      // Fall back to wildcard only if no names could be parsed.
      const names = extractExportedNames(absoluteDoPath);

      if (opts.verbose) {
        console.log(
          `[sveltekit-cloudflare-do] Exports found in ${doPath}: ${names.join(", ") || "(none — using wildcard fallback)"}`,
        );
      }

      return names.length > 0
        ? `export { ${names.join(", ")} } from '${relativePath}';`
        : `export * from '${relativePath}';`;
    })
    .join("\n");

  const exportBlock = `\n${opts.marker}\n${exportStatements}\n`;
  workerContent += exportBlock;

  writeFileSync(workerPath, workerContent, "utf-8");

  const message = `✓ Added ${durableObjectPaths.length} Durable Object export(s) to worker file`;
  console.log(message);

  return {
    success: true,
    message,
    filesExported: durableObjectPaths,
    alreadyExported: false,
  };
}
