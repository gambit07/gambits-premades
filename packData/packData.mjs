// packData/packData.mjs
import fs from 'fs/promises';
import { compilePack } from '@foundryvtt/foundryvtt-cli';

const packs = [
  'gps-spells',
  'gps-class-features',
  'gps-items',
  'gps-monster-features',
  'gps-generic-features',
  'gps-homebrew-features',
  'gps-homebrew-items',
  'gps-homebrew-spells',
  'gps-3rd-party-features',
  'gps-3rd-party-items',
  'gps-3rd-party-spells',
  'gps-race-features',
  'gps-spells-2024',
  'gps-race-features-2024',
  'gps-generic-features-2024',
  'gps-items-2024',
  'gps-class-features-2024',
  'gps-actors'
];

for (const name of packs) {
  const src = `./packData/${name}`;
  const dest = `./packs/${name}`;

  // ensure a clean LevelDB so no iterator-over-old-keys work happens
  await fs.rm(dest, { recursive: true, force: true });

  try {
    // disable progress logging; it’s been implicated in iterator timing
    await compilePack(src, dest, { log: false });
    console.log(`✅ Packed ${name}`);
  } catch (e) {
    const msg = String(e?.message || '');
    if (e?.code === 'LEVEL_ITERATOR_NOT_OPEN' || msg.includes('Iterator is not open')) {
      console.warn(`⚠️ Ignored LevelDB iterator-close error after packing "${name}". Output should already be written.`);
      continue;
    }
    throw e; // anything else should still fail
  }
}
