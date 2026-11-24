// SOLMAR BAY — entrypoint. Copies the game and its screenshots into the
// grader output directory and writes dossier.json with the vendored
// make.fun library, so the dossier is byte-identical to buildDossier.
// Node 22, standard library only. Outside the grader, set
// MAKEFUN_OUTPUT_DIR to a local folder (e.g. mkdir -p out &&
// MAKEFUN_OUTPUT_DIR=out node main.ts).

import { cpSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const root = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(from: string, to: string): void {
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to, { recursive: true });
}

mkdirSync(outDir, { recursive: true });
copyTree(join(root, 'game'), join(outDir, 'game'));

const shotsSrc = join(root, 'screenshots');
const shotsDst = join(outDir, 'screenshots');
mkdirSync(shotsDst, { recursive: true });
if (existsSync(shotsSrc) && statSync(shotsSrc).isDirectory()) {
  cpSync(shotsSrc, shotsDst, { recursive: true });
}

// Caps from the scorer's reference: text_max_bytes is the only one that
// shapes the dossier bytes; the rest refuse an entry the scorer would
// refuse (too many or too large screenshots, too many game files or
// bytes, or a game path that is too long).
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});

writeFileSync(join(outDir, 'dossier.json'), dossier);

// Fail loudly instead of handing in an empty dossier: the grader compares
// dossier.json byte for byte against a fresh buildDossier run, so an empty
// or missing file would fail the match outright.
const written = statSync(join(outDir, 'dossier.json'));
if (written.size === 0) throw new Error('dossier.json was written empty');
console.log(`wrote dossier.json (${written.size} bytes) to ${outDir}`);
