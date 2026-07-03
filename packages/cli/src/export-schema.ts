import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import type { AnyPlugin, StandardSchemaV1 } from '@webview-ts/shared';
import { createJiti } from 'jiti';
import { z } from 'zod';

export interface ExportResult {
  files: { plugin: string; path: string }[];
  warnings: string[];
}

function isPluginInstance(value: unknown): value is AnyPlugin {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as AnyPlugin).name === 'string' &&
    typeof (value as AnyPlugin).host === 'function' &&
    typeof (value as AnyPlugin).actions === 'object'
  );
}

function toJsonSchema(schema: StandardSchemaV1, subject: string): unknown {
  if (schema['~standard'].vendor !== 'zod') {
    throw new Error(
      `Cannot export '${subject}': only zod schemas are supported for export (found vendor '${schema['~standard'].vendor}'). ` +
        `Runtime validation works with any Standard Schema library; JSON Schema export currently requires zod.`
    );
  }
  return z.toJSONSchema(schema as never);
}

export async function exportSchemas(contractPath: string, outDir: string): Promise<ExportResult> {
  const jiti = createJiti(import.meta.url);
  const mod = (await jiti.import(resolve(contractPath))) as Record<string, unknown>;
  const plugins = Object.values(mod).filter(isPluginInstance);
  if (plugins.length === 0) {
    throw new Error(
      `No webview-ts plugins found in ${contractPath}. Export your definePlugin() results.`
    );
  }

  // Pass 1: Convert all schemas to JSON in memory (throws on non-zod before touching filesystem)
  const warnings: string[] = [];
  const envelopes: { plugin: string; envelope: unknown }[] = [];

  for (const plugin of plugins) {
    const actions: Record<string, { payload?: unknown; response?: unknown }> = {};
    for (const [short, fullName] of Object.entries(plugin.actions as Record<string, string>)) {
      const entry = plugin.actionSchemas[fullName];
      if (!entry || (!entry.payload && !entry.response)) {
        warnings.push(`${fullName}: no schema — excluded from export`);
        continue;
      }
      actions[short] = {
        ...(entry.payload && { payload: toJsonSchema(entry.payload, `${fullName} payload`) }),
        ...(entry.response && { response: toJsonSchema(entry.response, `${fullName} response`) }),
      };
    }

    const events: Record<string, unknown> = {};
    for (const [short, fullName] of Object.entries(plugin.events as Record<string, string>)) {
      const schema = plugin.eventSchemas[fullName];
      if (!schema) {
        warnings.push(`${fullName}: no schema — excluded from export`);
        continue;
      }
      events[short] = toJsonSchema(schema, `${fullName} event`);
    }

    const envelope = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      webviewTs: { specVersion: 1 },
      plugin: plugin.name,
      actions,
      ...(Object.keys(events).length > 0 && { events }),
    };
    envelopes.push({ plugin: plugin.name, envelope });
  }

  // Pass 2: Create directory and write files only after all conversions succeeded
  mkdirSync(outDir, { recursive: true });
  const files: ExportResult['files'] = [];

  for (const { plugin, envelope } of envelopes) {
    const filePath = join(outDir, `${plugin}.json`);
    writeFileSync(filePath, `${JSON.stringify(envelope, null, 2)}\n`);
    files.push({ plugin, path: filePath });
  }

  return { files, warnings };
}
