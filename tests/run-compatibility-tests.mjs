import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';

const outfile = '.angular/public-survey-compatibility.test.mjs';
await build({
  entryPoints: ['tests/public-survey-compatibility.test.ts'],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
});
const result = spawnSync(process.execPath, ['--test', outfile], { stdio: 'inherit' });
process.exitCode = result.status ?? 1;
