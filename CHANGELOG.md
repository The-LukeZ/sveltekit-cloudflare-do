# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-01-21

### Added
- Initial release of sveltekit-cloudflare-durable-objects
- Vite plugin for automatic Durable Objects export to Cloudflare Worker bundle
- CLI tool for manual/custom build workflows
- Idempotent export mechanism using marker comments
- Support for multiple Durable Object files
- Configuration via package.json or .do-exporter.json
- Comprehensive documentation and examples

### Features
- Seamless integration with SvelteKit and @sveltejs/adapter-cloudflare
- Automatic detection of existing exports (idempotency)
- Cross-platform path handling
- Verbose logging option for debugging
- TypeScript support with full type definitions

[0.1.0]: https://github.com/jillesme/sveltekit-cloudflare-durable-objects/releases/tag/v0.1.0
