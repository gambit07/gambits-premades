import { counterspell } from './macros/counterspell.js';
import { silveryBarbs } from './macros/silveryBarbs.js';
import { cuttingWords } from './macros/cuttingWords.js';
import { interception } from './macros/interception.js';
import { poetryInMisery } from './macros/poetryInMisery.js';
import { protection } from './macros/protection.js';
import { indomitable } from './macros/indomitable.js';
import { sentinel } from './macros/sentinel.js';
import { riposte } from './macros/riposte.js';
import { witchesHex } from './macros/witchesHex.js';
import { powerWordRebound } from './macros/powerWordRebound.js';
import { cloudRune } from './macros/cloudRune.js';
import { blackTentacles } from './macros/blackTentacles.js';
import { cloudOfDaggers } from './macros/cloudOfDaggers.js';
import { caltrops } from './macros/caltrops.js';
import { caltropsFeyGlass } from './macros/caltropsFeyGlass.js';
import { ballBearings } from './macros/ballBearings.js';
import { runicShield } from './macros/runicShield.js';
import { mageSlayer } from './macros/mageSlayer.js';
import { instinctiveCharm } from './macros/instinctiveCharm.js';
import { rainOfCinders } from './macros/rainOfCinders.js';
import { enableOpportunityAttack, disableOpportunityAttack, opportunityAttackScenarios } from './macros/opportunityAttack.js';
import { deleteChatMessage, gmIdentifyItem, closeDialogById, handleDialogPromises, rollAsUser, convertFromFeet, gmUpdateTemplateSize, findValidTokens, pauseDialogById, freeSpellUse, process3rdPartyReactionDialog, moveTokenByCardinal, moveTokenByOriginPoint, addReaction, gmUpdateDisposition, gmToggleStatus } from './helpers.js';
export let socket;

Hooks.once('init', async function() {
    registerSettings();
    game.gpsSettings = game.gpsSettings || {};
    await updateSettings();

    libWrapper.register('gambits-premades', 'Token.prototype.testInsideRegion', function (wrapped, ...args) {
        const [region, position] = args;

        if (!this || !this.document) {
            return wrapped(...args);
        }
        
        const pointsToTest = [];
        const size = canvas.dimensions.size;
        const width = this.document.width;
        const height = this.document.height;
        const reduction = 5;
        
        const points = [
            { x: this.document.x + reduction, y: this.document.y + reduction, elevation: this.document.elevation },
            { x: this.document.x + (width * size) - reduction, y: this.document.y + reduction, elevation: this.document.elevation },
            { x: this.document.x + reduction, y: this.document.y + (height * size) - reduction, elevation: this.document.elevation },
            { x: this.document.x + (width * size) - reduction, y: this.document.y + (height * size) - reduction, elevation: this.document.elevation },
            { x: this.document.x + (width * size / 2), y: this.document.y + reduction, elevation: this.document.elevation },
            { x: this.document.x + (width * size / 2), y: this.document.y + (height * size) - reduction, elevation: this.document.elevation },
            { x: this.document.x + reduction, y: this.document.y + (height * size / 2), elevation: this.document.elevation },
            { x: this.document.x + (width * size) - reduction, y: this.document.y + (height * size / 2), elevation: this.document.elevation },
            { x: this.document.x + (width * size / 2), y: this.document.y + (height * size / 2), elevation: this.document.elevation }
        ];

        points.forEach(point => {
            pointsToTest.push(point);
        });

        const testResults = pointsToTest.map(point => {
            const result = region.testPoint(point, position?.elevation ?? this.document.elevation);
            return result;
        });

        const isInside = testResults.some(x => x);

        if (isInside) {
            const snappingMode = 0x3;
            const snappedPosition = canvas.grid.getSnappedPoint({ x: this.document.x, y: this.document.y }, { mode: snappingMode });
    
            const adjustedPoints = pointsToTest.map(point => {
                return {
                    x: snappedPosition.x,
                    y: snappedPosition.y,
                    elevation: point.elevation
                };
            });
    
            const finalResults = adjustedPoints.map(point => {
                return region.testPoint(point, position?.elevation ?? this.document.elevation);
            });
    
            const finalInside = finalResults.some(x => x);
    
            if (finalInside) {
                this.document.x = snappedPosition.x;
                this.document.y = snappedPosition.y;
            }
    
            return finalInside;
        }
    
        return wrapped(...args);
    }, 'MIXED');

    libWrapper.register('gambits-premades', 'Token.prototype.segmentizeRegionMovement', function (wrapped, ...args) {
        const [region, waypoints, options] = args;

        if (!this || !this.document) {
            return wrapped(...args);
        }
    
        const { teleport = false } = options || {};
        const samples = [];
        const size = canvas.dimensions.size;
        const width = this.document.width;
        const height = this.document.height;
        const reduction = 5;
    
        const points = [
            { x: reduction, y: reduction, elevation: this.document.elevation },
            { x: width * size - reduction, y: reduction, elevation: this.document.elevation },
            { x: reduction, y: height * size - reduction, elevation: this.document.elevation },
            { x: width * size - reduction, y: height * size - reduction, elevation: this.document.elevation },
            { x: width * size / 2, y: reduction, elevation: this.document.elevation },
            { x: width * size / 2, y: height * size - reduction, elevation: this.document.elevation },
            { x: reduction, y: height * size / 2, elevation: this.document.elevation },
            { x: width * size - reduction, y: height * size / 2, elevation: this.document.elevation }
        ];
    
        points.forEach(point => {
            samples.push(point);
        });
    
        const segments = region.segmentizeMovement(waypoints, samples, { teleport });
        if(segments) return segments;
        
        return wrapped(...args);
    }, 'MIXED');
});

Hooks.once('socketlib.ready', async function() {
    socket = socketlib.registerModule('gambits-premades');
    socket.register("counterspell", counterspell);
    socket.register("silveryBarbs", silveryBarbs);
    socket.register("cuttingWords", cuttingWords);
    socket.register("deleteChatMessage", deleteChatMessage);
    socket.register("closeDialogById", closeDialogById);
    socket.register("handleDialogPromises", handleDialogPromises);
    socket.register("gmIdentifyItem", gmIdentifyItem);
    socket.register("rollAsUser", rollAsUser);
    socket.register("convertFromFeet", convertFromFeet);
    socket.register("gmUpdateTemplateSize", gmUpdateTemplateSize);
    socket.register("findValidTokens", findValidTokens);
    socket.register("interception", interception);
    socket.register("poetryInMisery", poetryInMisery);
    socket.register("enableOpportunityAttack", enableOpportunityAttack);
    socket.register("disableOpportunityAttack", disableOpportunityAttack);
    socket.register("protection", protection);
    socket.register("indomitable", indomitable);
    socket.register("sentinel", sentinel);
    socket.register("pauseDialogById", pauseDialogById);
    socket.register("riposte", riposte);
    socket.register("witchesHex", witchesHex);
    socket.register("freeSpellUse", freeSpellUse);
    socket.register("powerWordRebound", powerWordRebound);
    socket.register("cloudRune", cloudRune);
    socket.register("process3rdPartyReactionDialog", process3rdPartyReactionDialog);
    socket.register("moveTokenByCardinal", moveTokenByCardinal);
    socket.register("moveTokenByOriginPoint", moveTokenByOriginPoint);
    socket.register("opportunityAttackScenarios", opportunityAttackScenarios);
	socket.register("addReaction", addReaction);
    socket.register("blackTentacles", blackTentacles);
    socket.register("cloudOfDaggers", cloudOfDaggers);
    socket.register("gmUpdateDisposition", gmUpdateDisposition);
    socket.register("gmToggleStatus", gmToggleStatus);
    socket.register("caltrops", caltrops);
    socket.register("caltropsFeyGlass", caltropsFeyGlass);
    socket.register("ballBearings", ballBearings);
    socket.register("runicShield", runicShield);
    socket.register("mageSlayer", mageSlayer);
    socket.register("instinctiveCharm", instinctiveCharm);
    socket.register("rainOfCinders", rainOfCinders);
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
        process3rdPartyReactionDialog,
        opportunityAttackScenarios,
        addReaction,
        blackTentacles,
        cloudOfDaggers,
        ballBearings,
        caltrops,
        caltropsFeyGlass,
        rainOfCinders,
        socket
    };

    setupTemplateVisibilityHook();
    setupTemplateCreationUpdateHooks();

    async function executeWorkflow({ workflowItem, workflowData, workflowType, workflowCombat }) {
        if(!game.gpsSettings.enable3prNoCombat && !game.combat && workflowCombat) return;

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
        if(!workflow.item.hasAttack) return;
        let workflowItemUuid = workflow.itemUuid;
        if (game.gpsSettings.silveryBarbsEnabled) await executeWorkflow({ workflowItem: "silveryBarbs", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
        if (game.gpsSettings.cuttingWordsEnabled) await executeWorkflow({ workflowItem: "cuttingWords", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
        if (game.gpsSettings.witchesHexEnabled) await executeWorkflow({ workflowItem: "witchesHex", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
    });

    Hooks.on("midi-qol.preAttackRoll", async (workflow) => {
        if(!workflow.item.hasAttack) return;
        let workflowItemUuid = workflow.itemUuid;
        if (game.gpsSettings.protectionEnabled && !game.gpsSettings.enableProtectionOnSuccess) await executeWorkflow({ workflowItem: "protection", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
        if (game.gpsSettings.instinctiveCharmEnabled) await executeWorkflow({ workflowItem: "instinctiveCharm", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
    });

    Hooks.on("midi-qol.preAttackRollComplete", async (workflow) => {
        if(!workflow.item.hasAttack) return;
        let workflowItemUuid = workflow.itemUuid;
        if (game.gpsSettings.sentinelEnabled) await executeWorkflow({ workflowItem: "sentinel", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
        if (game.gpsSettings.protectionEnabled && game.gpsSettings.enableProtectionOnSuccess) await executeWorkflow({ workflowItem: "protection", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
        if (game.gpsSettings.powerWordReboundEnabled) await executeWorkflow({ workflowItem: "powerWordRebound", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
        if (game.gpsSettings.cloudRuneEnabled) await executeWorkflow({ workflowItem: "cloudRune", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
        if (game.gpsSettings.runicShieldEnabled) await executeWorkflow({ workflowItem: "runicShield", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
        if (game.gpsSettings.rainOfCindersEnabled) await executeWorkflow({ workflowItem: "rainOfCinders", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
    });

    Hooks.on("midi-qol.postAttackRollComplete", async (workflow) => {
        if(!workflow.item.hasAttack) return;
        let workflowItemUuid = workflow.itemUuid;
        if (game.gpsSettings.poetryInMiseryEnabled) await executeWorkflow({ workflowItem: "poetryInMisery", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
        if (game.gpsSettings.riposteEnabled) await executeWorkflow({ workflowItem: "riposte", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
    });

    Hooks.on("midi-qol.preWaitForSaves", async (workflow) => {
        if(!workflow.item.hasSave) return;
        let workflowItemUuid = workflow.itemUuid;
        if (game.gpsSettings.mageSlayerEnabled) await executeWorkflow({ workflowItem: "mageSlayer", workflowData: workflowItemUuid, workflowType: "save", workflowCombat: true });
    });

    Hooks.on("midi-qol.preSavesComplete", async (workflow) => {
        if(!workflow.item.hasSave) return;
        let workflowItemUuid = workflow.itemUuid;
        if (game.gpsSettings.silveryBarbsEnabled) await executeWorkflow({ workflowItem: "silveryBarbs", workflowData: workflowItemUuid, workflowType: "save", workflowCombat: true });
        if (game.gpsSettings.indomitableEnabled) await executeWorkflow({ workflowItem: "indomitable", workflowData: workflowItemUuid, workflowType: "save", workflowCombat: true });
        if (game.gpsSettings.witchesHexEnabled) await executeWorkflow({ workflowItem: "witchesHex", workflowData: workflowItemUuid, workflowType: "save", workflowCombat: true });
    });

    Hooks.on("midi-qol.postSavesComplete", async (workflow) => {
        if(!workflow.item.hasSave) return;
        let workflowItemUuid = workflow.itemUuid;
        if (game.gpsSettings.poetryInMiseryEnabled) await executeWorkflow({ workflowItem: "poetryInMisery", workflowData: workflowItemUuid, workflowType: "save", workflowCombat: true });
    });

    Hooks.on("preUpdateItem", (item, update) => {
        if (!game.user.isGM && ("identified" in (update.system ?? {})) && game.gpsSettings.identifyRestrictionEnabled) {
            ui.notifications.error(`${game.gpsSettings.identifyRestrictionMessage}`);
            return false;
        }
      });

    Hooks.on("midi-qol.preDamageRollComplete", async (workflow) => {
        if(!workflow.item.hasDamage) return;
        let workflowItemUuid = workflow.itemUuid;
        if (game.gpsSettings.cuttingWordsEnabled) await executeWorkflow({ workflowItem: "cuttingWords", workflowData: workflowItemUuid, workflowType: "damage", workflowCombat: true });
        if (game.gpsSettings.interceptionEnabled) await executeWorkflow({ workflowItem: "interception", workflowData: workflowItemUuid, workflowType: "damage", workflowCombat: true });
    });

    Hooks.on("midi-qol.preCompleted", async (workflow) => {
        if (!workflow.item.type === "spell") return;
        let workflowItemUuid = workflow.itemUuid;
        if (game.gpsSettings.mageSlayerEnabled) await executeWorkflow({ workflowItem: "mageSlayer", workflowData: workflowItemUuid, workflowType: "spell", workflowCombat: true });
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
        game.gpsSettings.witchesHexEnabled = game.settings.get('gambits-premades', 'Enable Witches Hex');
    }
    if (settingKey === null || settingKey === 'gambits-premades.Enable Power Word Rebound') {
        game.gpsSettings.powerWordReboundEnabled = game.settings.get('gambits-premades', 'Enable Power Word Rebound');
    }
    if (settingKey === null || settingKey === 'gambits-premades.Enable Cloud Rune') {
        game.gpsSettings.cloudRuneEnabled = game.settings.get('gambits-premades', 'Enable Cloud Rune');
    }
    if (settingKey === null || settingKey === 'gambits-premades.Mirror 3rd Party Dialog for GMs') {
        game.gpsSettings.enableMirrorDialog = game.settings.get('gambits-premades', 'Mirror 3rd Party Dialog for GMs');
    }
    if (settingKey === null || settingKey === 'gambits-premades.enable3prNoCombat') {
        game.gpsSettings.enable3prNoCombat = game.settings.get('gambits-premades', 'enable3prNoCombat');
    }
    if (settingKey === null || settingKey === 'gambits-premades.enableTimerFullAnim') {
        game.gpsSettings.enableTimerFullAnim = game.settings.get('gambits-premades', 'enableTimerFullAnim');
    }
    if (settingKey === null || settingKey === 'gambits-premades.hideTemplates') {
        game.gpsSettings.hideTemplates = game.settings.get('gambits-premades', 'hideTemplates');
    }
    if (settingKey === null || settingKey === 'gambits-premades.debugEnabled') {
        game.gpsSettings.debugEnabled = game.settings.get('gambits-premades', 'debugEnabled');
    }
    if (settingKey === null || settingKey === 'gambits-premades.Enable Identify Restrictions') {
        game.gpsSettings.identifyRestrictionEnabled = game.settings.get('gambits-premades', 'Enable Identify Restrictions');
    }
    if (settingKey === null || settingKey === 'gambits-premades.Identify Restriction Message') {
        game.gpsSettings.identifyRestrictionMessage = game.settings.get('gambits-premades', 'Identify Restriction Message');
    }
    if (settingKey === null || settingKey === 'gambits-premades.enableRunicShield') {
        game.gpsSettings.runicShieldEnabled = game.settings.get('gambits-premades', 'enableRunicShield');
    }
    if (settingKey === null || settingKey === 'gambits-premades.enableMageSlayer') {
        game.gpsSettings.mageSlayerEnabled = game.settings.get('gambits-premades', 'enableMageSlayer');
    }
    if (settingKey === null || settingKey === 'gambits-premades.enableInstinctiveCharm') {
        game.gpsSettings.instinctiveCharmEnabled = game.settings.get('gambits-premades', 'enableInstinctiveCharm');
    }
    if (settingKey === null || settingKey === 'gambits-premades.enableRainOfCinders') {
        game.gpsSettings.rainOfCindersEnabled = game.settings.get('gambits-premades', 'enableRainOfCinders');
    }
}

Hooks.on('updateSetting', (setting) => {
    if (setting.key.startsWith('gambits-premades.')) {
        updateSettings(setting.key);
    }
});

function hideTemplateElements(template) {
  if (!template) return;

  // Check if we're on the template layer, in which case I still want template visibility
  if(canvas?.activeLayer?.constructor?.name === "TemplateLayer") return;

  // Hide primary template
  if (template.template) {
    template.template.alpha = 0;
  }

  // Hide highlight
  const hl = canvas.interface.grid.getHighlightLayer(template.highlightId);
  if (hl) {
    hl.alpha = 0;
  }

  // Hide border
  if (template.ruler) {
    template.ruler.visible = false;
  }

  //Reduce unneeded (I think?) refresh activity
  template.hitArea = null;
}

// Make sure we re-apply invisibility, may need more stuff here?
function setupTemplateVisibilityHook() {
  Hooks.on('refreshMeasuredTemplate', (template) => {
    if (game.gpsSettings.hideTemplates || template.document.getFlag('gambits-premades', 'templateHiddenOA')) {
      hideTemplateElements(template);
    }
  });

  canvas.templates.placeables.forEach(template => {
    if(!game.user.isGM) return;
    if (game.gpsSettings.hideTemplates || template.document.getFlag('gambits-premades', 'templateHiddenOA')) {
      hideTemplateElements(template);
    }
  });
}

// Hide templates on creation or update, we may need more stuff here?
function setupTemplateCreationUpdateHooks() {
    Hooks.on('createMeasuredTemplate', (templateDocument) => {
        const template = canvas.templates.get(templateDocument.id);
        if (template && (game.gpsSettings.hideTemplates || templateDocument.getFlag('gambits-premades', 'templateHiddenOA'))) {
        hideTemplateElements(template);
        }
    });

    Hooks.on('updateMeasuredTemplate', (templateDocument) => {
        const template = canvas.templates.get(templateDocument.id);
        if (template && (game.gpsSettings.hideTemplates || templateDocument.getFlag('gambits-premades', 'templateHiddenOA'))) {
        hideTemplateElements(template);
        }
    });
    }

async function updateRegionPosition(region, tokenDocument) {
    if (!game.user.isGM) return;
    if (!region || !tokenDocument) return;

    let regionDisabled = region.getFlag("gambits-premades", "regionDisabled");
    if (!regionDisabled) region.setFlag("gambits-premades", "regionDisabled", true);

    let previousX1 = tokenDocument.object.center.x;
    let previousY1 = tokenDocument.object.center.y;
    let previousX2, previousY2;

    const checkPosition = () => {
        const currentX = tokenDocument.object.center.x;
        const currentY = tokenDocument.object.center.y;

        if (currentX !== previousX1 || currentY !== previousY1) {
            previousX2 = previousX1;
            previousY2 = previousY1;
            previousX1 = currentX;
            previousY1 = currentY;

            setTimeout(checkPosition, 25);
        } else if (previousX1 === previousX2 && previousY1 === previousY2) {
            const updatedShapes = region.shapes.map(shape => {
                const sideLength = shape.width || (shape.radiusX * 2);
                const topLeftX = currentX - (sideLength / 2);
                const topLeftY = currentY - (sideLength / 2);

                if (shape.type === "ellipse") {
                    return {
                        ...shape,
                        x: currentX,
                        y: currentY
                    };
                } else if(shape.type === "rectangle") {
                    return {
                        ...shape,
                        x: topLeftX,
                        y: topLeftY
                    };
                } else {
                    return {
                        ...shape,
                        x: currentX,
                        y: currentY
                    };
                }
            });

            region.update({
                shapes: updatedShapes
            });

            if (!regionDisabled) region.unsetFlag("gambits-premades", "regionDisabled");
            return;
        } else {
            previousX2 = previousX1;
            previousY2 = previousY1;
            setTimeout(checkPosition, 100);
        }
    };

    checkPosition();
}

Hooks.on('updateToken', async (tokenDocument, updateData, options, userId) => {
    if (!game.user.isGM) return;

    const regions = tokenDocument.actor.getFlag('gambits-premades', 'attachedRegions') || [];

    for (const regionUuid of regions) {
        const region = fromUuidSync(regionUuid);
        if (region) {
            await updateRegionPosition(region, tokenDocument);
        }
    }
});