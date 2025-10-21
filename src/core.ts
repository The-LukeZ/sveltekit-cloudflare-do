import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, relative } from 'path';

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
}

const DEFAULT_OPTIONS: Required<Omit<DurableObjectsExporterOptions, 'root'>> = {
  durableObjects: ['src/lib/durable-objects.ts'],
  workerPath: '.svelte-kit/cloudflare/_worker.js',
  marker: '// DURABLE_OBJECTS_EXPORT - do not remove',
  verbose: false,
};

/**
 * Main function to export Durable Objects to the worker file
 */
export function exportDurableObjects(options: DurableObjectsExporterOptions = {}): ExportResult {
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
    console.log(`[sveltekit-cloudflare-do] Durable Objects: ${durableObjectPaths.join(', ')}`);
  }

  // Check if worker file exists
  if (!existsSync(workerPath)) {
    return {
      success: false,
      message: `Worker file not found at ${workerPath}.\n\nMake sure to run the SvelteKit build first:\n  npm run build\n  # or\n  pnpm build\n  # or\n  vite build`,
    };
  }

  // Read the current worker file
  let workerContent = readFileSync(workerPath, 'utf-8');

  // Check if the export already exists (idempotency check)
  if (workerContent.includes(opts.marker)) {
    if (opts.verbose) {
      console.log('✓ Durable object exports already present in worker file');
    }
    return {
      success: true,
      message: 'Durable object exports already present in worker file',
      alreadyExported: true,
    };
  }

  // Validate that all durable object files exist
  const missingFiles: string[] = [];
  for (const doPath of durableObjectPaths) {
    const absolutePath = resolve(opts.root, doPath);
    if (!existsSync(absolutePath)) {
      missingFiles.push(doPath);
    }
  }

  if (missingFiles.length > 0) {
    return {
      success: false,
      message: `Durable Object files not found: ${missingFiles.join(', ')}\n\nMake sure:\n  1. The file paths are correct relative to your project root\n  2. Your Durable Object classes are created in the specified locations\n  3. The class names in your wrangler.jsonc match the exported classes`,
    };
  }

  // Generate export statements
  const workerDir = resolve(workerPath, '..');
  const exportStatements = durableObjectPaths.map(doPath => {
    const absoluteDoPath = resolve(opts.root, doPath);
    // Calculate relative path from worker file to durable object file
    const relativePath = relative(workerDir, absoluteDoPath);
    // Normalize path separators for cross-platform compatibility
    const normalizedPath = relativePath.split('\\').join('/');
    return `export * from '${normalizedPath}';`;
  }).join('\n');

  // Append the export statements with marker
  const exportBlock = `\n${opts.marker}\n${exportStatements}\n`;
  workerContent += exportBlock;

  // Write the updated content back
  writeFileSync(workerPath, workerContent, 'utf-8');

  const message = `✓ Added ${durableObjectPaths.length} Durable Object export(s) to worker file`;
  console.log(message);

  return {
    success: true,
    message,
    filesExported: durableObjectPaths,
    alreadyExported: false,
  };
}
