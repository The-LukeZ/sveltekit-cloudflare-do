#!/usr/bin/env node

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import {
  exportDurableObjects,
  type DurableObjectsExporterOptions,
} from "./core.js";

const HELP_TEXT = `
sveltekit-cloudflare-do - Export Durable Objects to Cloudflare Workers

Usage:
  sveltekit-cloudflare-do [options]

Options:
  --help, -h              Show this help message
  --version, -v           Show version
  --verbose               Enable verbose logging
  --worker <path>         Path to worker file (default: .svelte-kit/cloudflare/_worker.js)
  --do <path>             Path to durable object file (can be used multiple times)
  --config <path>         Path to config file (default: package.json or .do-exporter.json)

Examples:
  sveltekit-cloudflare-do
  sveltekit-cloudflare-do --do src/lib/durable-objects.ts
  sveltekit-cloudflare-do --do src/lib/do1.ts --do src/lib/do2.ts
  sveltekit-cloudflare-do --verbose

Configuration:
  You can configure options in package.json:
  {
    "sveltekit-cloudflare-do": {
      "durableObjects": ["src/lib/durable-objects.ts"],
      "workerPath": ".svelte-kit/cloudflare/_worker.js"
    }
  }

  Or in .do-exporter.json:
  {
    "durableObjects": ["src/lib/durable-objects.ts"],
    "workerPath": ".svelte-kit/cloudflare/_worker.js"
  }
`;

interface CliOptions extends DurableObjectsExporterOptions {
  help?: boolean;
  version?: boolean;
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    durableObjects: [],
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "--help":
      case "-h":
        options.help = true;
        break;

      case "--version":
      case "-v":
        options.version = true;
        break;

      case "--verbose":
        options.verbose = true;
        break;

      case "--worker":
        options.workerPath = args[++i];
        break;

      case "--do":
        if (Array.isArray(options.durableObjects)) {
          options.durableObjects.push(args[++i]);
        } else {
          options.durableObjects = [args[++i]];
        }
        break;

      case "--config":
        // Config file path (handled separately)
        i++; // Skip the next arg
        break;

      default:
        if (arg.startsWith("-")) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
    }
  }

  return options;
}

function loadConfig(): Partial<DurableObjectsExporterOptions> {
  const root = process.cwd();

  // Try .do-exporter.json first
  const doExporterConfigPath = resolve(root, ".do-exporter.json");
  if (existsSync(doExporterConfigPath)) {
    try {
      const content = readFileSync(doExporterConfigPath, "utf-8");
      return JSON.parse(content);
    } catch (error) {
      console.warn(`Warning: Could not parse .do-exporter.json`);
    }
  }

  // Try package.json
  const packageJsonPath = resolve(root, "package.json");
  if (existsSync(packageJsonPath)) {
    try {
      const content = readFileSync(packageJsonPath, "utf-8");
      const packageJson = JSON.parse(content);
      if (packageJson["sveltekit-cloudflare-do"]) {
        return packageJson["sveltekit-cloudflare-do"];
      }
    } catch (error) {
      console.warn(`Warning: Could not parse package.json`);
    }
  }

  return {};
}

function getVersion(): string {
  const packageJsonPath = new URL("../package.json", import.meta.url);
  try {
    const content = readFileSync(packageJsonPath, "utf-8");
    const packageJson = JSON.parse(content);
    return packageJson.version || "unknown";
  } catch {
    return "unknown";
  }
}

function main() {
  const cliOptions = parseArgs(process.argv.slice(2));

  if (cliOptions.help) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  if (cliOptions.version) {
    console.log(`sveltekit-cloudflare-durable-objects v${getVersion()}`);
    process.exit(0);
  }

  // Load config from file
  const fileConfig = loadConfig();

  // Merge configs: CLI args > file config > defaults
  const mergedOptions: DurableObjectsExporterOptions = {
    ...fileConfig,
    ...cliOptions,
  };

  // If no durable objects specified, use default or config
  if (
    Array.isArray(mergedOptions.durableObjects) &&
    mergedOptions.durableObjects.length === 0
  ) {
    delete mergedOptions.durableObjects; // Let core.ts use its default
  }

  // Run the export
  const result = exportDurableObjects(mergedOptions);

  if (!result.success) {
    console.error(`Error: ${result.message}`);
    process.exit(1);
  }

  process.exit(0);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main };
