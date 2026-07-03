#!/usr/bin/env node
import { parseArgs } from 'node:util';

import { exportSchemas } from './export-schema.js';

const USAGE = `Usage: webview-ts schema export <contract-file> -o <out-dir>

Exports zod-based plugin contracts to JSON Schema files (one per plugin).
Runtime validation works with any Standard Schema library; export requires zod.`;

async function main(): Promise<void> {
  const [command, subcommand, ...rest] = process.argv.slice(2);
  if (command !== 'schema' || subcommand !== 'export') {
    console.error(USAGE);
    process.exit(1);
  }
  const { values, positionals } = parseArgs({
    args: rest,
    options: { output: { type: 'string', short: 'o', default: './schemas' } },
    allowPositionals: true,
  });
  const contractPath = positionals[0];
  if (!contractPath) {
    console.error(USAGE);
    process.exit(1);
  }

  const result = await exportSchemas(contractPath, values.output as string);
  for (const file of result.files) {
    console.log(`✓ ${file.plugin} → ${file.path}`);
  }
  if (result.warnings.length > 0) {
    console.warn(`\nCoverage warnings (${result.warnings.length}):`);
    for (const warning of result.warnings) {
      console.warn(`  ⚠ ${warning}`);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
