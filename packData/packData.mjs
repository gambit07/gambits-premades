import { compilePack } from '@foundryvtt/foundryvtt-cli';
let packs = [
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
for (let i of packs) {
    await compilePack('./packData/' + i, './packs/' + i, {'log': true});
}