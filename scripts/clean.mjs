import { lstat, realpath, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = await realpath(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
const targets = ['dist', '.expo'].map((name) => resolve(root, name));

// Validate both targets before removing either, including symlinks to external data.
for (const target of targets) {
  if (dirname(target) !== root || target === root) {
    throw new Error(`Refusing unsafe cleanup target: ${target}`);
  }
  let info;
  try {
    info = await lstat(target);
  } catch (error) {
    if (error.code === 'ENOENT') continue;
    throw error;
  }
  if (!info.isDirectory() || info.isSymbolicLink() || await realpath(target) !== target) {
    throw new Error(`Refusing unsafe cleanup target (directory or symlink): ${target}`);
  }
}

for (const target of targets) {
  await rm(target, { recursive: true, force: true });
}
console.log('Removed repository dist/ and .expo/ directories, if present.');
