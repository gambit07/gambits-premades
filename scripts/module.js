Hooks.once('init', () => {
    registerSettings();
    game.modules.get('gambits-premades').medkitApi = medkitApi;
});

Hooks.on('createCombat', async (combat, options, userId) => {
    await new Promise(resolve => {
        const checkReadyInterval = setInterval(async () => {
            let allReady = true;
            for (const combatant of combat.combatants) {
                if (!combatant) {
                    allReady = false;
                    break;
                }
            }
            if (allReady) {
                clearInterval(checkReadyInterval);
                resolve();
            }
        }, 100);
    });

    await enableOpportunityAttack(combat);
});

Hooks.on('deleteCombat', async (combat) => {
    await disableOpportunityAttack(combat);
});