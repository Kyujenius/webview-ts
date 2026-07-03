#!/usr/bin/env bash
# Packs every publishable package and installs the tarballs into a scratch
# project, then type-checks a consumer snippet. Catches broken exports/types
# paths before publish — the most common first-publish failure.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT

pnpm build

mkdir -p "$SCRATCH/tarballs"
for dir in packages/shared packages/core packages/cli packages/devtools packages/clients/react packages/clients/vue packages/hosts/react-native; do
  (cd "$ROOT/$dir" && pnpm pack --pack-destination "$SCRATCH/tarballs" > /dev/null)
done

TARBALLS=("$SCRATCH"/tarballs/*.tgz)

cd "$SCRATCH"
npm init -y > /dev/null
npm install --no-save --legacy-peer-deps "${TARBALLS[@]}" typescript@5.4 zod@^4 react@18 @types/react@18 > /dev/null

cat > consumer.ts <<'EOF'
import { action, definePlugin } from '@webview-ts/shared';
import { BridgeClient, BridgeHost } from '@webview-ts/core';
import { createBridgeReact } from '@webview-ts/react';
import { z } from 'zod';

const camera = definePlugin('camera', {
  takePhoto: action({ payload: z.object({ q: z.number().default(1) }), response: z.object({ uri: z.string() }) }),
});
const { useBridge } = createBridgeReact({ plugins: [camera] });
const _check: [typeof BridgeClient, typeof BridgeHost, typeof useBridge] = [BridgeClient, BridgeHost, useBridge];
EOF

npx tsc --strict --noEmit --skipLibCheck --moduleResolution bundler --module esnext --jsx react-jsx consumer.ts
echo "✓ smoke-pack passed: tarball exports and types resolve"
