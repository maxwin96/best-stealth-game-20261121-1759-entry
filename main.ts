// The Velvet Fox — entrypoint for make.fun (program/v1).
// Copies game/ and screenshots/ from this repository into the
// output directory and writes /output/dossier.json with
// buildDossier from vendor/makefun-game.ts.
//
// Node 22 standard library only. It never deletes anything:
// the grader's /output is a mount point, so this program only
// creates directories and copies files into it.

import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The repository root is the directory holding this file.
const REPO_ROOT = dirname(fileURLToPath(import.meta.url));

// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output.
const OUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const GAME_DIR = join(REPO_ROOT, 'game');
const SHOTS_DIR = join(REPO_ROOT, 'screenshots');

function handIn(): void {
  // Create the output tree. mkdirSync with recursive:true only
  // creates what is missing; it never removes an existing mount.
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(join(OUT_DIR, 'game'), { recursive: true });
  mkdirSync(join(OUT_DIR, 'screenshots'), { recursive: true });

  // Copy the playable game and its screenshots over.
  cpSync(GAME_DIR, join(OUT_DIR, 'game'), { recursive: true });
  cpSync(SHOTS_DIR, join(OUT_DIR, 'screenshots'), { recursive: true });

  // Write the dossier the scorer compares byte for byte.
  const dossier = buildDossier(OUT_DIR, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
  });
  writeFileSync(join(OUT_DIR, 'dossier.json'), dossier);
  return dossier.length;
}

const dossierBytes = handIn();
console.log(`The Velvet Fox handed in: game/ + screenshots/ + dossier.json (${dossierBytes} bytes) -> ${OUT_DIR}`);
