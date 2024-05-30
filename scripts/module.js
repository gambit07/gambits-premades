import { counterspell, showCounterspellDialog } from './macros/counterspell.js';
import { silveryBarbs, showSilveryBarbsDialog } from './macros/silveryBarbs.js';
import { cuttingWords, showCuttingWordsDialog } from './macros/cuttingWords.js';
import { interception, showInterceptionDialog } from './macros/interception.js';
import { poetryInMisery, showPoetryInMiseryDialog } from './macros/poetryInMisery.js';
import { protection, showProtectionDialog } from './macros/protection.js';
import { indomitable, showIndomitableDialog } from './macros/indomitable.js';
import { sentinel, showSentinelDialog } from './macros/sentinel.js';
import { riposte, showRiposteDialog } from './macros/riposte.js';
import { witchesHex, showWitchesHexDialog } from './macros/witchesHex.js';
import { enableOpportunityAttack, disableOpportunityAttack } from './macros/opportunityAttack.js';
import { deleteChatMessage, gmIdentifyItem, closeDialogById, handleDialogPromises, rollAsUser, convertFromFeet, gmUpdateTemplateSize, findValidTokens, chooseUseItemUser, pauseDialogById, freeSpellUse } from './helpers.js';
export let socket;

Hooks.once('init', async function() {
    registerSettings();
    game.gpsSettings = game.gpsSettings || {};
    await updateSettings();
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
    socket.register("poetryInMisery", poetryInMisery);
    socket.register("showPoetryInMiseryDialog", showPoetryInMiseryDialog);
    socket.register("chooseUseItemUser", chooseUseItemUser);
    socket.register("enableOpportunityAttack", enableOpportunityAttack);
    socket.register("disableOpportunityAttack", disableOpportunityAttack);
    socket.register("protection", protection);
    socket.register("showProtectionDialog", showProtectionDialog);
    socket.register("indomitable", indomitable);
    socket.register("showIndomitableDialog", showIndomitableDialog);
    socket.register("sentinel", sentinel);
    socket.register("showSentinelDialog", showSentinelDialog);
    socket.register("pauseDialogById", pauseDialogById);
    socket.register("riposte", riposte);
    socket.register("showRiposteDialog", showRiposteDialog);
    socket.register("witchesHex", witchesHex);
    socket.register("showWitchesHexDialog", showWitchesHexDialog);
    socket.register("freeSpellUse", freeSpellUse);
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
        freeSpellUse,
        socket
    };

    async function executeWorkflow({ workflowItem, workflowData, workflowType, workflowCombat }) {
        if (game.user.isGM) {
            await socket.executeAsGM( workflowItem, { workflowData: workflowData, workflowType: workflowType, workflowCombat: workflowCombat });
        } else {
            await socket.executeAsUser( workflowItem, game.user.id, { workflowData: workflowData, workflowType: workflowType, workflowCombat: workflowCombat });
        }
    }

    Hooks.on("midi-qol.prePreambleComplete", async (workflow) => {
        let workflowItemUuid = workflow.itemUuid;
        if (game.gpsSettings.counterspellEnabled) await executeWorkflow({ workflowItem: "counterspell", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
    });

    Hooks.on("midi-qol.preCheckHits", async (workflow) => {
        let workflowItemUuid = workflow.itemUuid;
        if (game.gpsSettings.silveryBarbsEnabled) await executeWorkflow({ workflowItem: "silveryBarbs", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
        if (game.gpsSettings.cuttingWordsEnabled) await executeWorkflow({ workflowItem: "cuttingWords", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
        if (game.gpsSettings.enableWitchesHex) await executeWorkflow({ workflowItem: "witchesHex", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
    });

    Hooks.on("midi-qol.preAttackRoll", async (workflow) => {
        let workflowItemUuid = workflow.itemUuid;
        if (game.gpsSettings.protectionEnabled && !enableProtectionOnSuccess) await executeWorkflow({ workflowItem: "protection", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
    });

    Hooks.on("midi-qol.preAttackRollComplete", async (workflow) => {
        let workflowItemUuid = workflow.itemUuid;
        if (game.gpsSettings.sentinelEnabled) await executeWorkflow({ workflowItem: "sentinel", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
        if (game.gpsSettings.protectionEnabled && enableProtectionOnSuccess) await executeWorkflow({ workflowItem: "protection", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
    });

    Hooks.on("midi-qol.postAttackRollComplete", async (workflow) => {
        let workflowItemUuid = workflow.itemUuid;
        if (game.gpsSettings.poetryInMiseryEnabled) await executeWorkflow({ workflowItem: "poetryInMisery", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
        if (game.gpsSettings.riposteEnabled) await executeWorkflow({ workflowItem: "riposte", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
    });

    Hooks.on("midi-qol.preSavesComplete", async (workflow) => {
        let workflowItemUuid = workflow.itemUuid;
        if (game.gpsSettings.silveryBarbsEnabled) await executeWorkflow({ workflowItem: "silveryBarbs", workflowData: workflowItemUuid, workflowType: "save", workflowCombat: true });
        if (game.gpsSettings.indomitableEnabled) await executeWorkflow({ workflowItem: "indomitable", workflowData: workflowItemUuid, workflowType: "save", workflowCombat: true });
        if (game.gpsSettings.enableWitchesHex) await executeWorkflow({ workflowItem: "witchesHex", workflowData: workflowItemUuid, workflowType: "save", workflowCombat: true });
    });

    Hooks.on("midi-qol.postSavesComplete", async (workflow) => {
        let workflowItemUuid = workflow.itemUuid;
        if (game.gpsSettings.poetryInMiseryEnabled) await executeWorkflow({ workflowItem: "poetryInMisery", workflowData: workflowItemUuid, workflowType: "save", workflowCombat: true });
    });

    Hooks.on("preUpdateItem", (item, update) => {
        if (!game.user.isGM && ("identified" in (update.system ?? {})) && game.gpsSettings.identifyRestrictionEnabled) {
            ui.notifications.error(`${game.settings.get('gambits-premades', 'Identify Restriction Message')}`);
            return false;
        }
      });

    Hooks.on("midi-qol.preDamageRollComplete", async (workflow) => {
        let workflowItemUuid = workflow.itemUuid;
        if (game.gpsSettings.cuttingWordsEnabled) await executeWorkflow({ workflowItem: "cuttingWords", workflowData: workflowItemUuid, workflowType: "damage", workflowCombat: true });
        if (game.gpsSettings.interceptionEnabled) await executeWorkflow({ workflowItem: "interception", workflowData: workflowItemUuid, workflowType: "damage", workflowCombat: true });
    });

    Hooks.on("dnd5e.rollAbilitySave", async (actor, roll, abilityId) => {
        if (game.gpsSettings.poetryInMiseryEnabled) await executeWorkflow({ workflowItem: "poetryInMisery", workflowData: { actor: actor, roll: roll, abilityId: abilityId }, workflowType: "save", workflowCombat: false });
    });

    Hooks.on("dnd5e.rollAbilityTest", async (actor, roll, abilityId) => {
        if (game.gpsSettings.poetryInMiseryEnabled) await executeWorkflow({ workflowItem: "poetryInMisery", workflowData: { actor: actor, roll: roll, abilityId: abilityId }, workflowType: "ability", workflowCombat: false });
    });

    Hooks.on("dnd5e.rollSkill", async (actor, roll, abilityId) => {
        if (game.gpsSettings.poetryInMiseryEnabled) await executeWorkflow({ workflowItem: "poetryInMisery", workflowData: { actor: actor, roll: roll, abilityId: abilityId }, workflowType: "skill", workflowCombat: false });
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
    await new Promise(resolve => setTimeout(resolve, 1000));
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

async function updateSettings(settingKey = null) {
    if (settingKey === null || settingKey === 'gambits-premades.Enable Counterspell') {
        game.gpsSettings.counterspellEnabled = game.settings.get('gambits-premades', 'Enable Counterspell');
    }
    if (settingKey === null || settingKey === 'gambits-premades.Enable Silvery Barbs') {
        game.gpsSettings.silveryBarbsEnabled = game.settings.get('gambits-premades', 'Enable Silvery Barbs');
    }
    if (settingKey === null || settingKey === 'gambits-premades.Enable Cutting Words') {
        game.gpsSettings.cuttingWordsEnabled = game.settings.get('gambits-premades', 'Enable Cutting Words');
    }
    if (settingKey === null || settingKey === 'gambits-premades.Enable Poetry in Misery') {
        game.gpsSettings.poetryInMiseryEnabled = game.settings.get('gambits-premades', 'Enable Poetry in Misery');
    }
    if (settingKey === null || settingKey === 'gambits-premades.Enable Interception') {
        game.gpsSettings.interceptionEnabled = game.settings.get('gambits-premades', 'Enable Interception');
    }
    if (settingKey === null || settingKey === 'gambits-premades.Enable Indomitable') {
        game.gpsSettings.indomitableEnabled = game.settings.get('gambits-premades', 'Enable Indomitable');
    }
    if (settingKey === null || settingKey === 'gambits-premades.Enable Protection') {
        game.gpsSettings.protectionEnabled = game.settings.get('gambits-premades', 'Enable Protection');
    }
    if (settingKey === null || settingKey === 'gambits-premades.enableProtectionOnSuccess') {
        game.gpsSettings.enableProtectionOnSuccess = game.settings.get('gambits-premades', 'enableProtectionOnSuccess');
    }
    if (settingKey === null || settingKey === 'gambits-premades.Enable Sentinel') {
        game.gpsSettings.sentinelEnabled = game.settings.get('gambits-premades', 'Enable Sentinel');
    }
    if (settingKey === null || settingKey === 'gambits-premades.Enable Riposte') {
        game.gpsSettings.riposteEnabled = game.settings.get('gambits-premades', 'Enable Riposte');
    }
    if (settingKey === null || settingKey === 'gambits-premades.Enable Witches Hex') {
        game.gpsSettings.enableWitchesHex = game.settings.get('gambits-premades', 'Enable Witches Hex');
    }
    if (settingKey === null || settingKey === 'gambits-premades.Enable Identify Restrictions') {
        game.gpsSettings.identifyRestrictionEnabled = game.settings.get('gambits-premades', 'Enable Identify Restrictions');
    }
}

Hooks.on('updateSetting', (setting) => {
    if (setting.key.startsWith('gambits-premades.')) {
        updateSettings(setting.key);
    }
});

/* Store initial positions
let initialPositions = new Map();

Hooks.on('canvasReady', (canvas) => {
    console.log('Canvas is ready. Setting up token movement tracking.');

    canvas.tokens.placeables.forEach(token => {
        initialPositions.set(token.id, {x: token.x, y: token.y});
    });

    canvas.stage.on('pointerdown', (event) => {
        let interactionData = canvas.mouseInteractionManager.interactionData;
        if (interactionData.origin) {
            let token = interactionData.origin;
            initialPositions.set(token.id, {x: token.x, y: token.y});
            console.log(`Token ${token.name} is moving from (${token.x}, ${token.y}).`);
        }
    });
});

Hooks.on('preUpdateToken', (token, updateData, options, userId) => {
    //if (updateData.x !== undefined || updateData.y !== undefined) {
        let startX = initialPositions.get(token.id).x;
        let startY = initialPositions.get(token.id).y;
        let endX = updateData.x !== undefined ? updateData.x : token.x;
        let endY = updateData.y !== undefined ? updateData.y : token.y;

        console.log(`Token ${token.name} is moving from (${startX}, ${startY}) to (${endX}, ${endY}).`);
    //}
});

Hooks.on('updateToken', (token, updateData, options, userId) => {
    initialPositions.set(token.id, {x: token.x, y: token.y});
});*/