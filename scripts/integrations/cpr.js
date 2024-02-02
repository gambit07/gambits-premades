let medkitItems = null;

async function loadCompendiumData() {

    let items = {};

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

    for (const name of compendiumNames) {
        let compendium = game.packs.get(name);
        if (compendium) {
            let index = await compendium.getIndex();
            index.forEach(entry => {
                items[entry.name] = {
                    name: entry.name,
                    version: entry.system.source?.custom || 'Unknown'
                };
            });
        }
    }
    // Assign the loaded data to medkitItems
    medkitItems = { 'automations': items };
}

// Define medkitApi to return the loaded data
function medkitApi() {
    return medkitItems || { 'automations': {} };
}