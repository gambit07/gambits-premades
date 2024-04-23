async function enableOpportunityAttack(combat, combatEvent) {
    const itemName = 'Opportunity Attack';
    let compendium = game.packs.get("gambits-premades.gps-generic-features");
    let compendiumIndex = await compendium.getIndex();
    let itemEntry = compendiumIndex.getName(itemName);
    if (!itemEntry) return; //Item not found in compendium
    
    let newItem = await compendium.getDocument(itemEntry._id);
    if (!newItem) return; //Failed to retrieve item from compendium

    async function processCombatant(combatant) {
        const { actor } = combatant;
        if (actor.type === 'npc' || actor.type === 'character') {
            const itemsToDelete = actor.items.filter(item => item.name === itemName);
            const itemIdsToDelete = itemsToDelete.map(item => item.id);
            let templateFlag = actor.getFlag("midi-qol", "opportunityAttackTemplate");
            let checkRiposteFlag = actor.getFlag("midi-qol", "checkRiposteDecision");
            let checkBraceFlag = actor.getFlag("midi-qol", "checkBraceDecision");
            let oaValidWeapons = actor.getFlag("midi-qol", "opportunityAttackTemplateValidWeapons");
            let oaValidSpells = actor.getFlag("midi-qol", "opportunityAttackTemplateValidSpells");
            let mwakRange = actor.getFlag("midi-qol", "opportunityAttackTemplateMwakRange");
            let oaTTS = actor.getFlag("midi-qol", "opportunityAttackTemplateTokenSize");
            let oaConFac = actor.getFlag("midi-qol", "opportunityAttackTemplateConFac");

            if (itemIdsToDelete.length > 0) {
                await actor.deleteEmbeddedDocuments("Item", itemIdsToDelete);
            }

            let effectNames = ["Opportunity Attack", "Opportunity Attack - Sentinel", "Opportunity Attack - Riposte", "Opportunity Attack Reaction", "Maneuvers: Brace Opportunity Attack", "Maneuvers: Riposte Opportunity Attack"];
            let effectIdsToDelete = actor.effects
                .filter(effect => effectNames.includes(effect.name))
                .map(effect => effect.id);
    
            if (effectIdsToDelete.length > 0) {
                await actor.deleteEmbeddedDocuments("ActiveEffect", effectIdsToDelete);
            }

            if(templateFlag) await actor.unsetFlag("midi-qol", "opportunityAttackTemplate");
            if(checkRiposteFlag) await actor.unsetFlag("midi-qol", "checkRiposteDecision");
            if(checkBraceFlag) await actor.unsetFlag("midi-qol", "checkBraceDecision");
            if(oaValidWeapons) await actor.unsetFlag("midi-qol", "opportunityAttackTemplateValidWeapons");
            if(oaValidSpells) await actor.unsetFlag("midi-qol", "opportunityAttackTemplateValidSpells");
            if(mwakRange) await actor.unsetFlag("midi-qol", "opportunityAttackTemplateMwakRange");
            if(oaTTS) await actor.unsetFlag("midi-qol", "opportunityAttackTemplateTokenSize");
            if(oaConFac) await actor.unsetFlag("midi-qol", "opportunityAttackTemplateConFac");

            await actor.createEmbeddedDocuments("Item", [newItem.toObject()]);
            await actor.items.getName("Opportunity Attack").use();
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
        const { actor } = combatant;
        let existingItems = actor.items.filter(item => item.name === itemName);
        let itemIdsToDelete = existingItems.map(item => item.id);
        let templateFlag = actor.getFlag("midi-qol", "opportunityAttackTemplate");
        let checkRiposteFlag = actor.getFlag("midi-qol", "checkRiposteDecision");
        let checkBraceFlag = actor.getFlag("midi-qol", "checkBraceDecision");
        let oaValidWeapons = actor.getFlag("midi-qol", "opportunityAttackTemplateValidWeapons");
        let oaValidSpells = actor.getFlag("midi-qol", "opportunityAttackTemplateValidSpells");
        let mwakRange = actor.getFlag("midi-qol", "opportunityAttackTemplateMwakRange");
        let oaTTS = actor.getFlag("midi-qol", "opportunityAttackTemplateTokenSize");
        let oaConFac = actor.getFlag("midi-qol", "opportunityAttackTemplateConFac");
        let templateData = templateFlag ? await fromUuid(templateFlag) : null;

        if (itemIdsToDelete.length > 0) {
            await actor.deleteEmbeddedDocuments("Item", itemIdsToDelete);
        }

        let effectNames = ["Opportunity Attack", "Opportunity Attack - Sentinel", "Opportunity Attack - Riposte", "Opportunity Attack Reaction", "Maneuvers: Brace Opportunity Attack", "Maneuvers: Riposte Opportunity Attack", "Sentinel Attack", "Riposte Attack"];
        let effectIdsToDelete = actor.effects
            .filter(effect => effectNames.includes(effect.name))
            .map(effect => effect.id);

        if (effectIdsToDelete.length > 0) {
            await actor.deleteEmbeddedDocuments("ActiveEffect", effectIdsToDelete);
        }

        if (templateData) await templateData.delete();
        if (templateFlag) await actor.unsetFlag("midi-qol", "opportunityAttackTemplate");
        if (checkRiposteFlag) await actor.unsetFlag("midi-qol", "checkRiposteDecision");
        if (checkBraceFlag) await actor.unsetFlag("midi-qol", "checkBraceDecision");
        if (oaValidWeapons) await actor.unsetFlag("midi-qol", "opportunityAttackTemplateValidWeapons");
        if (oaValidSpells) await actor.unsetFlag("midi-qol", "opportunityAttackTemplateValidSpells");
        if (mwakRange) await actor.unsetFlag("midi-qol", "opportunityAttackTemplateMwakRange");
        if (oaTTS) await actor.unsetFlag("midi-qol", "opportunityAttackTemplateTokenSize");
        if (oaConFac) await actor.unsetFlag("midi-qol", "opportunityAttackTemplateConFac");
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