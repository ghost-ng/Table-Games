/** Explicit CLI for verified checkerboard-matte alpha recovery. */
import assert from 'node:assert/strict';
import { lstat, mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { recoverCheckerboardAlpha } from './checkerboard-alpha.mjs';

const usage = 'Usage: node scripts/recover-checkerboard-alpha.mjs --input <opaque.png> --output <recovered.png> [--allow-transparent-noop]';

export function parseArguments(args) {
  const options = { allowTransparentNoop: false };
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument === '--allow-transparent-noop') {
      options.allowTransparentNoop = true;
      continue;
    }
    assert.ok(['--input', '--output'].includes(argument) && args[index + 1], usage);
    options[argument === '--input' ? 'input' : 'output'] = args[++index];
  }
  assert.ok(options.input && options.output, usage);
  return options;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const input = resolve(options.input); const output = resolve(options.output);
  assert.notEqual(input, output, 'Input and output must be different paths; raw candidates are never overwritten');
  try {
    const metadata = await lstat(output);
    assert.ok(!metadata.isSymbolicLink(), 'Output symbolic links are refused');
    const [inputStat, outputStat] = await Promise.all([stat(input), stat(output)]);
    assert.ok(inputStat.dev !== outputStat.dev || inputStat.ino !== outputStat.ino,
      'Output must not alias or overwrite the input');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const result = await recoverCheckerboardAlpha(input,
    { allowTransparentNoop: options.allowTransparentNoop });
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, result.data);
  console.log(JSON.stringify({
    detection: result.detection,
    removedPixels: result.removedPixels,
    outputAlphaBounds: result.metrics?.bounds ?? null,
    noop: result.noop,
  }, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
