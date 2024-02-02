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

Hooks.on('createCombat', async (combat, options, userId) => {
    try {
        await new Promise((resolve, reject) => {
            const checkReadyInterval = setInterval(async () => {
                try {
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
                } catch (error) {
                    clearInterval(checkReadyInterval);
                    reject(error);
                }
            }, 100);
        });

        await enableOpportunityAttack(combat);
    } catch (error) {
        console.error("Error during combat creation or enabling opportunity attack:", error);
    }
});

Hooks.on('deleteCombat', async (combat) => {
    await disableOpportunityAttack(combat);
});