export async function enableOpportunityAttack(combat, combatEvent) {
    const module = await import('../module.js');
    const socket = module.socket;
    const itemName = 'Opportunity Attack';
    let compendium = game.packs.get("gambits-premades.gps-generic-features");
    let compendiumIndex = await compendium.getIndex();
    let itemEntry = compendiumIndex.getName(itemName);
    if (!itemEntry) return; //Item not found in compendium
    
    let newItem = await compendium.getDocument(itemEntry._id);
    if (!newItem) return; //Failed to retrieve item from compendium

    async function processCombatant(combatant) {
        const { actor } = combatant;
        let browserUser = MidiQOL.playerForActor(actor);
        if (!browserUser.active) {
            browserUser = game.users?.activeGM;
        }
        if (actor.type === 'npc' || actor.type === 'character') {
            const existingOA = actor.items.filter(item => item.name === itemName);

            if(existingOA.length > 0 && existingOA[0].system.source?.custom === newItem.system.source?.custom && existingOA.length === 1) {
                if(browserUser.id !== game.users?.activeGM.id) {
                    await socket.executeAsUser("chooseUseItemUser", browserUser.id, { itemUuid: existingOA[0].uuid });
                }
                else {
                    await socket.executeAsGM("chooseUseItemUser", { itemUuid: existingOA[0].uuid });
                }
                return;
            }
            const itemIdsToDelete = existingOA.map(item => item.id);
            let templateFlag = await actor.getFlag("midi-qol", "opportunityAttackTemplate");
            let checkBraceFlag = await actor.getFlag("midi-qol", "checkBraceDecision");

            if (itemIdsToDelete.length > 0) {
                await actor.deleteEmbeddedDocuments("Item", itemIdsToDelete);
            }

            let effectNames = ["Opportunity Attack", "Opportunity Attack Reaction", "Maneuvers: Brace Opportunity Attack"];
            let effectIdsToDelete = actor.effects
                .filter(effect => effectNames.includes(effect.name))
                .map(effect => effect.id);
    
            if (effectIdsToDelete.length > 0) {
                await actor.deleteEmbeddedDocuments("ActiveEffect", effectIdsToDelete);
            }

            if(templateFlag) await actor.unsetFlag("midi-qol", "opportunityAttackTemplate");
            if(checkBraceFlag) await actor.unsetFlag("midi-qol", "checkBraceDecision");

            let newOA = await actor.createEmbeddedDocuments("Item", [newItem.toObject()]);

            if(browserUser.id !== game.users?.activeGM.id) {
                await socket.executeAsUser("chooseUseItemUser", browserUser.id, { itemUuid: newOA[0].uuid });
            }
            else {
                await socket.executeAsGM("chooseUseItemUser", { itemUuid: newOA[0].uuid });
            }
        }
    }

    if(combatEvent === "startCombat") {
        console.log("startcombat")
        for (let combatant of combat.combatants.values()) {
            await processCombatant(combatant);
        }
    }

    if(combatEvent === "enterCombat") {
        console.log("entercombat")
        let combatant = combat;
        await processCombatant(combatant);
    }
};

export async function disableOpportunityAttack(combat, combatEvent) {
    if (game.settings.get('gambits-premades', 'Enable Opportunity Attack') === false) return;

    async function processCombatant(combatant) {
        const { actor } = combatant;
        let templateFlag = await actor.getFlag("midi-qol", "opportunityAttackTemplate");
        let checkBraceFlag = await actor.getFlag("midi-qol", "checkBraceDecision");
        let templateData = templateFlag ? await fromUuid(templateFlag) : null;

        let effectNames = ["Opportunity Attack", "Opportunity Attack Reaction", "Maneuvers: Brace Opportunity Attack"];
        let effectIdsToDelete = actor.effects
            .filter(effect => effectNames.includes(effect.name))
            .map(effect => effect.id);

        if (effectIdsToDelete.length > 0) {
            await actor.deleteEmbeddedDocuments("ActiveEffect", effectIdsToDelete);
        }

        if (templateData) await templateData.delete();
        if (templateFlag) await actor.unsetFlag("midi-qol", "opportunityAttackTemplate");
        if (checkBraceFlag) await actor.unsetFlag("midi-qol", "checkBraceDecision");
    }

    if (combatEvent === "endCombat") {
        for (let combatant of combat.combatants.values()) {
            await processCombatant(combatant);
        }
    }

    if (combatEvent === "exitCombat") {
        let combatant = combat;
        await processCombatant(combatant);
    }
};