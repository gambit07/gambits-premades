import { counterspell, showCounterspellDialog } from './macros/counterspell.js';
export let socket;

Hooks.once('init', async function() {
    registerSettings();
});

Hooks.once('socketlib.ready', async function() {
    socket = socketlib.registerModule('gambits-premades');
    socket.register("counterspell", counterspell);
    socket.register("showCounterspellDialog", showCounterspellDialog);
})

Hooks.once('ready', async function() {
    loadCompendiumData().then(() => {
        game.modules.get('gambits-premades').medkitApi = medkitApi;
    }).catch(error => {
        console.error("Error loading compendium data:", error);
    });

        Hooks.on("midi-qol.prePreambleComplete", async (workflow) => {
            await socket.executeAsGM("counterspell");
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
    }
})

Hooks.on("createCombatant", async (combatant, options, userId) => {
    let combat = game.combat;
    if (combat && combat.started) {
        await enableOpportunityAttack(combatant, "enterCombat");
    }
});

Hooks.on('deleteCombat', async (combat) => {
    await disableOpportunityAttack(combat, "endCombat");
});

Hooks.on("deleteCombatant", async (combatant, options, userId) => {
    let combat = game.combat;
    if (combat && combat.started) {
        await disableOpportunityAttack(combatant, "exitCombat");
    }
});