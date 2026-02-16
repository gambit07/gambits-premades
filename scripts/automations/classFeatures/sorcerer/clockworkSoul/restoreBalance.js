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
            let chatContent;

            if(disposition === "ally") {
                if(saveResult >= saveDC) {
                    workflow.failedSaves.delete(target);
                    workflow.saves.add(target)

                    chatContent = `<span style='text-wrap: wrap;'>${game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Sorcerer.ClockworkSoul.RestoreBalance.AllyDisadvantageRemovedSaveSuccess", { saveResult: saveResult })} <img src="${target.actor.img}" width="30" height="30" style="border:0px"></span>`;
                }
                else {
                    chatContent = `<span style='text-wrap: wrap;'>${game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Sorcerer.ClockworkSoul.RestoreBalance.AllyDisadvantageRemovedSaveFailure", { saveResult: saveResult })} <img src="${target.actor.img}" width="30" height="30" style="border:0px"></span>`;
                }
                await game.gps.socket.executeAsUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent});
            }
            else if(disposition === "enemy") {
                if(saveResult < saveDC) {
                    workflow.failedSaves.add(target);
                    workflow.saves.delete(target)

                    chatContent = `<span style='text-wrap: wrap;'>${game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Sorcerer.ClockworkSoul.RestoreBalance.EnemyAdvantageRemovedSaveFailure", { saveResult: saveResult })} <img src="${target.actor.img}" width="30" height="30" style="border:0px"></span>`;
                }
                else {
                    chatContent = `<span style='text-wrap: wrap;'>${game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Sorcerer.ClockworkSoul.RestoreBalance.EnemyAdvantageRemovedSaveSuccess", { saveResult: saveResult })} <img src="${target.actor.img}" width="30" height="30" style="border:0px"></span>`;
                }
                await game.gps.socket.executeAsUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent});
            }
        }
        return;
    }
    else if(workflowType === "savePost") return;
    
    let findValidTokens = game.gps.findValidTokens({initiatingToken: workflow.token, targetedToken: null, itemName: itemName, itemType: "feature", itemChecked: null, reactionCheck: true, sightCheck: true, rangeCheck: true, rangeTotal: 60, dispositionCheck: false, dispositionCheckType: "", workflowType: workflowType, workflowCombat: workflowCombat, gpsUuid: gpsUuid});
    
    let browserUser;

    for (const validTokenPrimary of findValidTokens) {
        let chosenItem = validTokenPrimary.actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === gpsUuid);
        let itemProperName = chosenItem?.name;
        const dialogTitlePrimary = `${validTokenPrimary.actor.name} | ${itemProperName}`;
        const dialogTitleGM = game.i18n.format("GAMBITSPREMADES.Dialogs.Common.WaitingForSelection", { actorName: validTokenPrimary.actor.name, itemName: itemProperName });
        
        browserUser = game.gps.getBrowserUser({ actorUuid: validTokenPrimary.actor.uuid });

        let dialogContent;

        if(workflowType === "save") {
            let targetAllies = Array.from(workflow.targets).filter(t => t.document.disposition === validTokenPrimary.document.disposition && MidiQOL.canSee(validTokenPrimary, t) && MidiQOL.computeDistance(validTokenPrimary, t, {wallsBlock: true, includeCover: true}) <= 60);
            let targetEnemies = Array.from(workflow.targets).filter(t => t.document.disposition !== validTokenPrimary.document.disposition && MidiQOL.canSee(validTokenPrimary, t) && MidiQOL.computeDistance(validTokenPrimary, t, {wallsBlock: true, includeCover: true}) <= 60);
            
            targetAllies = targetAllies.filter(t => workflow.saveRolls?.find(roll => roll.data.actorId === t.actor.id && roll.formula.includes("kl") && !roll.formula.includes("kh")) !== undefined);
            targetEnemies = targetEnemies.filter(t => workflow.saveRolls?.find(roll => roll.data.actorId === t.actor.id && !roll.formula.includes("kl") && roll.formula.includes("kh")) !== undefined);

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
                                            <select id="ally-token" class="gps-dialog-select"
                                                ${targetAllyUuids.length >= 1 && targetEnemyUuids.length >= 1 ? 
                                                    `${game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations.ClassFeatures.Sorcerer.ClockworkSoul.RestoreBalance.OnchangeResetenemyselect")} <option class="gps-dialog-option" value="" selected>${game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations.ClassFeatures.Sorcerer.ClockworkSoul.RestoreBalance.SelectAlly")}</option>` : 
                                                    '>'
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
                                            <select id="enemy-token" class="gps-dialog-select"
                                                ${targetAllyUuids.length >= 1 && targetEnemyUuids.length >= 1 ? 
                                                    `${game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations.ClassFeatures.Sorcerer.ClockworkSoul.RestoreBalance.OnchangeResetallyselect")} <option class="gps-dialog-option" value="" selected>${game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations.ClassFeatures.Sorcerer.ClockworkSoul.RestoreBalance.SelectEnemy")}</option>` : 
                                                    '>'
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

                target = target.object;
            }

            let targetAC = target?.actor.system.attributes.ac.value;
            let saveDC = workflow.saveActivity?.save?.dc?.value;
            let saveDice = workflow.saveRolls?.find(dice => dice.data.actorId === target.actor.id);
            let saveResult = saveDice?.dice[0].results[0].result + (saveDice?.total - saveDice?.dice[0].total);
            let baseAttack = workflow.attackRoll?.dice[0].results[0].result;
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
            if(source && source === "user") itemRoll = await MidiQOL.socket().executeAsUser("completeItemUse", browserUser, { itemData: chosenItem, actorUuid: validTokenPrimary.actor.uuid, options: options });
            else if(source && source === "gm") itemRoll = await MidiQOL.socket().executeAsUser("completeItemUse", gmUser, { itemData: chosenItem, actorUuid: validTokenPrimary.actor.uuid, options: options });

            if(!itemRoll) continue;

            await game.gps.addReaction({actorUuid: `${validTokenPrimary.actor.uuid}`});

            if(workflowType === "attack") {
                if(criticalSuccess) {
                    totalRoll = await new CONFIG.Dice.D20Roll('1d20').evaluateSync({maximize: true});
                    await workflow.setAttackRoll(totalRoll);
                }
                else if(criticalFailure) {
                    totalRoll = await new CONFIG.Dice.D20Roll('1d20').evaluateSync({minimize: true});
                    await workflow.setAttackRoll(totalRoll);
                }
                else {
                    baseRoll = await new CONFIG.Dice.BasicRoll(`${baseAttack}`).evaluate();
                    bonusRoll = await new CONFIG.Dice.BasicRoll(`${bonusAttack}`).evaluate();
                    totalRoll = await MidiQOL.addRollTo(baseRoll, bonusRoll);
                    await workflow.setAttackRoll(totalRoll);
                }

                if(workflow.token.document.disposition === validTokenPrimary.document.disposition) {
                    if(attackResult >= targetAC) {
                        if(criticalSuccess) chatContent = `<span style='text-wrap: wrap;'>${game.i18n.localize("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Sorcerer.ClockworkSoul.RestoreBalance.AllyDisadvantageRemovedCriticalHit")} <img src="${workflow.actor.img}" width="30" height="30" style="border:0px"></span>`;
                        else chatContent = `<span style='text-wrap: wrap;'>${game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Sorcerer.ClockworkSoul.RestoreBalance.AllyDisadvantageRemovedAttackHit", { attackResult: attackResult })} <img src="${workflow.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    }
                    else {
                        if(criticalFailure) chatContent = `<span style='text-wrap: wrap;'>${game.i18n.localize("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Sorcerer.ClockworkSoul.RestoreBalance.AllyDisadvantageRemovedCriticalMiss")} <img src="${workflow.actor.img}" width="30" height="30" style="border:0px"></span>`;
                        else chatContent = `<span style='text-wrap: wrap;'>${game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Sorcerer.ClockworkSoul.RestoreBalance.AllyDisadvantageRemovedAttackMiss", { attackResult: attackResult })} <img src="${workflow.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    }
                    await game.gps.socket.executeAsUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: totalRoll});
                    return;
                }
                else{
                    if(attackResult < targetAC) {
                        if(criticalFailure) chatContent = `<span style='text-wrap: wrap;'>${game.i18n.localize("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Sorcerer.ClockworkSoul.RestoreBalance.EnemyAdvantageRemovedCriticalMiss")} <img src="${workflow.actor.img}" width="30" height="30" style="border:0px"></span>`;
                        else chatContent = `<span style='text-wrap: wrap;'>${game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Sorcerer.ClockworkSoul.RestoreBalance.EnemyAdvantageRemovedAttackMiss", { attackResult: attackResult })} <img src="${workflow.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    }
                    else {
                        if(criticalSuccess) chatContent = `<span style='text-wrap: wrap;'>${game.i18n.localize("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Sorcerer.ClockworkSoul.RestoreBalance.EnemyAdvantageRemovedCriticalHit")} <img src="${workflow.actor.img}" width="30" height="30" style="border:0px"></span>`;
                        else chatContent = `<span style='text-wrap: wrap;'>${game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Sorcerer.ClockworkSoul.RestoreBalance.EnemyAdvantageRemovedAttackHit", { attackResult: attackResult })} <img src="${workflow.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    }
                    await game.gps.socket.executeAsUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: totalRoll});
                    return;
                }
            }
            else if(workflowType === "save") {
                if(saveResult >= saveDC && disposition === "ally") {
                    workflow.failedSaves.delete(target);
                    workflow.saves.add(target)
                }
                if(saveResult < saveDC && disposition === "enemy") {
                    workflow.failedSaves.add(target);
                    workflow.saves.delete(target)
                }

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