import { registerWickerboneHooks } from "../automations/3rdPartyClassFeatures/druid/wickerboneBehemoth.js";
import { registerFuryOfTheSmallHooks } from "../automations/raceFeatures/furyOfTheSmall.js";
import { executeWorkflow, updateSettings, daeAddFlags, arcaneShotValidActivities } from "./hookUtils.js";
import { expireCombatEffects } from "./effectUtils.js";
import { getRegionVisibility } from "./regionUtils.js";
import {isAttackForcedMiss, registerAttackOutcomeHandling} from "./attackOutcomeUtils.js";

import { checkEnervationMovement, checkEnervationWalls } from "../automations/spells/enervation.js";

export function registerHooks() {
    registerWickerboneHooks();
    registerFuryOfTheSmallHooks();
    registerAttackOutcomeHandling();
    Hooks.on("moveToken", document => checkEnervationMovement(document));
    Hooks.on("deleteToken", document => checkEnervationMovement(document, {deleted: true}));
    Hooks.on("createWall", checkEnervationWalls);
    Hooks.on("updateWall", checkEnervationWalls);
    Hooks.on("deleteWall", checkEnervationWalls);
    Hooks.on("deleteRegion", region => game.gps.cleanupRegionStatuses(region));
    Hooks.on("dnd5e.renderChatMessage", (message, element) => game.gps.renderChatResults(message, element));

    Hooks.on("dnd5e.preUseActivity", (activity, usage) => {
        if (usage.midiOptions?.workflowOptions?.gps?.opportunityAttack && usage.workflow) usage.workflow.AoO = true;
    });

    Hooks.on("preMoveToken", async (token, movement) => {
        if(game.gps.disableRegionTeleport || !game.gpsSettings.magicUsersNemesisEnabled) return;
        const action = movement.passed.waypoints.at(-1)?.action;
        if(!CONFIG.Token.movement.actions[action]?.teleport) return;

        const originX = token._source.x;
        const originY = token._source.y;
        let tokenObject = await MidiQOL.tokenForActor(token.actor);
        if (game.gpsSettings.magicUsersNemesisEnabled) await executeWorkflow({ workflowItem: "magicUsersNemesis", workflowData: { token: tokenObject, tokenOriginX: originX, tokenOriginY: originY }, workflowType: "teleport", workflowCombat: true });
    });

    Hooks.on("midi-qol.preItemRollV2", async ({workflow, usage, dialog, message}) => {
        if (!((workflow.item.type === "spell" && workflow.activity?.description?.chatFlavor?.includes("gpsFreeSpellUse")) || (workflow.item?.identifier === "guiding-bolt" && workflow.actor.items.some(i => i.flags["gambits-premades"]?.gpsUuid === "62cd752b-7c9c-42ff-9e73-cd7b707aad66")) || (workflow.item.identifier === "identify" && workflow.item.flags["gambits-premades"]?.gpsUuid === "2cc1f50d-cdb8-4f17-a532-2532f74440ae"))) return;
        let freeSpellUsed;

        if(workflow.item.identifier === "guiding-bolt") {
            let item = workflow.actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === "62cd752b-7c9c-42ff-9e73-cd7b707aad66");
            freeSpellUsed = await game.gps.starMap({ item });

            if(freeSpellUsed) {
                dialog.configure = false;
                usage.consume = usage.consume || {};
                usage.consume.spellSlot = false;
            }
        }
        else if(workflow.item.identifier === "identify") {
            await game.gps.identify({ item: workflow.item, actor: workflow.actor, workflow, dialog, usage });
        }
        else {
            freeSpellUsed = await game.gps.freeSpellUse({item: workflow.item, actor: workflow.actor, activity: workflow.activity});
            if(freeSpellUsed) {
                dialog.configure = false;
                usage.consume = usage.consume || {};
                usage.consume.spellSlot = false;
            }
            else {
                usage.consume = usage.consume || {};
                usage.consume.resources = false;
            }
        }
    });

    Hooks.on("midi-qol.prePreambleComplete", async (workflow) => {
        let workflowItemUuid = workflow.itemCardUuid;
        let workflowType = (workflow.saveActivity || workflow.activity?.type === "save") ? "save" : (workflow.activity?.hasAttack) ? "attack" : "item";
        if (game.gpsSettings.counterspellEnabled && workflow.item.type === "spell") await executeWorkflow({ workflowItem: "counterspell", workflowData: workflowItemUuid, workflowType: workflowType, workflowCombat: true });
        if (game.gpsSettings.counterspellEnabled && workflow?.item?.type === "spell") await executeWorkflow({ workflowItem: "counterspell2024", workflowData: workflowItemUuid, workflowType: workflowType, workflowCombat: true });
        if (game.gpsSettings.temporalShuntEnabled && (workflow.item.type === "spell" || workflow.activity.hasAttack)) await executeWorkflow({ workflowItem: "temporalShunt", workflowData: workflowItemUuid, workflowType: workflowType, workflowCombat: true });
        if (game.gpsSettings.magicUsersNemesisEnabled && workflow.item.type === "spell") await executeWorkflow({ workflowItem: "magicUsersNemesis", workflowData: workflowItemUuid, workflowType: workflowType, workflowCombat: true });
        if (game.gpsSettings.dreadCounterspellEnabled && workflow.item.type === "spell") await executeWorkflow({ workflowItem: "dreadCounterspell", workflowData: workflowItemUuid, workflowType: workflowType, workflowCombat: true });
    });

    Hooks.on("midi-qol.preCheckHits", async (workflow) => {
        if(!workflow.activity.hasAttack) return;
        if(isAttackForcedMiss(workflow) || (workflow.targets.size > 0 && [...workflow.targets].every(target => isAttackForcedMiss(workflow, target)))) return;
        let workflowItemUuid = workflow.itemCardUuid;
        if (game.gpsSettings.silveryBarbsEnabled) await executeWorkflow({ workflowItem: "silveryBarbs", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
        if (game.gpsSettings.cuttingWordsEnabled) await executeWorkflow({ workflowItem: "cuttingWords", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
        if (game.gpsSettings.witchesHexEnabled) await executeWorkflow({ workflowItem: "witchesHex", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
        if (game.gpsSettings.chronalShiftEnabled) await executeWorkflow({ workflowItem: "chronalShift", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
    });

    Hooks.on("midi-qol.preAttackRollConfig", async (workflow) => {
        if(!workflow.activity.hasAttack) return;
        let workflowItemUuid = workflow.itemCardUuid;
        if (game.gpsSettings.protectionEnabled && !game.gpsSettings.enableProtectionOnSuccess) await executeWorkflow({ workflowItem: "protection", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
        if (game.gpsSettings.instinctiveCharmEnabled) await executeWorkflow({ workflowItem: "instinctiveCharm", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
    });

    Hooks.on("midi-qol.preAttackRollComplete", async (workflow) => {
        if(!workflow.activity.hasAttack) return;
        let workflowItemUuid = workflow.itemCardUuid;
        //if (game.gpsSettings.calculatedFlourishEnabled) await executeWorkflow({ workflowItem: "calculatedFlourish", workflowData: workflowItemUuid, workflowType: "preAttack", workflowCombat: true });
        if (game.gpsSettings.restoreBalanceEnabled) await executeWorkflow({ workflowItem: "restoreBalance", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
        if (game.gpsSettings.protectionEnabled && game.gpsSettings.enableProtectionOnSuccess) await executeWorkflow({ workflowItem: "protection", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
        if (game.gpsSettings.powerWordReboundEnabled) await executeWorkflow({ workflowItem: "powerWordRebound", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
        if (game.gpsSettings.rainOfCindersEnabled) await executeWorkflow({ workflowItem: "rainOfCinders", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
    });

    Hooks.on("midi-qol.postAttackRollComplete", async (workflow) => {
        if(!workflow.activity.hasAttack) return;
        let workflowItemUuid = workflow.itemCardUuid;
        if (game.gpsSettings.poetryInMiseryEnabled) await executeWorkflow({ workflowItem: "poetryInMisery", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
        if (game.gpsSettings.riposteEnabled) await executeWorkflow({ workflowItem: "riposte", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
        //if (game.gpsSettings.calculatedFlourishEnabled) await executeWorkflow({ workflowItem: "calculatedFlourish", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
        if (game.gpsSettings.taleOfHubrisEnabled) await executeWorkflow({ workflowItem: "taleOfHubris", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
    });

    Hooks.on("midi-qol.preWaitForSaves", async (workflow) => {
        if(!workflow.saveActivity) return;
        let workflowItemUuid = workflow.itemCardUuid;
        if (game.gpsSettings.mageSlayerEnabled) await executeWorkflow({ workflowItem: "mageSlayer", workflowData: workflowItemUuid, workflowType: "save", workflowCombat: true });
    });

    Hooks.on("midi-qol.preSavesComplete", async (workflow) => {
        if(!workflow.saveActivity) return;
        let workflowItemUuid = workflow.itemCardUuid;
        const hasDrafynsBaneOfExcellence = Array.from(workflow.saves).some(t => t.document.actor.appliedEffects.some(e => e.flags["gambits-premades"]?.gpsUuid === "e6e24759-a9d3-4993-b0f2-6328010a6520"));
        if (hasDrafynsBaneOfExcellence) await executeWorkflow({ workflowItem: "drafynsBaneOfExcellence", workflowData: workflowItemUuid, workflowType: "save", workflowCombat: true });
        if (game.gpsSettings.restoreBalanceEnabled) await executeWorkflow({ workflowItem: "restoreBalance", workflowData: workflowItemUuid, workflowType: "save", workflowCombat: true });
        if (game.gpsSettings.flashOfGeniusEnabled) await executeWorkflow({ workflowItem: "flashOfGenius", workflowData: workflowItemUuid, workflowType: "save", workflowCombat: true });
        if (game.gpsSettings.silveryBarbsEnabled) await executeWorkflow({ workflowItem: "silveryBarbs", workflowData: workflowItemUuid, workflowType: "save", workflowCombat: true });
        if (game.gpsSettings.mageSlayerEnabled) await executeWorkflow({ workflowItem: "mageSlayer2024", workflowData: workflowItemUuid, workflowType: "save", workflowCombat: true });
        if (game.gpsSettings.indomitableEnabled) await executeWorkflow({ workflowItem: "indomitable", workflowData: workflowItemUuid, workflowType: "save", workflowCombat: true });
        if (game.gpsSettings.indomitableEnabled) await executeWorkflow({ workflowItem: "indomitable2024", workflowData: workflowItemUuid, workflowType: "save", workflowCombat: true });
        if (game.gpsSettings.witchesHexEnabled) await executeWorkflow({ workflowItem: "witchesHex", workflowData: workflowItemUuid, workflowType: "save", workflowCombat: true });
        if (game.gpsSettings.legendaryResistanceEnabled) await executeWorkflow({ workflowItem: "legendaryResistance", workflowData: workflowItemUuid, workflowType: "save", workflowCombat: true });
        if (game.gpsSettings.burstOfIngenuityEnabled) await executeWorkflow({ workflowItem: "burstOfIngenuity", workflowData: workflowItemUuid, workflowType: "save", workflowCombat: true });
        if (game.gpsSettings.chronalShiftEnabled) await executeWorkflow({ workflowItem: "chronalShift", workflowData: workflowItemUuid, workflowType: "save", workflowCombat: true });
    });

    Hooks.on("midi-qol.postSavesComplete", async (workflow) => {
        if(!workflow.saveActivity) return;
        let workflowItemUuid = workflow.itemCardUuid;
        if (game.gpsSettings.restoreBalanceEnabled) await executeWorkflow({ workflowItem: "restoreBalance", workflowData: workflowItemUuid, workflowType: "savePost", workflowCombat: true });
        if (game.gpsSettings.poetryInMiseryEnabled) await executeWorkflow({ workflowItem: "poetryInMisery", workflowData: workflowItemUuid, workflowType: "save", workflowCombat: true });
    });

    Hooks.on("midi-qol.preDamageRollComplete", async (workflow) => {
        if(!workflow.activity.hasDamage) return;
        let workflowItemUuid = workflow.itemCardUuid;
        if (game.gpsSettings.cuttingWordsEnabled) await executeWorkflow({ workflowItem: "cuttingWords", workflowData: workflowItemUuid, workflowType: "damage", workflowCombat: true });
        if (game.gpsSettings.interceptionEnabled) await executeWorkflow({ workflowItem: "interception", workflowData: workflowItemUuid, workflowType: "damage", workflowCombat: true });
    });

    Hooks.on("midi-qol.preCompleted", async (workflow) => {
        let workflowItemUuid = workflow.itemCardUuid;
        if (game.gpsSettings.mageSlayerEnabled && workflow.item.type === "spell") await executeWorkflow({ workflowItem: "mageSlayer", workflowData: workflowItemUuid, workflowType: "spell", workflowCombat: true });
        if (game.gpsSettings.sentinelEnabled && workflow.activity.type === "attack") await executeWorkflow({ workflowItem: "sentinel", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
        if (game.gpsSettings.sentinelEnabled && workflow.activity.type === "attack") await executeWorkflow({ workflowItem: "sentinel2024", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
    });

    Hooks.on("dnd5e.rollSavingThrow", async (rolls, data) => {
        let actor = data.subject;
        let abilityId = data.ability;
        if (game.gpsSettings.poetryInMiseryEnabled) await executeWorkflow({ workflowItem: "poetryInMisery", workflowData: { actor: actor, roll: rolls[0], abilityId: abilityId }, workflowType: "save", workflowCombat: false });
    });

    Hooks.on("dnd5e.rollAbilityCheck", async (rolls, data) => {
        let actor = data.subject;
        let abilityId = data.ability;
        if (game.gpsSettings.poetryInMiseryEnabled) await executeWorkflow({ workflowItem: "poetryInMisery", workflowData: { actor: actor, roll: rolls[0], abilityId: abilityId }, workflowType: "ability", workflowCombat: false });
    });

    Hooks.on("dnd5e.rollSkill", async (rolls, data) => {
        let actor = data.subject;
        let abilityId = data.skill;
        if (game.gpsSettings.poetryInMiseryEnabled) await executeWorkflow({ workflowItem: "poetryInMisery", workflowData: { actor: actor, roll: rolls[0], abilityId: abilityId }, workflowType: "skill", workflowCombat: false });
    });

    Hooks.on("preUpdateCombat", (combat, update, options) => {
        if (game.user.id !== game.gps.getPrimaryGM()) return;
        const startedPath = `gambits-premades.started`;
        const prevStarted = combat.started;
        foundry.utils.setProperty(options, startedPath, prevStarted);
    });
    
    Hooks.on("combatTurnChange", combat => game.gps.syncOpportunityAttackRegions(combat));

    Hooks.on("updateCombat", async (combat, update, options) => {
        if(game.user.id !== game.gps.getPrimaryGM()) return;
        const combatStarted = combat.started && !foundry.utils.getProperty(options, `gambits-premades.started`);
        const hasProcessedStart = await combat.getFlag('gambits-premades', `startProcessed-${combat.id}`);
        if(combatStarted && !hasProcessedStart && game.gpsSettings.opportunityAttackEnabled) {
            await combat.setFlag('gambits-premades', `startProcessed-${combat.id}`, true);
            await game.gps.enableOpportunityAttack(combat, "startCombat");
        }
    });
    
    Hooks.on("createCombatant", async (combatant, options, userId) => {
        if(game.user.id !== game.gps.getPrimaryGM()) return;
        const combat = combatant.parent;
        if (combat && combat.started && game.gpsSettings.opportunityAttackEnabled) {
            await game.gps.enableOpportunityAttack(combatant, "enterCombat");
        }
    });
    
    Hooks.on('deleteCombat', async (combat) => {
        if(game.user.id !== game.gps.getPrimaryGM()) return;
        await expireCombatEffects(combat);
        await game.gps.disableOpportunityAttack(combat, "endCombat");
    });
    
    Hooks.on("deleteCombatant", async (combatant, options, userId) => {
        if(game.user.id !== game.gps.getPrimaryGM()) return;
        const combat = combatant.parent;
        if (combat && combat.started) {
            await game.gps.disableOpportunityAttack(combatant, "exitCombat");
        }
    });

    Hooks.on("dnd5e.createMeasuredTemplate", (activity, regions) => {
        if (!activity.item?.getFlag("gambits-premades", "gpsUuid") && !activity.item?.getFlag("gambits-premades", "regionBehaviors") && !activity.item?.getFlag("midi-qol", "onUseMacroName")?.includes("function.game.gps.")) return;
        const visibility = getRegionVisibility(activity.item);
        for (const region of regions) {
            foundry.utils.setProperty(region, "flags.gambits-premades.area", true);
            region.visibility = visibility;
        }
    });

    Hooks.on("createRegion", region => {
        if (game.user.id === game.gps.getPrimaryGM()) {
            void game.gps.prepareRegion({ regionUuid: region.uuid }).catch(error => console.error("Gambit's Premades | Region preparation failed", error));
        }
    });

    Hooks.on("midi-qol.preTemplatePlaced", workflow => game.gps.prepareWorkflowRegions(workflow));

    Hooks.on("canvasReady", () => game.gps.syncOpportunityAttackRegions());

    Hooks.on('updateSetting', (setting) => {
        if (setting.config?.namespace === "gambits-premades") {
            updateSettings(setting.config.key);
        }
    });

    Hooks.on("midi-qol.itemUseActivitySelect", async (itemData) => {
        const item = itemData.item;
        const actor = itemData.item.parent;
        await arcaneShotValidActivities({item, actor});
    });

    Hooks.on('dae.setFieldData', daeAddFlags);

    const syncCloak = effect => {
        if(game.user.id !== game.gps.getPrimaryGM() || effect.target?.documentName !== "Actor") return;
        if(effect.flags?.["gambits-premades"]?.cloakOfDisplacement || effect.system?.changes?.some(change => change.value?.includes?.("function.game.gps.cloakOfDisplacement"))) return;
        return game.gps.cloakOfDisplacement({actor: effect.target, args: "effectState"});
    };
    Hooks.on("createActiveEffect", syncCloak);
    Hooks.on("updateActiveEffect", syncCloak);
    Hooks.on("deleteActiveEffect", syncCloak);

    Hooks.on('updateActor', async (actor, diff, options, userID) => {
        if(game.user.id !== game.gps.getPrimaryGM()) return;
        if(foundry.utils.hasProperty(diff, "system.attributes.hp.value")) await game.gps.wound({actor, args: "woundRemovalFullHeal", options: diff});
        if (!foundry.utils.hasProperty(diff, 'system.attributes.hp.temp')) return;
      
        const hpTemp = foundry.utils.getProperty(diff, 'system.attributes.hp.temp');
        const claim = actor.getFlag("gambits-premades", "motivationalSpeechTempHp");
        if(claim && !options?.gpsMotivationalSpeechGrant) {
            if(hpTemp <= 0 || hpTemp > claim.amount) await actor.unsetFlag("gambits-premades", "motivationalSpeechTempHp");
            else if(hpTemp !== claim.amount) await actor.setFlag("gambits-premades", "motivationalSpeechTempHp", {...claim, amount: hpTemp});
        }
        let effectData = actor.appliedEffects?.some(e => e.flags["gambits-premades"]?.gpsUuid === "32cabdaf-560e-48ea-8980-37cf5ad242c0");
        if(hpTemp > 0 || !effectData) return;
        await game.gps.motivationalSpeech({ actor: actor, args: "effectRemoval" });
      });
}
