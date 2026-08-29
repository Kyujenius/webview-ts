import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vite-plus/test';

import { exportSchemas } from './export-schema';

const FIXTURES = join(__dirname, '../test/fixtures');
let outDir: string;
afterEach(() => rmSync(outDir, { recursive: true, force: true }));

describe('exportSchemas', () => {
  it('writes one envelope file per plugin with actions and events', async () => {
    outDir = mkdtempSync(join(tmpdir(), 'wts-'));
    const result = await exportSchemas(join(FIXTURES, 'contract.ts'), outDir);

    expect(result.files.map((f) => f.plugin).sort()).toEqual(['camera', 'location']);
    const camera = JSON.parse(readFileSync(join(outDir, 'camera.json'), 'utf8'));
    expect(camera.webviewTs).toEqual({ specVersion: 1 });
    expect(camera.plugin).toBe('camera');
    expect(camera.actions.takePhoto.payload.properties.quality).toBeDefined();
    expect(camera.actions.takePhoto.response.properties.uri).toBeDefined();

    const location = JSON.parse(readFileSync(join(outDir, 'location.json'), 'utf8'));
    expect(location.events.updated.properties.lat).toBeDefined();
  });

  it('reports schema-less actions as coverage warnings, never silently omits', async () => {
    outDir = mkdtempSync(join(tmpdir(), 'wts-'));
    const result = await exportSchemas(join(FIXTURES, 'contract.ts'), outDir);
    expect(result.warnings.join('\n')).toContain('camera.plain');
    expect(result.warnings.join('\n')).toContain('location.noop');
  });

  it('fails loudly on non-zod schemas with the support message', async () => {
    outDir = mkdtempSync(join(tmpdir(), 'wts-'));
    await expect(exportSchemas(join(FIXTURES, 'valibot-contract.ts'), outDir)).rejects.toThrow(
      /only zod schemas are supported for export.*validation works with any Standard Schema/is
    );
  });

  it('rejects on mixed-vendor contracts without creating partial files', async () => {
    outDir = mkdtempSync(join(tmpdir(), 'wts-'));
    await expect(exportSchemas(join(FIXTURES, 'mixed-contract.ts'), outDir)).rejects.toThrow(
      /only zod schemas are supported for export/
    );
    expect(existsSync(join(outDir, 'zodish.json'))).toBe(false);
  });
});
