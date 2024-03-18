async function enableOpportunityAttack(combat, combatEvent) {
    const itemName = 'Opportunity Attack';
    let compendium = game.packs.get("gambits-premades.gps-generic-features");
    let compendiumIndex = await compendium.getIndex();
    let itemEntry = compendiumIndex.getName(itemName);
    if (!itemEntry) return; //Item not found in compendium
    
    let newItem = await compendium.getDocument(itemEntry._id);
    if (!newItem) return; //Failed to retrieve item from compendium

    async function processCombatant(combatant) {
        if (combatant.actor.type === 'npc' || combatant.actor.type === 'character') {
            const itemsToDelete = combatant.actor.items.filter(item => item.name === itemName);
            const itemIdsToDelete = itemsToDelete.map(item => item.id);
            let templateFlag = await combatant.actor.getFlag("midi-qol", "opportunityAttackTemplate");
            let checkRiposteFlag = await combatant.actor.getFlag("midi-qol", "checkRiposteDecision");
            let checkBraceFlag = await combatant.actor.getFlag("midi-qol", "checkBraceDecision");

            if (itemIdsToDelete.length > 0) {
                await combatant.actor.deleteEmbeddedDocuments("Item", itemIdsToDelete);
            }

            let effectNames = ["Opportunity Attack", "Opportunity Attack - Sentinel", "Opportunity Attack - Riposte", "Opportunity Attack Reaction", "Maneuvers: Brace Opportunity Attack", "Maneuvers: Riposte Opportunity Attack"];
            let effectIdsToDelete = combatant.actor.effects
                .filter(effect => effectNames.includes(effect.name))
                .map(effect => effect.id);
    
            if (effectIdsToDelete.length > 0) {
                await combatant.actor.deleteEmbeddedDocuments("ActiveEffect", effectIdsToDelete);
            }

            if(templateFlag) await combatant.actor.unsetFlag("midi-qol", "opportunityAttackTemplate");
            if(checkRiposteFlag) await combatant.actor.unsetFlag("midi-qol", "checkRiposteDecision");
            if(checkBraceFlag) await combatant.actor.unsetFlag("midi-qol", "checkBraceDecision");

            await combatant.actor.createEmbeddedDocuments("Item", [newItem.toObject()]);
            await combatant.actor.items.getName("Opportunity Attack").use();
        }
    }

    if(combatEvent === "startCombat") {
        for (let combatant of combat.combatants.values()) {
            await processCombatant(combatant);
        }
    }

    if(combatEvent === "enterCombat") {
        let combatant = combat;
        await processCombatant(combatant);
    }
};

async function disableOpportunityAttack(combat, combatEvent) {
    if (game.settings.get('gambits-premades', 'Enable Opportunity Attack') === false) return;
    const itemName = 'Opportunity Attack';

    async function processCombatant(combatant) {
        let existingItems = combatant.actor.items.filter(item => item.name === itemName);
        let itemIdsToDelete = existingItems.map(item => item.id);
        let templateFlag = await combatant.actor.getFlag("midi-qol", "opportunityAttackTemplate");
        let checkRiposteFlag = await combatant.actor.getFlag("midi-qol", "checkRiposteDecision");
        let checkBraceFlag = await combatant.actor.getFlag("midi-qol", "checkBraceDecision");
        let templateData = templateFlag ? await fromUuid(templateFlag) : null;

        if (itemIdsToDelete.length > 0) {
            await combatant.actor.deleteEmbeddedDocuments("Item", itemIdsToDelete);
        }

        let effectNames = ["Opportunity Attack", "Opportunity Attack - Sentinel", "Opportunity Attack - Riposte", "Opportunity Attack Reaction", "Maneuvers: Brace Opportunity Attack", "Maneuvers: Riposte Opportunity Attack"];
        let effectIdsToDelete = combatant.actor.effects
            .filter(effect => effectNames.includes(effect.name))
            .map(effect => effect.id);

        if (effectIdsToDelete.length > 0) {
            await combatant.actor.deleteEmbeddedDocuments("ActiveEffect", effectIdsToDelete);
        }

        if (templateData) await templateData.delete();
        if (templateFlag) await combatant.actor.unsetFlag("midi-qol", "opportunityAttackTemplate");
        if (checkRiposteFlag) await combatant.actor.unsetFlag("midi-qol", "checkRiposteDecision");
        if (checkBraceFlag) await combatant.actor.unsetFlag("midi-qol", "checkBraceDecision");
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