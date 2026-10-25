export async function restoreBalance({workflowData,workflowType,workflowCombat}) {
    const workflow = await MidiQOL.Workflow.getWorkflow(workflowData);
    if(!workflow) return;
    const gpsUuid = "6a8cd8d0-7a6b-42b1-9da7-d9d4aa54a7c1"
    if(workflow?.item?.flags["gambits-premades"]?.gpsUuid === gpsUuid) return;
    let itemName = "Restore Balance";
    let dialogId = gpsUuid;
    let gmUser = game.gps.getPrimaryGM();
    let debugEnabled = MidiQOL.safeGetGameSetting('gambits-premades', 'debugEnabled');
    const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `${itemName} Timeout`));

    if(workflow.legendaryResistanceUsed) return;

    if(workflowType === "savePost" && workflow?.gps?.restoreBalanceFlag) {
        for (const flag of workflow.gps?.restoreBalanceFlag ?? []) {
            let { targetUuid, disposition, saveResult, saveDC, validTokenPrimaryUuid, chosenItemUuid } = flag;
            let target = await fromUuid(targetUuid);
            target = target?.object;
            let validTokenPrimary = await fromUuid(validTokenPrimaryUuid);
            let chosenItem = await fromUuid(chosenItemUuid);
            if(!target?.actor || !validTokenPrimary?.actor || !chosenItem) continue;
            saveResult = workflow.tokenSaves?.[targetUuid]?.total ?? saveResult;
            let chatContent;

            if(disposition === "ally") {
                if(workflow.saves.has(target)) {

                    chatContent = `<span style='text-wrap: wrap;'>${game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Sorcerer.ClockworkSoul.RestoreBalance.AllyDisadvantageRemovedSaveSuccess", { saveResult: saveResult })} <img src="${target.actor.img}" width="30" height="30" style="border:0px"></span>`;
                }
                else {
                    chatContent = `<span style='text-wrap: wrap;'>${game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Sorcerer.ClockworkSoul.RestoreBalance.AllyDisadvantageRemovedSaveFailure", { saveResult: saveResult })} <img src="${target.actor.img}" width="30" height="30" style="border:0px"></span>`;
                }
                await game.gps.queryUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent});
            }
            else if(disposition === "enemy") {
                if(workflow.failedSaves.has(target)) {

                    chatContent = `<span style='text-wrap: wrap;'>${game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Sorcerer.ClockworkSoul.RestoreBalance.EnemyAdvantageRemovedSaveFailure", { saveResult: saveResult })} <img src="${target.actor.img}" width="30" height="30" style="border:0px"></span>`;
                }
                else {
                    chatContent = `<span style='text-wrap: wrap;'>${game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Sorcerer.ClockworkSoul.RestoreBalance.EnemyAdvantageRemovedSaveSuccess", { saveResult: saveResult })} <img src="${target.actor.img}" width="30" height="30" style="border:0px"></span>`;
                }
                await game.gps.queryUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent});
            }
        }
        return;
    }
    else if(workflowType === "savePost") return;
    
    let findValidTokens = game.gps.findValidTokens({initiatingToken: workflow.token, targetedToken: null, itemName: itemName, itemType: "feature", itemChecked: null, reactionCheck: true, sightCheck: workflowType === "attack", rangeCheck: workflowType === "attack", rangeTotal: 60, dispositionCheck: false, dispositionCheckType: "", workflowType: workflowType, workflowCombat: workflowCombat, gpsUuid: gpsUuid});
    
    let browserUser;

    for (const validTokenPrimary of findValidTokens) {
        let chosenItem = validTokenPrimary.actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === gpsUuid);
        let itemProperName = chosenItem?.name;
        const dialogTitlePrimary = `${validTokenPrimary.actor.name} | ${itemProperName}`;
        const dialogTitleGM = game.i18n.format("GAMBITSPREMADES.Dialogs.Common.WaitingForSelection", { actorName: validTokenPrimary.actor.name, itemName: itemProperName });
        
        browserUser = game.gps.getBrowserUser({ actorUuid: validTokenPrimary.actor.uuid });

        let dialogContent;

        if(workflowType === "save") {
            let targetAllies = Array.from(workflow.targets).filter(t => t.document.disposition === validTokenPrimary.document.disposition && MidiQOL.canSee(validTokenPrimary, t) && game.gps.withinRange(validTokenPrimary, t, 60));
            let targetEnemies = Array.from(workflow.targets).filter(t => t.document.disposition !== validTokenPrimary.document.disposition && MidiQOL.canSee(validTokenPrimary, t) && game.gps.withinRange(validTokenPrimary, t, 60));
            
            const tokenSaves = workflow.tokenSaves ?? {};
            targetAllies = targetAllies.filter(t => game.gps.reactionCanChangeOutcome(workflow, {type: "save", desired: "success", target: t}) && tokenSaves[t.document.uuid]?.formula.includes("kl") && !tokenSaves[t.document.uuid].formula.includes("kh"));
            targetEnemies = targetEnemies.filter(t => game.gps.reactionCanChangeOutcome(workflow, {type: "save", desired: "failure", target: t}) && tokenSaves[t.document.uuid]?.formula.includes("kh") && !tokenSaves[t.document.uuid].formula.includes("kl"));

            if((!targetAllies || targetAllies?.length === 0) && (!targetEnemies || targetEnemies?.length === 0)) {
                if(debugEnabled) game.gps.logInfo(`${itemProperName} for ${validTokenPrimary.actor.name} failed at token disposition check`);
                continue;
            }

            const targetAllyUuids = targetAllies.map(t => t.document.uuid);
            const targetAllyNames = targetAllies.map(t => t.document.name);
            const targetEnemyUuids = targetEnemies.map(t => t.document.uuid);
            const targetEnemyNames = targetEnemies.map(t => t.document.name);
            
            targetAllyUuids.map((uuid, index) => 
                `<option value="${uuid}">${targetAllyNames[index]}</option>`
            ).join('');
            targetEnemyUuids.map((uuid, index) => 
                `<option value="${uuid}">${targetEnemyNames[index]}</option>`
            ).join('');
        
            dialogContent = `
                <div class="gps-dialog-container">
                    <div class="gps-dialog-section">
                        <div class="gps-dialog-content">
                            <p class="gps-dialog-paragraph">${game.i18n.format("GAMBITSPREMADES.Dialogs.Automations.ClassFeatures.Sorcerer.ClockworkSoul.RestoreBalance.Prompts.UseYourReaction.SelectTarget", { itemName: itemProperName, selectionHint: targetAllyUuids.length >= 1 && targetEnemyUuids.length === 0 ? game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations.ClassFeatures.Sorcerer.ClockworkSoul.RestoreBalance.SelectionHint.ChooseAlly") : targetAllyUuids.length === 0 && targetEnemyUuids.length >= 1 ? game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations.ClassFeatures.Sorcerer.ClockworkSoul.RestoreBalance.SelectionHint.ChooseEnemy") : targetAllyUuids.length >= 1 && targetEnemyUuids.length >= 1 ? game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations.ClassFeatures.Sorcerer.ClockworkSoul.RestoreBalance.SelectionHint.ChooseAllyOrEnemy") : "" })}</p>
                            <div class="gps-dialog-flex-wrapper">
                                <div class="gps-dialog-select-container">
                                    ${targetAllyUuids.length >= 1 ? 
                                        `<div class="gps-dialog-flex">
                                            <label for="ally-token" class="gps-dialog-label">${game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations.ClassFeatures.Sorcerer.ClockworkSoul.RestoreBalance.Ally")}</label>
                                            <select id="ally-token" class="gps-dialog-select" data-gps-token-group="reaction">
                                                ${targetAllyUuids.length >= 1 && targetEnemyUuids.length >= 1 ? 
                                                    `<option class="gps-dialog-option" value="" selected>${game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations.ClassFeatures.Sorcerer.ClockworkSoul.RestoreBalance.SelectAlly")}</option>` : 
                                                    ''
                                                }
                                                ${targetAllyNames.map((name, index) => 
                                                    `<option class="gps-dialog-option" value="${targetAllyUuids[index]}">${name}</option>`
                                                ).join('')}
                                            </select>
                                        </div>` 
                                        : ''
                                    }
                                    ${targetEnemyUuids.length >= 1 ? 
                                        `<div class="gps-dialog-flex">
                                            <label for="enemy-token" class="gps-dialog-label">${game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations.ClassFeatures.Sorcerer.ClockworkSoul.RestoreBalance.Enemy")}</label>
                                            <select id="enemy-token" class="gps-dialog-select" data-gps-token-group="reaction">
                                                ${targetAllyUuids.length >= 1 && targetEnemyUuids.length >= 1 ? 
                                                    `<option class="gps-dialog-option" value="" selected>${game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations.ClassFeatures.Sorcerer.ClockworkSoul.RestoreBalance.SelectEnemy")}</option>` : 
                                                    ''
                                                }
                                                ${targetEnemyNames.map((name, index) => 
                                                    `<option class="gps-dialog-option" value="${targetEnemyUuids[index]}">${name}</option>`
                                                ).join('')}
                                            </select>
                                        </div>`
                                        : ''
                                    }
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
            if(workflow.token.document.disposition !== validTokenPrimary.document.disposition && !game.gps.reactionCanChangeOutcome(workflow)) continue;
            if(workflow.token.document.disposition === validTokenPrimary.document.disposition && (!workflow.tracker.hasDisadvantage && !workflow.attackRoll.formula.includes("kl") || (workflow.tracker.hasAdvantage === true && workflow.tracker.hasDisadvantage === true) || (workflow.attackRoll.formula.includes("kl") && workflow.attackRoll.formula.includes("kh")))) {
                if(debugEnabled) game.gps.logInfo(`${itemProperName} for ${validTokenPrimary.actor.name} failed at token disposition check`);
                continue;
            }
            if(workflow.token.document.disposition !== validTokenPrimary.document.disposition && (!workflow.tracker.hasAdvantage && !workflow.attackRoll.formula.includes("kh") || (workflow.tracker.hasAdvantage && workflow.tracker.hasDisadvantage) || (workflow.attackRoll.formula.includes("kl") && workflow.attackRoll.formula.includes("kh")))) {
                if(debugEnabled) game.gps.logInfo(`${itemProperName} for ${validTokenPrimary.actor.name} failed at token disposition check`);
                continue;
            }

            dialogContent = `
                <div class="gps-dialog-container">
                    <div class="gps-dialog-section">
                        <div class="gps-dialog-content">
                            <div>
                                <div class="gps-dialog-flex">
                                    <p class="gps-dialog-paragraph">${game.i18n.format("GAMBITSPREMADES.Dialogs.Automations.ClassFeatures.Sorcerer.ClockworkSoul.RestoreBalance.Prompts.UseYourReaction.TargetDisposition", { itemName: itemProperName, targetHint: workflow.token.document.disposition === validTokenPrimary.document.disposition ? game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations.ClassFeatures.Sorcerer.ClockworkSoul.RestoreBalance.TargetHint.RemoveDisadvantageFromAlly") : workflow.token.document.disposition !== validTokenPrimary.document.disposition ? game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations.ClassFeatures.Sorcerer.ClockworkSoul.RestoreBalance.TargetHint.RemoveAdvantageFromEnemy") : "" })}</p>
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
            let userDialogArgs = { dialogTitle: dialogTitlePrimary, dialogContent, dialogId, initialTimeLeft, validTokenPrimaryUuid: validTokenPrimary.document.uuid, focusTokenUuid: workflowType === "attack" ? workflow.token.document.uuid : undefined, source: "user", type: "multiDialog", browserUser: browserUser, notificationId: notificationMessage._id };
            
            let gmDialogArgs = { dialogTitle: dialogTitleGM, dialogContent, dialogId, initialTimeLeft, validTokenPrimaryUuid: validTokenPrimary.document.uuid, focusTokenUuid: workflowType === "attack" ? workflow.token.document.uuid : undefined, source: "gm", type: "multiDialog", notificationId: notificationMessage._id };
            
            result = await game.gps.handleDialogPromises({userDialogArgs, gmDialogArgs});
        } else {
            result = await game.gps.queryDialog("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid, focusTokenUuid: workflowType === "attack" ? workflow.token.document.uuid : undefined,source: gmUser === browserUser ? "gm" : "user",type:"singleDialog", notificationId: notificationMessage._id});
        }
                
        const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, source, type } = result || {};

        if (!userDecision) {
            continue;
        }
        else if (userDecision) {
            let chatContent;

            let target;
            let disposition;
            if(workflowType === "attack") target = await workflow.targets.first();
            else if(workflowType === "save") {
                if(allyTokenUuid) {
                    target = await fromUuid(allyTokenUuid);
                    disposition = "ally";
                }
                else if(enemyTokenUuid) {
                    target = await fromUuid(enemyTokenUuid);
                    disposition = "enemy";
                }

                target = target?.object;
                if(!target || !workflow.tokenSaves?.[target.document.uuid]) continue;
            }

            let targetAC = target?.actor.system.attributes.ac.value;
            let saveDC = workflow.saveActivity?.save?.dc?.value;
            let saveDice = workflow.tokenSaves?.[target.document.uuid];
            let saveResult = saveDice?.dice[0].results[0].result + (saveDice?.total - saveDice?.dice[0].total);
            let baseAttack = workflow.attackRoll?.dice[0].results.find(result => !result.rerolled)?.result;
            let bonusAttack = workflow.attackRoll?.total - workflow.attackRoll?.dice[0].total;
            let attackResult = baseAttack + (workflow.attackRoll?.total - workflow.attackRoll?.dice[0].total);
            let criticalSuccessThreshold = workflow.attackRoll?.options?.criticalSuccess;
            let criticalSuccess = baseAttack >= criticalSuccessThreshold ? true : false;
            let criticalFailureThreshold = workflow.attackRoll?.options?.criticalFailure;
            let criticalFailure = baseAttack <= criticalFailureThreshold ? true : false;
            let baseRoll;
            let bonusRoll;
            let totalRoll;

            const options = {
                showFullCard: false,
                createWorkflow: true,
                versatile: false,
                configureDialog: true,
                targetUuids: [(enemyTokenUuid) ? enemyTokenUuid : (allyTokenUuid) ? allyTokenUuid : workflow.token.document.uuid],
            };
            
            let itemRoll;
            if(source && source === "user") itemRoll = await MidiQOL.socket().executeAsUser("completeItemUse", browserUser, { itemData: chosenItem, actorUuid: validTokenPrimary.actor.uuid, config: { midiOptions: { ...options, workflowData: true } } });
            else if(source && source === "gm") itemRoll = await MidiQOL.socket().executeAsUser("completeItemUse", gmUser, { itemData: chosenItem, actorUuid: validTokenPrimary.actor.uuid, config: { midiOptions: { ...options, workflowData: true } } });

            if(!itemRoll || itemRoll.aborted) continue;

            await game.gps.addReaction({actorUuid: `${validTokenPrimary.actor.uuid}`});

            if(workflowType === "attack") {
                totalRoll = game.gps.replaceD20Result(workflow.attackRoll, baseAttack);
                await game.gps.setAttackResult(workflow, totalRoll);
                attackResult = totalRoll.total;
                if(workflow.token.document.disposition === validTokenPrimary.document.disposition) {
                    if(game.gps.attackHits(workflow, target)) {
                        if(criticalSuccess) chatContent = `<span style='text-wrap: wrap;'>${game.i18n.localize("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Sorcerer.ClockworkSoul.RestoreBalance.AllyDisadvantageRemovedCriticalHit")} <img src="${workflow.actor.img}" width="30" height="30" style="border:0px"></span>`;
                        else chatContent = `<span style='text-wrap: wrap;'>${game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Sorcerer.ClockworkSoul.RestoreBalance.AllyDisadvantageRemovedAttackHit", { attackResult: attackResult })} <img src="${workflow.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    }
                    else {
                        if(criticalFailure) chatContent = `<span style='text-wrap: wrap;'>${game.i18n.localize("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Sorcerer.ClockworkSoul.RestoreBalance.AllyDisadvantageRemovedCriticalMiss")} <img src="${workflow.actor.img}" width="30" height="30" style="border:0px"></span>`;
                        else chatContent = `<span style='text-wrap: wrap;'>${game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Sorcerer.ClockworkSoul.RestoreBalance.AllyDisadvantageRemovedAttackMiss", { attackResult: attackResult })} <img src="${workflow.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    }
                    await game.gps.queryUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: totalRoll});
                    return;
                }
                else{
                    if(!game.gps.attackHits(workflow, target)) {
                        if(criticalFailure) chatContent = `<span style='text-wrap: wrap;'>${game.i18n.localize("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Sorcerer.ClockworkSoul.RestoreBalance.EnemyAdvantageRemovedCriticalMiss")} <img src="${workflow.actor.img}" width="30" height="30" style="border:0px"></span>`;
                        else chatContent = `<span style='text-wrap: wrap;'>${game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Sorcerer.ClockworkSoul.RestoreBalance.EnemyAdvantageRemovedAttackMiss", { attackResult: attackResult })} <img src="${workflow.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    }
                    else {
                        if(criticalSuccess) chatContent = `<span style='text-wrap: wrap;'>${game.i18n.localize("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Sorcerer.ClockworkSoul.RestoreBalance.EnemyAdvantageRemovedCriticalHit")} <img src="${workflow.actor.img}" width="30" height="30" style="border:0px"></span>`;
                        else chatContent = `<span style='text-wrap: wrap;'>${game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Sorcerer.ClockworkSoul.RestoreBalance.EnemyAdvantageRemovedAttackHit", { attackResult: attackResult })} <img src="${workflow.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    }
                    await game.gps.queryUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: totalRoll});
                    return;
                }
            }
            else if(workflowType === "save") {
                const revised = game.gps.replaceD20Result(saveDice, saveDice.dice[0].results.find(result => !result.rerolled)?.result);
                await game.gps.updateSaveResult({workflow, token: target, roll: revised});
                saveResult = revised.total;
                ((workflow.gps ??= {}).restoreBalanceFlag ??= []).push({
                    targetUuid: target.document.uuid,
                    disposition,
                    saveResult,
                    saveDC,
                    validTokenPrimaryUuid: validTokenPrimary.document.uuid,
                    chosenItemUuid: chosenItem.uuid
                });

                return;
            }
        }
    }
}
