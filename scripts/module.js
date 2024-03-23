import { counterspell, showCounterspellDialog } from './macros/counterspell.js';
import { silveryBarbs, showSilveryBarbsDialog } from './macros/silveryBarbs.js';
import { cuttingWords, showCuttingWordsDialog } from './macros/cuttingWords.js';
import { deleteChatMessage, gmIdentifyItem } from './helpers.js';
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
    socket.register("cuttingWords", cuttingWords);
    socket.register("showCuttingWordsDialog", showCuttingWordsDialog);
    socket.register("deleteChatMessage", deleteChatMessage);
})

Hooks.once('ready', async function() {
    loadCompendiumData().then(() => {
        game.modules.get('gambits-premades').medkitApi = medkitApi;
    }).catch(error => {
        console.error("Error loading compendium data:", error);
    });

    game.modules.get('gambits-premades').gmIdentifyItem = gmIdentifyItem;

    async function executeWorkflow({ workflowItem, workflowData, workflowType }) {
        if (game.user.isGM) {
            await socket.executeAsGM( workflowItem, { workflowData: workflowData, workflowType: workflowType });
        } else {
            await socket.executeAsUser( workflowItem, game.user.id, { workflowData: workflowData, workflowType: workflowType });
        }
    }

    Hooks.on("midi-qol.prePreambleComplete", async (workflow) => {
        let workflowItemUuid = workflow.itemUuid;
        if (game.settings.get('gambits-premades', 'Enable Counterspell') === true) await executeWorkflow({ workflowItem: "counterspell", workflowData: workflowItemUuid });
    });

    Hooks.on("midi-qol.preCheckHits", async (workflow) => {
        let workflowItemUuid = workflow.itemUuid;
        if (game.settings.get('gambits-premades', 'Enable Silvery Barbs') === true) await executeWorkflow({ workflowItem: "silveryBarbs", workflowData: workflowItemUuid, workflowType: "attack" });
        //if (game.settings.get('gambits-premades', 'Enable Cutting Words') === true) await executeWorkflow({ workflowItem: "cuttingWords", workflowData: workflowItemUuid, workflowType: "attack" });
    });

    Hooks.on("midi-qol.preSavesComplete", async (workflow) => {
        let workflowItemUuid = workflow.itemUuid;
        if (game.settings.get('gambits-premades', 'Enable Silvery Barbs') === true) await executeWorkflow({ workflowItem: "silveryBarbs", workflowData: workflowItemUuid, workflowType: "save" });
        //if (game.settings.get('gambits-premades', 'Enable Cutting Words') === true) await executeWorkflow({ workflowItem: "cuttingWords", workflowData: workflowItemUuid, workflowType: "save" });
    });

    Hooks.on("preUpdateItem", (item, update) => {
        if (!game.user.isGM && ("identified" in (update.system ?? {})) && game.settings.get('gambits-premades', 'Enable Identify Restrictions') === true) {
            ui.notifications.error(`${game.users.find(u=>u.isGM)?.name}: Nice try, DENIED ;)`);
            return false;
        }
      });

    /*Hooks.on("midi-qol.preDamageRollComplete", async (workflow) => {
        let workflowItemUuid = workflow.itemUuid;
        if (game.settings.get('gambits-premades', 'Enable Cutting Words') === true) await executeWorkflow({ workflowItem: "cuttingWords", workflowData: workflowItemUuid, workflowType: "damage" });
    });*/

    /*Hooks.on("dnd5e.rollAbilityTest", async (actor, roll, abilityId) => {
        if (game.settings.get('gambits-premades', 'Enable Cutting Words')) {
            await executeWorkflow({
                workflowItem: "cuttingWords",
                workflowData: {
                    actor: actor,
                    roll: roll,
                    abilityId: abilityId
                },
                workflowType: "ability"
            });
        }
    });*/
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
    if(combatStarted && !hasProcessedStart && game.settings.get('gambits-premades', 'Enable Opportunity Attack') === true) {
        await combat.setFlag('gambits-premades', `startProcessed-${combat.id}`, true);
        await enableOpportunityAttack(combat, "startCombat");
    }
})

Hooks.on("createCombatant", async (combatant, options, userId) => {
    if(!game.user.isGM) return;
    let combat = game.combat;
    if (combat && combat.started && game.settings.get('gambits-premades', 'Enable Opportunity Attack') === true) {
        await enableOpportunityAttack(combatant, "enterCombat");
    }
});

Hooks.on('deleteCombat', async (combat) => {
    if(!game.user.isGM) return;
    if(game.settings.get('gambits-premades', 'Enable Opportunity Attack') === true) await disableOpportunityAttack(combat, "endCombat");
});

Hooks.on("deleteCombatant", async (combatant, options, userId) => {
    if(!game.user.isGM) return;
    let combat = game.combat;
    if (combat && combat.started && game.settings.get('gambits-premades', 'Enable Opportunity Attack')) {
        await disableOpportunityAttack(combatant, "exitCombat");
    }
});