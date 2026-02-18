export async function chronalShift({workflowData,workflowType,workflowCombat}) {
    const workflow = await MidiQOL.Workflow.getWorkflow(workflowData);
    if(!workflow) return;
    const gpsUuid = "fc2a2693-b92b-4811-b7ff-7c6cb8e5ded5";
    if(workflow.item.flags["gambits-premades"]?.gpsUuid === gpsUuid) return;
    let itemName = "Chronal Shift";
    let dialogId = gpsUuid;
    let gmUser = game.gps.getPrimaryGM();
    const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `${itemName} Timeout`));

    if(workflow.legendaryResistanceUsed) return;

    // Check if attack hits
    if(workflowType === "attack" && workflow.attackTotal < workflow.targets?.first()?.actor.system.attributes.ac.value) return;
    // Check if there is a save success
    if(workflowType === "save" && workflow.saves.size === 0) return;

    let findValidTokens;
    
    if(workflowType === "attack") {
        findValidTokens = game.gps.findValidTokens({initiatingToken: workflow.token, targetedToken: null, itemName: itemName, itemType: "feature", itemChecked: ["chronal-shift"], reactionCheck: true, sightCheck: true, rangeCheck: true, rangeTotal: 30, dispositionCheck: true, dispositionCheckType: "enemy", workflowType: workflowType, workflowCombat: workflowCombat, gpsUuid: gpsUuid});
    }
    else if(workflowType === "save") {
        findValidTokens = game.gps.findValidTokens({initiatingToken: workflow.token, targetedToken: null, itemName: itemName, itemType: "feature", itemChecked: ["chronal-shift"], reactionCheck: true, sightCheck: false, rangeCheck: false, rangeTotal: null, dispositionCheck: true, dispositionCheckType: "ally", workflowType: workflowType, workflowCombat: workflowCombat, gpsUuid: gpsUuid});
    }
    
    let browserUser;

    for (const validTokenPrimary of findValidTokens) {
        let chosenItem = validTokenPrimary.actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === gpsUuid);
        let itemProperName = chosenItem?.name;
        const dialogTitlePrimary = `${validTokenPrimary.actor.name} | ${itemProperName}`;
        const dialogTitleGM = game.i18n.format("GAMBITSPREMADES.Dialogs.Common.WaitingForSelection", { actorName: validTokenPrimary.actor.name, itemName: itemName });
        
        browserUser = game.gps.getBrowserUser({ actorUuid: validTokenPrimary.actor.uuid });

        let dialogContent;
        const rollDetailSetting = MidiQOL.safeGetGameSetting('midi-qol', 'ConfigSettings').hideRollDetails;

        if(workflowType === "save") {
            let enemyTargets = Array.from(workflow.saves).filter(t => t.document.disposition !== validTokenPrimary.document.disposition && MidiQOL.canSee(validTokenPrimary, t) && MidiQOL.computeDistance(validTokenPrimary, t, {wallsBlock: true, includeCover: true}) <= 30);
            let allyTargets = Array.from(workflow.failedSaves).filter(t => t.document.disposition === validTokenPrimary.document.disposition && MidiQOL.canSee(validTokenPrimary, t) && MidiQOL.computeDistance(validTokenPrimary, t, {wallsBlock: true, includeCover: true}) <= 30);

            if(enemyTargets.length === 0 && allyTargets.length === 0) continue;

            const enemyTargetUuids = enemyTargets.map(t => t.document.uuid);
            const enemyTargetNames = enemyTargets.map(t => t.document.name);
            const allyTargetUuids = allyTargets.map(t => t.document.uuid);
            const allyTargetNames = allyTargets.map(t => t.document.name);
            let detailsKey;

            if (enemyTargets.length > 0 && allyTargets.length > 0) detailsKey = "GAMBITSPREMADES.Dialogs.Automations.ThirdPartyClassFeatures.Wizard.Chronurgist.ChronalShift.Details.EnemiesSucceededAlliesFailed";
            else if (enemyTargets.length > 0 && allyTargets.length === 0) detailsKey = "GAMBITSPREMADES.Dialogs.Automations.ThirdPartyClassFeatures.Wizard.Chronurgist.ChronalShift.Details.EnemiesSucceeded";
            else if (enemyTargets.length === 0 && allyTargets.length > 0) detailsKey = "GAMBITSPREMADES.Dialogs.Automations.ThirdPartyClassFeatures.Wizard.Chronurgist.ChronalShift.Details.AlliesFailed";
            const dialogDescription = detailsKey ? game.i18n.localize(detailsKey) : "";
        
            dialogContent = `
                <div class="gps-dialog-container">
                    <div class="gps-dialog-section">
                        <div class="gps-dialog-content">
                            <p class="gps-dialog-paragraph">${game.i18n.format("GAMBITSPREMADES.Dialogs.Automations.ThirdPartyClassFeatures.Wizard.Chronurgist.ChronalShift.Prompts.UseYourReaction.Initiate", { itemName: itemProperName, details: dialogDescription })}</p>
                            <div class="gps-dialog-flex-wrapper">
                                <div class="gps-dialog-select-container">
                                    <div class="gps-dialog-flex">
                                    <label for="enemy-token" class="gps-dialog-label">${game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations.ThirdPartyClassFeatures.Wizard.Chronurgist.ChronalShift.EnemyTarget")}</label>
                                    ${enemyTargetNames.length >= 1 ? 
                                        `<select id="enemy-token" class="gps-dialog-select">
                                            <option value="">${game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations.ThirdPartyClassFeatures.Wizard.Chronurgist.ChronalShift.SelectEnemy")}</option>
                                            ${enemyTargetNames.map((name, index) => `<option class="gps-dialog-option" value="${enemyTargetUuids[index]}">${name}</option>`).join('')}
                                        </select>` : `<div style="padding: 4px; width: 100%; box-sizing: border-box; line-height: normal;">${game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.NoValidEnemiesInRange")}</div>`
                                    }
                                    </div>
                                    <div class="gps-dialog-flex">
                                    <label for="ally-token" class="gps-dialog-label">${game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations.ThirdPartyClassFeatures.Wizard.Chronurgist.ChronalShift.AllyTarget")}</label>
                                    ${allyTargetNames.length >= 1 ? 
                                        `<select id="ally-token" class="gps-dialog-select">
                                            <option value="">${game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations.ThirdPartyClassFeatures.Wizard.Chronurgist.ChronalShift.SelectAlly")}</option>
                                            ${allyTargetNames.map((name, index) => `<option class="gps-dialog-option" value="${allyTargetUuids[index]}">${name}</option>`).join('')}
                                        </select>` : `<div style="padding: 4px; width: 100%; box-sizing: border-box; line-height: normal;">${game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.NoValidAlliesInRange")}</div>`
                                    }
                                    </div>
                                </div>
                                <div id="image-container" class="gps-dialog-image-container">
                                    <img id="img_${dialogId}" src="${chosenItem.img}" class="gps-dialog-image">
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="gps-dialog-button-container">
                        <button id="pauseButton_${dialogId}" type="button" class="gps-dialog-button">
                            <i class="fas fa-pause" id="pauseIcon_${dialogId}" style="margin-right: 5px;"></i>${game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.Pause")}
                        </button>
                    </div>
                </div>
            `;
        }
        else if(workflowType === "attack") {
            if (workflow.token.document.disposition === validTokenPrimary.document.disposition) continue;

            dialogContent = `
                <div class="gps-dialog-container">
                    <div class="gps-dialog-section">
                        <div class="gps-dialog-content">
                            <div>
                                <div class="gps-dialog-flex">
                                    <p class="gps-dialog-paragraph">${game.i18n.format("GAMBITSPREMADES.Dialogs.Automations.ThirdPartyClassFeatures.Wizard.Chronurgist.ChronalShift.Prompts.UseYourReaction.Initiate", { itemName: itemProperName, details: ["none", "detailsDSN", "details"].includes(rollDetailSetting) ? game.i18n.format("GAMBITSPREMADES.Dialogs.Common.EnemyHitsAllyWithAttackTotal", { attackTotal: workflow.attackTotal }) : game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.EnemyHitsAlly") })}</p>
                                    <div id="image-container" class="gps-dialog-image-container">
                                        <img id="img_${dialogId}" src="${chosenItem.img}" class="gps-dialog-image">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="gps-dialog-button-container">
                        <button id="pauseButton_${dialogId}" type="button" class="gps-dialog-button">
                            <i class="fas fa-pause" id="pauseIcon_${dialogId}" style="margin-right: 5px;"></i>${game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.Pause")}
                        </button>
                    </div>
                </div>
            `;
        }

        let content = `<span style='text-wrap: wrap;'><img src="${validTokenPrimary.actor.img}" style="width: 25px; height: auto;" /> ${game.i18n.format("GAMBITSPREMADES.ChatMessages.Common.ReactionAvailableSaveTrigger", { actorName: validTokenPrimary.actor.name, itemProperName: itemProperName })}</span>`
        let chatData = { user: gmUser, content: content, roll: false };
        let notificationMessage = await MidiQOL.socket().executeAsUser("createChatMessage", gmUser, { chatData });
        
        let result;

        if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser !== gmUser) {
            let userDialogArgs = { dialogTitle: dialogTitlePrimary, dialogContent, dialogId, initialTimeLeft, validTokenPrimaryUuid: validTokenPrimary.document.uuid, source: "user", type: "multiDialog", browserUser: browserUser, notificationId: notificationMessage._id };
            
            let gmDialogArgs = { dialogTitle: dialogTitleGM, dialogContent, dialogId, initialTimeLeft, validTokenPrimaryUuid: validTokenPrimary.document.uuid, source: "gm", type: "multiDialog", notificationId: notificationMessage._id };
            
            result = await game.gps.socket.executeAsUser("handleDialogPromises", gmUser, {userDialogArgs, gmDialogArgs});
        } else {
            result = await game.gps.socket.executeAsUser("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: gmUser === browserUser ? "gm" : "user",type:"singleDialog", notificationId: notificationMessage._id});
        }
                
        const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, source, type } = result || {};

        if (!userDecision) {
            continue;
        }
        else if (userDecision) {
            let allyToken = null;
            let enemyToken = null;
            if(enemyTokenUuid) enemyToken = await fromUuid(enemyTokenUuid);
            else if(allyTokenUuid) allyToken = await fromUuid(allyTokenUuid);
            let targetToken = enemyTokenUuid ? enemyToken : allyToken;
            let targetUuid = enemyTokenUuid ? enemyTokenUuid : allyTokenUuid;
            
            let chatContent;

            const options = {
                showFullCard: false,
                createWorkflow: true,
                versatile: false,
                configureDialog: true,
                targetUuids: [(workflowType === "save") ? targetToken.uuid : workflow.token.document.uuid],
            };
            
            let itemRoll;
            if(source && source === "user") itemRoll = await MidiQOL.socket().executeAsUser("completeItemUse", browserUser, { itemData: chosenItem, actorUuid: validTokenPrimary.actor.uuid, options: options });
            else if(source && source === "gm") itemRoll = await MidiQOL.socket().executeAsUser("completeItemUse", gmUser, { itemData: chosenItem, actorUuid: validTokenPrimary.actor.uuid, options: options });

            if(!itemRoll) continue;

            await game.gps.addReaction({actorUuid: `${validTokenPrimary.actor.uuid}`});

            if(workflowType === "save") {
                let saveDC = workflow?.saveActivity?.save.dc?.value;
                let saveAbility = workflow.saveActivity?.ability;
                let workflowTarget = enemyTokenUuid ? Array.from(workflow.saves).find(t => t.document.uuid === targetUuid) : Array.from(workflow.failedSaves).find(t => t.document.uuid === targetUuid);

                let activity = chosenItem.system.activities.find(a => a.identifier === "syntheticSave");
                await game.gps.socket.executeAsUser("gpsActivityUpdate", gmUser, { activityUuid: activity.uuid, updates: {"save.dc.calculation": "", "save.dc.formula": saveDC, "save.dc.value": saveDC, "save.ability": [saveAbility]} });
                let reroll;
                if(source && source === "user") reroll = await game.gps.socket.executeAsUser("gpsActivityUse", browserUser, {itemUuid: chosenItem.uuid, identifier: "syntheticSave", targetUuid: workflowTarget.document.uuid});
                else if(source && source === "gm") reroll = await game.gps.socket.executeAsUser("gpsActivityUse", gmUser, {itemUuid: chosenItem.uuid, identifier: "syntheticSave", targetUuid: workflowTarget.document.uuid});

                if(reroll.failedSaves.size !== 0) {
                    if(enemyTokenUuid) {
                        workflow.saves.delete(workflowTarget);
                        workflow.failedSaves.add(workflowTarget);
                        chatContent = `<span style='text-wrap: wrap;'>${game.i18n.localize("GAMBITSPREMADES.ChatMessages.Automations.ThirdPartyClassFeatures.Wizard.Chronurgist.ChronalShift.EnemySaveFailed")} <img src="${workflowTarget.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    }
                    else {
                        workflow.failedSaves.delete(workflowTarget);
                        workflow.saves.add(workflowTarget);
                        chatContent = `<span style='text-wrap: wrap;'>${game.i18n.localize("GAMBITSPREMADES.ChatMessages.Automations.ThirdPartyClassFeatures.Wizard.Chronurgist.ChronalShift.AllySaveSucceeded")} <img src="${workflowTarget.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    }

                    await game.gps.socket.executeAsUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: reroll.saveRolls});
                    return;
                }

                else {
                    if(enemyTokenUuid) {
                        chatContent = `<span style='text-wrap: wrap;'>${game.i18n.localize("GAMBITSPREMADES.ChatMessages.Automations.ThirdPartyClassFeatures.Wizard.Chronurgist.ChronalShift.EnemySaveSucceeded")} <img src="${workflowTarget.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    }
                    else {
                        chatContent = `<span style='text-wrap: wrap;'>${game.i18n.localize("GAMBITSPREMADES.ChatMessages.Automations.ThirdPartyClassFeatures.Wizard.Chronurgist.ChronalShift.AllySaveFailed")} <img src="${workflowTarget.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    }

                    await game.gps.socket.executeAsUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: reroll.saveRolls});
                    continue;
                }
            }
            else if(workflowType === "attack") {
                let rerollAddition = workflow.attackRoll.total - workflow.attackRoll.dice[0].total;
                let targetAC = workflow.targets.first().actor.system.attributes.ac.value;
                const saveSetting = workflow.options.noOnUseMacro;
                workflow.options.noOnUseMacro = true;
                let reroll;
                if(source && source === "user") reroll = await game.gps.socket.executeAsUser("rollAsUser", browserUser, { rollParams: `1d20 + ${rerollAddition}` });
                if(source && source === "gm") reroll = await game.gps.socket.executeAsUser("rollAsUser", gmUser, { rollParams: `1d20 + ${rerollAddition}` });
                if(reroll.total < workflow.attackTotal) await workflow.setAttackRoll(reroll);

                workflow.options.noOnUseMacro = saveSetting;

                if(workflow.attackTotal < targetAC) {                    
                    chatContent = `<span style='text-wrap: wrap;'>${game.i18n.localize("GAMBITSPREMADES.ChatMessages.Automations.ThirdPartyClassFeatures.Wizard.Chronurgist.ChronalShift.AttackFailed")} <img src="${workflow.token.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    await game.gps.socket.executeAsUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: reroll});
                    return;
                }

                else {
                    chatContent = `<span style='text-wrap: wrap;'>${game.i18n.localize("GAMBITSPREMADES.ChatMessages.Automations.ThirdPartyClassFeatures.Wizard.Chronurgist.ChronalShift.AttackHitAnyway")} <img src="${workflow.token.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    await game.gps.socket.executeAsUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: reroll});
                    continue;
                }
            }
        }
    }
}