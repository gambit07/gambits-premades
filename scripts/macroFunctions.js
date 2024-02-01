async function enableOpportunityAttack(combat) {
    if (game.settings.get('gambits-premades', 'Enable Opportunity Attack') === false) return console.log("Opportunity Attack setting not enabled");
    if (!game.user.isGM) return console.log("User is not the GM");
    let combatants = await combat.combatants;
    const itemName = 'Opportunity Attack';
    let compendium = game.packs.get("gambits-premades.gps-generic-features");
    let compendiumItems = await compendium.getDocuments();
    let newItem = compendiumItems.find(i => i.name === itemName);
    let npcs = [];

    for (let combatant of combatants.values()) {
        if (combatant.actor.type === 'npc') {
            npcs.push(combatant);
        } else if (combatant.actor.type !== 'npc') {
            let existingItem = combatant.actor.items.find(i => i.name === itemName);

            if (existingItem) {
                await combatant.actor.deleteEmbeddedDocuments("Item", [existingItem.id]);
            }
            await combatant.actor.createEmbeddedDocuments("Item", [newItem.toObject()]);
        }
    }

    if(npcs.length === 0) return console.log("No npcs are valid for combat");

    await new Dialog({
        title: "Enable Opportunity Attack",
        content: `<p>Would you like to enable Opportunity Attack automation for all NPC's?</p>`,
        buttons: {
            yes: {
                label: "Yes",
                callback: async () => {
                    for (let npc of npcs) {
                        let existingItem = npc.actor.items.find(i => i.name === itemName);

                        if (existingItem) {
                            await npc.actor.deleteEmbeddedDocuments("Item", [existingItem.id]);
                        }

                        await npc.actor.createEmbeddedDocuments("Item", [newItem.toObject()]);
                    }
                }
            },
            no: {
                label: "No",
                callback: async () => {
                   for (let npc of npcs) {
                        let existingItem = npc.actor.items.find(i => i.name === itemName);

                        if (existingItem) {
                            await npc.actor.deleteEmbeddedDocuments("Item", [existingItem.id]);
                        }
                    }
				}
            }
        },
        default: "no"
    }).render(true);
};

async function disableOpportunityAttack(combat) {
    if (game.settings.get('gambits-premades', 'Enable Opportunity Attack') === false) return;
    if (!game.user.isGM) return;
    const itemName = 'Opportunity Attack';

    for (let combatant of combat.combatants.values()) {
        let existingItem = combatant.actor.items.find(i => i.name === itemName);
        let templateFlag = await combatant.actor.getFlag("midi-qol", "opportunityAttackTemplate");

        if (existingItem) await combatant.actor.deleteEmbeddedDocuments("Item", [existingItem.id]);

        if (templateFlag) await combatant.actor.unsetFlag("midi-qol", "opportunityAttackTemplate");
    }
};