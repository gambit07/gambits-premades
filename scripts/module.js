import { counterspell, showCounterspellDialog } from './macros/counterspell.js';
import { silveryBarbs, showSilveryBarbsDialog } from './macros/silveryBarbs.js';
export let socket;

Hooks.once('init', async function() {
    registerSettings();
});

Hooks.once('socketlib.ready', async function() {
    socket = socketlib.registerModule('gambits-premades');
    socket.register("counterspell", counterspell);
    socket.register("showCounterspellDialog", showCounterspellDialog);
    socket.register("silveryBarbs", silveryBarbs);
    socket.register("showSilveryBarbsDialog", showSilveryBarbsDialog);
})

Hooks.once('ready', async function() {
    if(!game.user.isGM) return;
    loadCompendiumData().then(() => {
        game.modules.get('gambits-premades').medkitApi = medkitApi;
    }).catch(error => {
        console.error("Error loading compendium data:", error);
    });

    Hooks.on("midi-qol.prePreambleComplete", async (workflow) => {
        let workflowItemUuid = workflow.itemUuid;
        await socket.executeAsGM("counterspell", { workflowData: workflowItemUuid });
    });

    Hooks.on("midi-qol.preCheckHits", async (workflow) => {
        let workflowItemUuid = workflow.itemUuid;
        await socket.executeAsGM("silveryBarbs", { workflowData: workflowItemUuid, workflowType: "attack" });
    });

    Hooks.on("midi-qol.preSavesComplete", async (workflow) => {
        let workflowItemUuid = workflow.itemUuid;
        await socket.executeAsGM("silveryBarbs", { workflowData: workflowItemUuid, workflowType: "save" });
    });
});

Hooks.on("preUpdateCombat", (combat, update, options) => {
    if(!game.user.isGM) return;
    const startedPath = `gambits-premades.started`;
    const prevStarted = combat.started;
    foundry.utils.setProperty(options, startedPath, prevStarted);
})

Hooks.on("updateCombat", async (combat, update, options) => {
    if(!game.user.isGM) return;
    const combatStarted = combat.started && !foundry.utils.getProperty(options, `gambits-premades.started`);
    const hasProcessedStart = await combat.getFlag('gambits-premades', `startProcessed-${combat.id}`);
    if(combatStarted && !hasProcessedStart) {
        await combat.setFlag('gambits-premades', `startProcessed-${combat.id}`, true);
        await enableOpportunityAttack(combat, "startCombat");
    }
})

Hooks.on("createCombatant", async (combatant, options, userId) => {
    if(!game.user.isGM) return;
    let combat = game.combat;
    if (combat && combat.started) {
        await enableOpportunityAttack(combatant, "enterCombat");
    }
});

Hooks.on('deleteCombat', async (combat) => {
    if(!game.user.isGM) return;
    await disableOpportunityAttack(combat, "endCombat");
});

Hooks.on("deleteCombatant", async (combatant, options, userId) => {
    if(!game.user.isGM) return;
    let combat = game.combat;
    if (combat && combat.started) {
        await disableOpportunityAttack(combatant, "exitCombat");
    }
});