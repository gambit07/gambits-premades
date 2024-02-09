async function enableOpportunityAttack(combat) {
    if (game.settings.get('gambits-premades', 'Enable Opportunity Attack') === false) return console.log("Opportunity Attack setting not enabled");
    if (!game.user.isGM) return console.log("User is not the GM");
    const itemName = 'Opportunity Attack';
    let compendium = game.packs.get("gambits-premades.gps-generic-features");
    let compendiumIndex = await compendium.getIndex();
    let itemEntry = compendiumIndex.getName(itemName);

    if (!itemEntry) {
        return console.error("Item not found in compendium");
    }
    
    let newItem = await compendium.getDocument(itemEntry._id);
	
    if (!newItem) {
        return console.error("Failed to retrieve item from compendium");
    }

    const { npcs, pcs } = await categorizeCombatants(combat);

    const buttons = createDialogButtons(npcs, pcs);

    new Dialog({
        title: "Enable Opportunity Attack",
        content: "<p>Who would you like to automate Opportunity Attacks for?</p>",
        buttons: buttons,
        default: "none"
    }).render(true);

    async function processCombatants(combatants) {
        for (let combatant of combatants) {
                await combatant.actor.createEmbeddedDocuments("Item", [newItem.toObject()]);
                await combatant.actor.items.getName("Opportunity Attack").use();
        }
    }

    async function categorizeCombatants(combat) {
        let npcs = [];
        let pcs = [];
        
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
        return { npcs, pcs };
    }

    function createDialogButtons(npcs, pcs) {
        let buttons = {};

        if (pcs.length > 0) {
            buttons.pc = {
                label: "Friendlies",
                callback: () => processCombatants(pcs)
            };
        }

        if (npcs.length > 0) {
            buttons.npc = {
                label: "Hostiles",
                callback: () => processCombatants(npcs)
            };
        }

        if (pcs.length > 0 && npcs.length > 0) {
            buttons.both = {
                label: "Both",
                callback: () => processCombatants([...npcs, ...pcs])
            };
        }

        buttons.none = {
                label: "None",
                callback: async () => {
                    for (let combatant of combat.combatants.values()) {
                        let existingItem = combatant.actor.items.find(i => i.name === itemName);
                        if (existingItem) {
                            await combatant.actor.deleteEmbeddedDocuments("Item", [existingItem.id]);
                        }
                    }
                }
            }

        return buttons;
    }
};

async function disableOpportunityAttack(combat) {
    if (game.settings.get('gambits-premades', 'Enable Opportunity Attack') === false) return;
    if (!game.user.isGM) return;
    const itemName = 'Opportunity Attack';

    for (let combatant of combat.combatants.values()) {
        let existingItem = combatant.actor.items.getName(itemName);
        let templateFlag = await combatant.actor.getFlag("midi-qol", "opportunityAttackTemplate");

        if (existingItem) await combatant.actor.deleteEmbeddedDocuments("Item", [existingItem.id]);

        if (templateFlag) await combatant.actor.unsetFlag("midi-qol", "opportunityAttackTemplate");
    }
};

async function enableCounterspell(combat) {
    if (game.settings.get('gambits-premades', 'Enable Counterspell') === false) return console.log("Counterspell setting not enabled");
    if (!game.user.isGM) return console.log("User is not the GM");
    const itemName = 'Counterspell Initializer';
    let compendium = game.packs.get("gambits-premades.gps-generic-features");
    let compendiumIndex = await compendium.getIndex();
    let itemEntry = compendiumIndex.getName(itemName);

    if (!itemEntry) {
        return console.error("Item not found in compendium");
    }
    
    let newItem = await compendium.getDocument(itemEntry._id);

    if (!newItem) {
        return console.error("Failed to retrieve item from compendium");
    }

    const { npcs, pcs } = await categorizeCombatants(combat);
    const hasNpcWithCounterspell = checkForCounterspell(npcs);
    const hasPcWithCounterspell = checkForCounterspell(pcs);

    if (!hasNpcWithCounterspell && !hasPcWithCounterspell) return;

    const buttons = createDialogButtons(hasNpcWithCounterspell, hasPcWithCounterspell, npcs, pcs);

    new Dialog({
        title: "Enable Counterspell",
        content: "<p>Who would you like to automate Counterspell for?</p>",
        buttons: buttons,
        default: "none"
    }).render(true);

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
        return { npcs, pcs };
    }

    function checkForCounterspell(combatants) {
        return combatants.some(combatant => 
            combatant.actor.items.some(item => item.name.toLowerCase() === 'counterspell'));
    }

    function createDialogButtons(hasNpcWithCounterspell, hasPcWithCounterspell, npcs, pcs) {
        let buttons = {};

        if (hasPcWithCounterspell) {
            buttons.pc = {
                label: "Friendlies",
                callback: () => processCombatants(npcs)
            };
        }

        if (hasNpcWithCounterspell) {
            buttons.npc = {
                label: "Hostiles",
                callback: () => processCombatants(pcs)
            };
        }

        if (hasNpcWithCounterspell && hasPcWithCounterspell) {
            buttons.both = {
                label: "Both",
                callback: () => processCombatants([...npcs, ...pcs])
            };
        }

        buttons.none = {
                label: "None",
                callback: async () => {
                    for (let combatant of combat.combatants.values()) {
                        let existingItem = combatant.actor.items.find(i => i.name === itemName);
                        if (existingItem) {
                            await combatant.actor.deleteEmbeddedDocuments("Item", [existingItem.id]);
                        }
                    }
                }
            }

        return buttons;
    }
};

async function disableCounterspell(combat) {
    if (game.settings.get('gambits-premades', 'Enable Counterspell') === false) return console.log("Counterspell setting not enabled");
    if (!game.user.isGM) return;
    const itemName = 'Counterspell Initializer';

    for (let combatant of combat.combatants.values()) {
        let existingItem = combatant.actor.items.getName(itemName);
        let counterspellFlag1 = await combatant.actor.getFlag("midi-qol", "checkCounterspellSuccess");
        let counterspellFlag2 = await combatant.actor.getFlag("midi-qol", "checkCounterspellLevel");

        if (existingItem) await combatant.actor.deleteEmbeddedDocuments("Item", [existingItem.id]);

        if (counterspellFlag1) await combatant.actor.unsetFlag("midi-qol", "checkCounterspellSuccess");
        if (counterspellFlag2) await combatant.actor.unsetFlag("midi-qol", "checkCounterspellLevel");
    }
};