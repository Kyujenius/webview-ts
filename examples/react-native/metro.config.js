/* eslint-disable @typescript-eslint/no-var-requires */
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch workspace packages that this app uses
config.watchFolders = [
  path.resolve(monorepoRoot, 'packages'),
  path.resolve(monorepoRoot, 'examples/plugins'),
];

// --- pnpm symlink resolution for Metro ---
const projectNodeModules = path.resolve(projectRoot, 'node_modules');
const pnpmStore = path.resolve(monorepoRoot, 'node_modules/.pnpm');

// Resolve all symlinks in project node_modules to real paths
function collectModules(dir) {
  const modules = {};
  if (!fs.existsSync(dir)) return modules;
  for (const entry of fs.readdirSync(dir)) {
    if (entry.startsWith('.')) continue;
    const fullPath = path.join(dir, entry);
    if (entry.startsWith('@')) {
      if (fs.statSync(fullPath).isDirectory()) {
        for (const sub of fs.readdirSync(fullPath)) {
          modules[`${entry}/${sub}`] = fs.realpathSync(path.join(fullPath, sub));
        }
      }
    } else {
      modules[entry] = fs.realpathSync(fullPath);
    }
  }
  return modules;
}

const extraModules = collectModules(projectNodeModules);

// Also resolve transitive deps that live inside each direct dep's node_modules
// (e.g. expo-modules-core inside expo's resolved node_modules)
for (const [, realPath] of Object.entries(extraModules)) {
  const parentNodeModules = path.resolve(realPath, '..'); // the node_modules dir containing this pkg
  for (const sibling of fs.readdirSync(parentNodeModules)) {
    if (sibling.startsWith('.') || extraModules[sibling]) continue;
    const siblingPath = path.join(parentNodeModules, sibling);
    if (sibling.startsWith('@')) {
      if (fs.statSync(siblingPath).isDirectory()) {
        for (const sub of fs.readdirSync(siblingPath)) {
          const key = `${sibling}/${sub}`;
          if (!extraModules[key]) {
            extraModules[key] = fs.realpathSync(path.join(siblingPath, sub));
          }
        }
      }
    } else {
      extraModules[sibling] = fs.realpathSync(siblingPath);
    }
  }
}

config.resolver.extraNodeModules = extraModules;

// Watch .pnpm store so Metro can read resolved files
config.watchFolders.push(pnpmStore);

config.resolver.nodeModulesPaths = [projectNodeModules, path.resolve(monorepoRoot, 'node_modules')];

config.resolver.disableHierarchicalLookup = false;

module.exports = config;
