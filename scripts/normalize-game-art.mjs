/** Reproduce production cutouts from the documented, locally generated family PNGs. */
import { readFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sources = JSON.parse(readFileSync(resolve(root, 'docs/design/game-art-sources.json'), 'utf8'));
for (const source of sources) {
  if (process.argv[2] && source.family !== process.argv[2]) continue;
  const [width, height] = execFileSync('identify', ['-format', '%w %h', source.path], { encoding: 'utf8' }).trim().split(' ').map(Number);
  const outDir = resolve(root, 'assets/pieces', source.theme, source.family);
  mkdirSync(outDir, { recursive: true });
  source.files.forEach((filename, index) => {
    const col = index % source.cols;
    const row = Math.floor(index / source.cols);
    // Explicit fractional crop bounds document hand-inspected uneven sheets.
    const crop = source.crops?.[index];
    const x = Math.round(width * (crop ? crop[0] : col / source.cols));
    const y = Math.round(height * (crop ? crop[1] : row / source.rows));
    const w = crop ? Math.round(width * crop[2]) : Math.round(width * (col + 1) / source.cols) - x;
    const h = crop ? Math.round(height * crop[3]) : Math.round(height * (row + 1) / source.rows) - y;
    const size = source.size;
    const args = [source.path, '-crop', `${w}x${h}+${x}+${y}`, '+repage'];
    // Clear tiny disconnected generation specks; multiply the mask by original
    // alpha so translucent material and antialiased boundaries remain intact.
    args.push('(', '+clone', '-alpha', 'extract', '(', '+clone', '-threshold', '5%');
    if (source.alphaOpening) args.push('-morphology', 'Open', `Disk:${source.alphaOpening}`);
    args.push('-define', `connected-components:area-threshold=${source.family === 'hangman' ? 400 : 40}`,
      '-define', 'connected-components:mean-color=true', '-connected-components', '8',
      ')', '-compose', 'Multiply', '-composite', ')', '-compose', 'CopyOpacity', '-composite', '-compose', 'Over');
    // Preserve a single framing/scale for the whole assembly sequence.
    if (source.family !== 'hangman') args.push('-trim', '+repage');
    args.push('-resize', `${Math.round(size * 0.82)}x${Math.round(size * 0.82)}`,
      '-background', 'none', '-gravity', 'center', '-extent', `${size}x${size}`,
      '-define', 'webp:method=6', '-quality', '86', resolve(outDir, filename));
    execFileSync('convert', args);
  });
  console.log(`${source.theme}/${source.family}: ${source.files.length} transparent ${source.size}px WebP cutouts`);
}
