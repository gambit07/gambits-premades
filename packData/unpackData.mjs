import { extractPack } from '@foundryvtt/foundryvtt-cli';

let itemPacks = [
  'gps-spells',
  'gps-class-features',
  'gps-items',
  'gps-monster-features',
  'gps-generic-features',
  'gps-homebrew-features',
  'gps-homebrew-items',
  'gps-homebrew-spells',
  'gps-3rd-party-items',
  'gps-3rd-party-spells',
  'gps-race-features',
  'gps-spells-2024',
  'gps-race-features-2024',
  'gps-generic-features-2024',
  'gps-items-2024',
  'gps-class-features-2024',
];

let actorPacks = [
    'gps-actors'
];

for (let i of itemPacks) {
    await extractPack('packs/' + i, 'packData/' + i, {'log': true, 'documentType': 'Item', transformEntry: (entry) => {
        delete entry._stats;
        delete entry.sort;
        delete entry.ownership;
        for (const i in entry.effects)
        {
            if (entry.effects[i]._stats) delete entry.effects[i]._stats;
        }
        if (entry.system?.source?.sourceClass) delete entry.system.source.sourceClass;
        if (entry.flags.core?.sourceId) delete entry.flags.core.sourceId;
        if (entry.system?.materials?.value) entry.system.materials.value = '';
    }});
}
for (let i of actorPacks) {
    await extractPack('packs/' + i, 'packData/' + i, {'log': true, 'documentType': 'Actor', transformEntry: (entry) => {delete entry._stats; delete entry.sort; delete entry.ownership;}});
}