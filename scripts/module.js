import { counterspell, showCounterspellDialog } from './macros/counterspell.js';
import { silveryBarbs, showSilveryBarbsDialog } from './macros/silveryBarbs.js';
import { cuttingWords, showCuttingWordsDialog } from './macros/cuttingWords.js';
import { interception, showInterceptionDialog } from './macros/interception.js';
//import { poetryInMisery, showPoetryInMiseryDialog } from './macros/poetryInMisery.js';
import { deleteChatMessage, gmIdentifyItem, closeDialogById, handleDialogPromises, rollAsUser, convertFromFeet, gmUpdateTemplateSize, findValidTokens } from './helpers.js';
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
    socket.register("closeDialogById", closeDialogById);
    socket.register("handleDialogPromises", handleDialogPromises);
    socket.register("gmIdentifyItem", gmIdentifyItem);
    socket.register("rollAsUser", rollAsUser);
    socket.register("convertFromFeet", convertFromFeet);
    socket.register("gmUpdateTemplateSize", gmUpdateTemplateSize);
    socket.register("findValidTokens", findValidTokens);
    socket.register("interception", interception);
    socket.register("showInterceptionDialog", showInterceptionDialog);
    //socket.register("poetryInMisery", poetryInMisery);
    //socket.register("showPoetryInMiseryDialog", showPoetryInMiseryDialog);
})

Hooks.once('ready', async function() {
    loadCompendiumData().then(() => {
        game.modules.get('gambits-premades').medkitApi = medkitApi;
    }).catch(error => {
        console.error("Error loading compendium data:", error);
    });

    game.gps = {
        gmIdentifyItem,
        convertFromFeet,
        gmUpdateTemplateSize,
        socket
    };

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
        if (game.settings.get('gambits-premades', 'Enable Cutting Words') === true) await executeWorkflow({ workflowItem: "cuttingWords", workflowData: workflowItemUuid, workflowType: "attack" });
        
    });

    /*Hooks.on("midi-qol.postAttackRollComplete", async (workflow) => {
        let workflowItemUuid = workflow.itemUuid;
        if (game.settings.get('gambits-premades', 'Enable Poetry In Misery') === true) await executeWorkflow({ workflowItem: "poetryInMisery", workflowData: workflowItemUuid, workflowType: "attack" });
    });*/

    Hooks.on("midi-qol.preSavesComplete", async (workflow) => {
        let workflowItemUuid = workflow.itemUuid;
        if (game.settings.get('gambits-premades', 'Enable Silvery Barbs') === true) await executeWorkflow({ workflowItem: "silveryBarbs", workflowData: workflowItemUuid, workflowType: "save" });
    });

    Hooks.on("preUpdateItem", (item, update) => {
        if (!game.user.isGM && ("identified" in (update.system ?? {})) && game.settings.get('gambits-premades', 'Enable Identify Restrictions') === true) {
            console.log(item, update)
            ui.notifications.error(`${game.settings.get('gambits-premades', 'Identify Restriction Message')}`);
            return false;
        }
      });

    Hooks.on("midi-qol.preDamageRollComplete", async (workflow) => {
        let workflowItemUuid = workflow.itemUuid;
        if (game.settings.get('gambits-premades', 'Enable Cutting Words') === true) await executeWorkflow({ workflowItem: "cuttingWords", workflowData: workflowItemUuid, workflowType: "damage" });
        if (game.settings.get('gambits-premades', 'Enable Interception') === true) await executeWorkflow({ workflowItem: "interception", workflowData: workflowItemUuid, workflowType: "damage" });
    });

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