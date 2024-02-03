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
        await enableOpportunityAttack(combat);
        await enableCounterspell(combat);
    }
})

Hooks.on('deleteCombat', async (combat) => {
    await disableOpportunityAttack(combat);
    await disableCounterspell(combat);
});