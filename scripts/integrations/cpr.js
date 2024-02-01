// Define a global variable to hold the static data
let medkitItems = null;

async function loadCompendiumData() {
    const compendiumNames = [
        'gambits-premades.gps-class-features',
        'gambits-premades.gps-generic-features',
        'gambits-premades.gps-homebrew-features',
        'gambits-premades.gps-homebrew-items',
        'gambits-premades.gps-items',
        'gambits-premades.gps-spells',
        'gambits-premades.gps-homebrew-spells',
        'gambits-premades.gps-monster-features'
    ];
    let items = {};

    for (const name of compendiumNames) {
        let compendium = game.packs.get(name);
        if (compendium) {
            let content = await compendium.getDocuments();
            content.forEach(item => {
                items[item.name] = {
                    name: item.name,
                    version: item.system.source?.custom || 'Unknown'
                };
            });
        }
    }

    medkitItems = { 'automations': items };
}

function medkitApi() {
    return medkitItems || { 'automations': {} };
}