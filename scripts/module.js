Hooks.once('init', () => {
    registerSettings();
});

Hooks.once('ready', () => {
    loadCompendiumData().then(() => {
        game.modules.get('gambits-premades').medkitApi = medkitApi;
    }).catch(error => {
        console.error("Error loading compendium data:", error);
    });
});

Hooks.on("preUpdateCombat", (combat, update, options) => {
    const startedPath = `gambits-premades.started`;
    const prevStarted = combat.started;
    foundry.utils.setProperty(options, startedPath, prevStarted);
})

Hooks.on("updateCombat", async (combat, update, options) => {
    const combatStarted = combat.started && !foundry.utils.getProperty(options, `gambits-premades.started`);

    if(combatStarted) {
        await enableOpportunityAttack(combat, "startCombat");
        await enableCounterspell(combat, "startCombat");
    }
})

Hooks.on("createCombatant", async (combatant, options, userId) => {
    let combat = game.combat;
    if (combat && combat.started) {
        await enableOpportunityAttack(combatant, "enterCombat");
        await enableCounterspell(combatant, "enterCombat");
    }
});

Hooks.on('deleteCombat', async (combat) => {
    await disableOpportunityAttack(combat, "endCombat");
    await disableCounterspell(combat, "endCombat");
});

Hooks.on("deleteCombatant", async (combatant, options, userId) => {
    let combat = game.combat;
    if (combat && combat.started) {
        await disableOpportunityAttack(combatant, "exitCombat");
        await disableCounterspell(combatant, "exitCombat");
    }
});