import { executeWorkflow, updateRegionPosition, hideTemplateElements, updateSettings, daeAddFlags, arcaneShotValidActivities } from "./hookUtils.js";

export function registerHooks() {
    Hooks.on("preUpdateToken", async (token, updateData, options, userId) => {
        if(!options?.teleport || !updateData?.x || !game.gpsSettings.magicUsersNemesisEnabled) return;

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
        let workflowItemUuid = workflow.itemCardUuid;
        if (game.gpsSettings.silveryBarbsEnabled) await executeWorkflow({ workflowItem: "silveryBarbs", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
        if (game.gpsSettings.cuttingWordsEnabled) await executeWorkflow({ workflowItem: "cuttingWords", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
        if (game.gpsSettings.witchesHexEnabled) await executeWorkflow({ workflowItem: "witchesHex", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
        if (game.gpsSettings.chronalShiftEnabled) await executeWorkflow({ workflowItem: "chronalShift", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
    });

    Hooks.on("midi-qol.preAttackRoll", async (workflow) => {
        if(!workflow.activity.hasAttack) return;
        let workflowItemUuid = workflow.itemCardUuid;
        if (game.gpsSettings.protectionEnabled && !game.gpsSettings.enableProtectionOnSuccess) await executeWorkflow({ workflowItem: "protection", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
        if (game.gpsSettings.instinctiveCharmEnabled) await executeWorkflow({ workflowItem: "instinctiveCharm", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
    });

    Hooks.on("midi-qol.preAttackRollComplete", async (workflow) => {
        if(!workflow.activity.hasAttack) return;
        let workflowItemUuid = workflow.itemCardUuid;
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
        //if (game.gpsSettings.restoreBalanceEnabled) await executeWorkflow({ workflowItem: "restoreBalance", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
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

    if(!game.modules.get("gambitsIdentificationInhibitor")?.active) {
        Hooks.on("preUpdateItem", (item, update, options) => {
            if (!game.user.isGM && !item.system?.identified && "identified" in (update.system ?? {}) && game.gpsSettings.identifyRestrictionEnabled && !options?.isAdvancement) {
                ui.notifications.error(`${game.gpsSettings.identifyRestrictionMessage}`);
                return false;
            }
        });
    }

    Hooks.on("midi-qol.preDamageRollComplete", async (workflow) => {
        if(!workflow.activity.hasDamage) return;
        let workflowItemUuid = workflow.itemCardUuid;
        if (game.gpsSettings.cuttingWordsEnabled) await executeWorkflow({ workflowItem: "cuttingWords", workflowData: workflowItemUuid, workflowType: "damage", workflowCombat: true });
        if (game.gpsSettings.interceptionEnabled) await executeWorkflow({ workflowItem: "interception", workflowData: workflowItemUuid, workflowType: "damage", workflowCombat: true });
    });

    Hooks.on("midi-qol.preCompleted", async (workflow) => {
        let workflowItemUuid = workflow.itemCardUuid;
        if (game.gpsSettings.mageSlayerEnabled && workflow.activity.type === "spell") await executeWorkflow({ workflowItem: "mageSlayer", workflowData: workflowItemUuid, workflowType: "spell", workflowCombat: true });
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

    Hooks.on("dnd5e.rollSkillV2", async (rolls, data) => {
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
        let combat = game.combat;
        if (combat && combat.started && game.gpsSettings.opportunityAttackEnabled) {
            await game.gps.enableOpportunityAttack(combatant, "enterCombat");
        }
    });
    
    Hooks.on('deleteCombat', async (combat) => {
        if(game.user.id !== game.gps.getPrimaryGM()) return;
        if(game.gpsSettings.opportunityAttackEnabled) await game.gps.disableOpportunityAttack(combat, "endCombat");
    });
    
    Hooks.on("deleteCombatant", async (combatant, options, userId) => {
        if(game.user.id !== game.gps.getPrimaryGM()) return;
        let combat = game.combat;
        if (combat && combat.started && game.gpsSettings.opportunityAttackEnabled) {
            await game.gps.disableOpportunityAttack(combatant, "exitCombat");
        }
    });

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

    Hooks.on('refreshMeasuredTemplate', (template) => {
        if (game.gpsSettings.hideTemplates || template.document.getFlag('gambits-premades', 'templateHiddenOA')) {
            hideTemplateElements(template);
        }
    });

    Hooks.on('updateToken', async (tokenDocument, updateData, options, userId) => {
        if(game.user.id !== game.gps.getPrimaryGM()) return;
        if(!game.gpsSettings.opportunityAttackEnabled) return;
        if(!game.combat) return;
    
        const regions = tokenDocument.actor.getFlag('gambits-premades', 'attachedRegions') || [];
    
        for (const regionUuid of regions) {
            const region = fromUuidSync(regionUuid);
            if (region) {
                updateRegionPosition(region, tokenDocument, updateData?.elevation, updateData?.x, updateData?.y);
            }
        }
    });

    Hooks.on('updateSetting', (setting) => {
        if (!game.user.isGM) return;
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

    Hooks.on('createActiveEffect', async (effect) => {
        if (effect.target?.system?.attributes?.movement?.walk !== 0 && effect.name !== "Incapacitated") return;
        if (!effect.target?.appliedEffects.some(e => e.name === "Cloak of Displacement")) return;
        await game.gps.cloakOfDisplacement({ actor: effect?.target, token: effect?.target.getActiveTokens()?.[0], args: "effectSuppression" });
    });

    let codPreDeletePassed = false;
    Hooks.on('preDeleteActiveEffect', async (effect) => {
        if (effect.target?.system?.attributes?.movement?.walk !== 0 && effect.name !== "Incapacitated") return;
        if (!effect.target?.appliedEffects.some(e => e.name === "Cloak of Displacement: Start-End")) return;
        if (effect.target?.getFlag("gambits-premades", "codTurnSuppressed")) return;
        codPreDeletePassed = true;
    });

    Hooks.on('deleteActiveEffect', async (effect) => {
        if (effect.target?.system?.attributes?.movement?.walk === 0) return;
        if(!codPreDeletePassed) return;
        codPreDeletePassed = false;
        await game.gps.cloakOfDisplacement({ actor: effect?.target, args: "effectActivation" });
    });

    Hooks.on('updateActor', async (actor, diff, options, userID) => {
        if (!foundry.utils.hasProperty(diff, 'system.attributes.hp.temp')) return;
      
        const hpTemp = diff.system.attributes.hp.temp;
        let effectData = actor.appliedEffects?.some(e => e.flags["gambits-premades"]?.gpsUuid === "32cabdaf-560e-48ea-8980-37cf5ad242c0");
        if(hpTemp > 0 || !effectData) return;
        await game.gps.motivationalSpeech({ actor: actor, args: "effectRemoval" });
      });
}