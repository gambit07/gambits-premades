async function enableOpportunityAttack(combat, combatEvent) {
    if (game.settings.get('gambits-premades', 'Enable Opportunity Attack') === false) return console.log("Opportunity Attack setting not enabled");
    if (!game.user.isGM) return console.log("User is not the GM");
    const targetSetting = game.settings.get('gambits-premades', 'Opportunity Attack Targets');
    
    const itemName = 'Opportunity Attack';
    let compendium = game.packs.get("gambits-premades.gps-generic-features");
    let compendiumIndex = await compendium.getIndex();
    let itemEntry = compendiumIndex.getName(itemName);
    if (!itemEntry) return console.error("Item not found in compendium");
    
    let newItem = await compendium.getDocument(itemEntry._id);
    if (!newItem) return console.error("Failed to retrieve item from compendium");

    const { npcs, pcs } = await categorizeCombatants(combat);
    
    // Process based on settings
    switch (targetSetting) {
        case 0: // Friendlies
            await processCombatants(pcs);
            break;
        case 1: // Enemies
            await processCombatants(npcs);
            break;
        case 2: // Both
            await processCombatants([...npcs, ...pcs]);
            break;
        default:
            // No action for "None" or undefined setting
            break;
    }

    async function processCombatants(combatants) {
        for (let combatant of combatants) {
                await combatant.actor.createEmbeddedDocuments("Item", [newItem.toObject()]);
                await combatant.actor.items.getName("Opportunity Attack").use();
        }
    }

    async function categorizeCombatants(combat) {
        let npcs = [];
        let pcs = [];
        
        if(combatEvent === "startCombat") {
            for (let combatant of combat.combatants.values()) {
                if (combatant.actor.type === 'npc' || combatant.actor.type === 'character') {
                    let existingItem = combatant.actor.items.find(i => i.name === itemName);
                    
                    if (combatant.token.disposition === -1) {
                        if (existingItem) await combatant.actor.deleteEmbeddedDocuments("Item", [existingItem.id]);
                        npcs.push(combatant);
                    } else if (combatant.token.disposition === 1) {
                        if (existingItem) await combatant.actor.deleteEmbeddedDocuments("Item", [existingItem.id]);
                        pcs.push(combatant);
                    }
                }
            }
        }

        if(combatEvent === "enterCombat") {
            let combatant = combat;
                if (combatant.actor.type === 'npc' || combatant.actor.type === 'character') {
                    let existingItem = combatant.actor.items.find(i => i.name === itemName);
                    
                    if (combatant.token.disposition === -1) {
                        if (existingItem) await combatant.actor.deleteEmbeddedDocuments("Item", [existingItem.id]);
                        npcs.push(combatant);
                    } else if (combatant.token.disposition === 1) {
                        if (existingItem) await combatant.actor.deleteEmbeddedDocuments("Item", [existingItem.id]);
                        pcs.push(combatant);
                    }
                }
        }
        
        return { npcs, pcs };
    }
};

async function disableOpportunityAttack(combat, combatEvent) {
    if (game.settings.get('gambits-premades', 'Enable Opportunity Attack') === false) return;
    if (!game.user.isGM) return;
    const itemName = 'Opportunity Attack';

    if(combatEvent === "endCombat") {    
        for (let combatant of combat.combatants.values()) {
            let existingItem = combatant.actor.items.getName(itemName);
            let templateFlag = await combatant.actor.getFlag("midi-qol", "opportunityAttackTemplate");

            if (existingItem) await combatant.actor.deleteEmbeddedDocuments("Item", [existingItem.id]);

            if (templateFlag) await combatant.actor.unsetFlag("midi-qol", "opportunityAttackTemplate");
        }
    }

    if(combatEvent === "exitCombat") {       
        let combatant = combat;
        let existingItem = combatant.actor.items.getName(itemName);
        let templateFlag = await combatant.actor.getFlag("midi-qol", "opportunityAttackTemplate");

        if (existingItem) await combatant.actor.deleteEmbeddedDocuments("Item", [existingItem.id]);

        if (templateFlag) await combatant.actor.unsetFlag("midi-qol", "opportunityAttackTemplate");
    }
};

/*async function enableCounterspell(combat, combatEvent) {
    if (game.settings.get('gambits-premades', 'Enable Counterspell') === false) return console.log("Counterspell setting not enabled");
    if (!game.user.isGM) return console.log("User is not the GM");
    const targetSetting = game.settings.get('gambits-premades', 'Counterspell Targets');
    
    const itemName = 'Counterspell Initializer';
    let compendium = game.packs.get("gambits-premades.gps-generic-features");
    let compendiumIndex = await compendium.getIndex();
    let itemEntry = compendiumIndex.getName(itemName);
    if (!itemEntry) return console.error("Item not found in compendium");
    
    let newItem = await compendium.getDocument(itemEntry._id);
    if (!newItem) return console.error("Failed to retrieve item from compendium");

    const { npcs, pcs } = await categorizeCombatants(combat);

    // Process based on settings
    switch (targetSetting) {
        case 0: // Friendlies
                await processCombatants(npcs);
                break;
        case 1: // Enemies
                await processCombatants(pcs);
                break;
        case 2: // Both
                await processCombatants([...npcs, ...pcs]);
                break;
        default:
            // No action for "None" or undefined setting
            break;
    }

    async function processCombatants(combatants) {
        for (let combatant of combatants) {
            let magicItem = combatant.actor.items.find(i => i.type === "spell");

            if (magicItem) {
                await combatant.actor.createEmbeddedDocuments("Item", [newItem.toObject()]);
            }
        }
    }

    async function categorizeCombatants(combat) {
        let npcs = [];
        let pcs = [];
        
        if(combatEvent === "startCombat") {
            for (let combatant of combat.combatants.values()) {
                if (combatant.actor.type === 'npc' || combatant.actor.type === 'character') {
                    let existingItem = combatant.actor.items.find(i => i.name === itemName);
                    
                    if (combatant.token.disposition === -1) {
                        if (existingItem) await combatant.actor.deleteEmbeddedDocuments("Item", [existingItem.id]);
                        npcs.push(combatant);
                    } else if (combatant.token.disposition === 1) {
                        if (existingItem) await combatant.actor.deleteEmbeddedDocuments("Item", [existingItem.id]);
                        pcs.push(combatant);
                    }
                }
            }
        }

        if(combatEvent === "enterCombat") {
            let combatant = combat;
                if (combatant.actor.type === 'npc' || combatant.actor.type === 'character') {
                    let existingItem = combatant.actor.items.find(i => i.name === itemName);
                    
                    if (combatant.token.disposition === -1) {
                        if (existingItem) await combatant.actor.deleteEmbeddedDocuments("Item", [existingItem.id]);
                        npcs.push(combatant);
                    } else if (combatant.token.disposition === 1) {
                        if (existingItem) await combatant.actor.deleteEmbeddedDocuments("Item", [existingItem.id]);
                        pcs.push(combatant);
                    }
                }
        }

        return { npcs, pcs };
    }
};

async function disableCounterspell(combat, combatEvent) {
    if (game.settings.get('gambits-premades', 'Enable Counterspell') === false) return console.log("Counterspell setting not enabled");
    if (!game.user.isGM) return;
    const itemName = 'Counterspell Initializer';

    if(combatEvent === "endCombat") {    
        for (let combatant of combat.combatants.values()) {
            let existingItem = combatant.actor.items.getName(itemName);
            let counterspellFlag1 = await combatant.actor.getFlag("midi-qol", "checkCounterspellSuccess");
            let counterspellFlag2 = await combatant.actor.getFlag("midi-qol", "checkCounterspellLevel");

            if (existingItem) await combatant.actor.deleteEmbeddedDocuments("Item", [existingItem.id]);

            if (counterspellFlag1) await combatant.actor.unsetFlag("midi-qol", "checkCounterspellSuccess");
            if (counterspellFlag2) await combatant.actor.unsetFlag("midi-qol", "checkCounterspellLevel");
        }
    }

    if(combatEvent === "exitCombat") {    
        let combatant = combat;
        let existingItem = combatant.actor.items.getName(itemName);
        let counterspellFlag1 = await combatant.actor.getFlag("midi-qol", "checkCounterspellSuccess");
        let counterspellFlag2 = await combatant.actor.getFlag("midi-qol", "checkCounterspellLevel");

        if (existingItem) await combatant.actor.deleteEmbeddedDocuments("Item", [existingItem.id]);

        if (counterspellFlag1) await combatant.actor.unsetFlag("midi-qol", "checkCounterspellSuccess");
        if (counterspellFlag2) await combatant.actor.unsetFlag("midi-qol", "checkCounterspellLevel");
    }    
};*/