import { executeWorkflow, updateRegionPosition, hideTemplateElements, updateSettings, daeAddFlags, arcaneShotValidActivities } from "./hookUtils.js";

export function registerHooks() {
    Hooks.on("midi-qol.preItemRollV2", async ({workflow, usage, dialog, message}) => {
        if (!((workflow.item.type === "spell" && workflow.activity.description.chatFlavor.contains("gpsFreeSpellUse")) || (workflow.item.identifier === "guiding-bolt" && workflow.actor.items.some(i => i.flags["gambits-premades"]?.gpsUuid === "62cd752b-7c9c-42ff-9e73-cd7b707aad66")))) return;
        let freeSpellUsed;

        if(workflow.item.flags["gambits-premades"]?.gpsUuid === "62cd752b-7c9c-42ff-9e73-cd7b707aad66") {
            freeSpellUsed = await game.gps.starMap({item: workflow.item});

            if(freeSpellUsed) {
                dialog.configure = false;
                if (!usage.consume) usage.consume = {};
                usage.consume.spellSlot = false;
            }
        }
        else {
            freeSpellUsed = await game.gps.freeSpellUse({item: workflow.item, actor: workflow.actor});
            if(freeSpellUsed) {
                dialog.configure = false;
                if (!usage.consume) usage.consume = {};
                usage.consume.spellSlot = false;
            }
        }
    });

    Hooks.on("midi-qol.prePreambleComplete", async (workflow) => {
        let workflowItemUuid = workflow.itemCardUuid;
        let workflowType = (workflow.saveActivity || workflow.activity?.type === "save") ? "save" : (workflow.activity?.hasAttack) ? "attack" : "item";
        if (game.gpsSettings.counterspellEnabled && workflow.item.type === "spell") await executeWorkflow({ workflowItem: "counterspell", workflowData: workflowItemUuid, workflowType: workflowType, workflowCombat: true });
        if (game.gpsSettings.counterspellEnabled && workflow?.item?.type === "spell") await executeWorkflow({ workflowItem: "counterspell2024", workflowData: workflowItemUuid, workflowType: workflowType, workflowCombat: true });
        if (game.gpsSettings.temporalShuntEnabled && (workflow.item.type === "spell" || workflow.activity.hasAttack)) await executeWorkflow({ workflowItem: "temporalShunt", workflowData: workflowItemUuid, workflowType: workflowType, workflowCombat: true });
    });

    Hooks.on("midi-qol.preCheckHits", async (workflow) => {
        if(!workflow.activity.hasAttack) return;
        let workflowItemUuid = workflow.itemCardUuid;
        if (game.gpsSettings.silveryBarbsEnabled) await executeWorkflow({ workflowItem: "silveryBarbs", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
        if (game.gpsSettings.cuttingWordsEnabled) await executeWorkflow({ workflowItem: "cuttingWords", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
        if (game.gpsSettings.witchesHexEnabled) await executeWorkflow({ workflowItem: "witchesHex", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
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
        if (game.gpsSettings.sentinelEnabled) await executeWorkflow({ workflowItem: "sentinel", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
        if (game.gpsSettings.protectionEnabled && game.gpsSettings.enableProtectionOnSuccess) await executeWorkflow({ workflowItem: "protection", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
        if (game.gpsSettings.powerWordReboundEnabled) await executeWorkflow({ workflowItem: "powerWordRebound", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
        if (game.gpsSettings.rainOfCindersEnabled) await executeWorkflow({ workflowItem: "rainOfCinders", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
    });

    Hooks.on("midi-qol.postAttackRollComplete", async (workflow) => {
        if(!workflow.activity.hasAttack) return;
        let workflowItemUuid = workflow.itemCardUuid;
        if (game.gpsSettings.poetryInMiseryEnabled) await executeWorkflow({ workflowItem: "poetryInMisery", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
        if (game.gpsSettings.riposteEnabled) await executeWorkflow({ workflowItem: "riposte", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
        if (game.gpsSettings.restoreBalanceEnabled) await executeWorkflow({ workflowItem: "restoreBalance", workflowData: workflowItemUuid, workflowType: "attack", workflowCombat: true });
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
        if (game.gpsSettings.silveryBarbsEnabled) await executeWorkflow({ workflowItem: "silveryBarbs", workflowData: workflowItemUuid, workflowType: "save", workflowCombat: true });
        if (game.gpsSettings.indomitableEnabled) await executeWorkflow({ workflowItem: "indomitable", workflowData: workflowItemUuid, workflowType: "save", workflowCombat: true });
        if (game.gpsSettings.witchesHexEnabled) await executeWorkflow({ workflowItem: "witchesHex", workflowData: workflowItemUuid, workflowType: "save", workflowCombat: true });
        if (game.gpsSettings.legendaryResistanceEnabled) await executeWorkflow({ workflowItem: "legendaryResistance", workflowData: workflowItemUuid, workflowType: "save", workflowCombat: true });
        if (game.gpsSettings.burstOfIngenuityEnabled) await executeWorkflow({ workflowItem: "burstOfIngenuity", workflowData: workflowItemUuid, workflowType: "save", workflowCombat: true });
    });

    Hooks.on("midi-qol.postSavesComplete", async (workflow) => {
        if(!workflow.saveActivity) return;
        let workflowItemUuid = workflow.itemCardUuid;
        if (game.gpsSettings.poetryInMiseryEnabled) await executeWorkflow({ workflowItem: "poetryInMisery", workflowData: workflowItemUuid, workflowType: "save", workflowCombat: true });
        if (game.gpsSettings.restoreBalanceEnabled) await executeWorkflow({ workflowItem: "restoreBalance", workflowData: workflowItemUuid, workflowType: "save", workflowCombat: true });
    });

    Hooks.on("preUpdateItem", (item, update) => {
        if (!game.user.isGM && !item.system?.identified && "identified" in (update.system ?? {}) && game.gpsSettings.identifyRestrictionEnabled) {
            ui.notifications.error(`${game.gpsSettings.identifyRestrictionMessage}`);
            return false;
        }
      });

    Hooks.on("midi-qol.preDamageRollComplete", async (workflow) => {
        if(!workflow.activity.hasDamage) return;
        let workflowItemUuid = workflow.itemCardUuid;
        if (game.gpsSettings.cuttingWordsEnabled) await executeWorkflow({ workflowItem: "cuttingWords", workflowData: workflowItemUuid, workflowType: "damage", workflowCombat: true });
        if (game.gpsSettings.interceptionEnabled) await executeWorkflow({ workflowItem: "interception", workflowData: workflowItemUuid, workflowType: "damage", workflowCombat: true });
    });

    Hooks.on("midi-qol.preCompleted", async (workflow) => {
        if (!workflow.activity.type === "spell") return;
        let workflowItemUuid = workflow.itemCardUuid;
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

    Hooks.on("preUpdateCombat", (combat, update, options) => {
        if (game.user.id !== game.gps.getPrimaryGM()) return;
        const startedPath = `gambits-premades.started`;
        const prevStarted = combat.started;
        foundry.utils.setProperty(options, startedPath, prevStarted);
    })
    
    Hooks.on("updateCombat", async (combat, update, options) => {
        if(game.user.id !== game.gps.getPrimaryGM()) return;
        const combatStarted = combat.started && !foundry.utils.getProperty(options, `gambits-premades.started`);
        const hasProcessedStart = await combat.getFlag('gambits-premades', `startProcessed-${combat.id}`);
        if(combatStarted && !hasProcessedStart && game.gpsSettings.opportunityAttackEnabled) {
            await combat.setFlag('gambits-premades', `startProcessed-${combat.id}`, true);
            await game.gps.enableOpportunityAttack(combat, "startCombat");
        }
    })
    
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
        if (game.user.id !== game.gps.getPrimaryGM()) return;
        if(!game.gpsSettings.opportunityAttackEnabled) return;
        if(!game.combat) return;
    
        const regions = tokenDocument.actor.getFlag('gambits-premades', 'attachedRegions') || [];
    
        for (const regionUuid of regions) {
            const region = fromUuidSync(regionUuid);
            if (region) {
                updateRegionPosition(region, tokenDocument);
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
}