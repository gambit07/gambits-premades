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
        const dialogTitleGM = `Waiting for ${validTokenPrimary.actor.name}'s selection | ${itemName}`;
        
        browserUser = game.gps.getBrowserUser({ actorUuid: validTokenPrimary.actor.uuid });

        let dialogContent;
        const rollDetailSetting = MidiQOL.safeGetGameSetting('midi-qol', 'ConfigSettings').hideRollDetails;

        if(workflowType === "save") {
            let enemyTargets = Array.from(workflow.saves).filter(t => t.document.disposition !== validTokenPrimary.document.disposition && MidiQOL.canSee(validTokenPrimary, t) && MidiQOL.computeDistance(validTokenPrimary, t, {wallsBlock: true, includeCover: true}) <= 30);
            let allyTargets = Array.from(workflow.failedSaves).filter(t => t.document.disposition === validTokenPrimary.document.disposition && MidiQOL.canSee(validTokenPrimary, t) && MidiQOL.computeDistance(validTokenPrimary, t, {wallsBlock: true, includeCover: true}) <= 30);

            if(enemyTargets.length === 0 && allyTargets.length === 0) continue;

            const enemyTargetUuids = enemyTargets.map(t => t.document.uuid);
            const enemyTargetNames = enemyTargets.map(t => t.document.name);
            const allyTargetUuids = enemyTargets.map(t => t.document.uuid);
            const allyTargetNames = enemyTargets.map(t => t.document.name);
            let dialogDescription;

            if(enemyTargets.length > 0 && allyTargets.length > 0) dialogDescription = "Enemies succeeded and Allies failed their saving throws. Choose an Enemy or Ally to re-roll below. If both are chosen, the reroll will apply to an enemy.";
            else if(enemyTargets.length > 0 && allyTargets.length === 0) dialogDescription = "Enemies succeeded their saving throws. Choose an Enemy to re-roll below.";
            else if(enemyTargets.length === 0 && allyTargets.length > 0) dialogDescription = "Allies failed their saving throws. Choose an Ally to re-roll below.";
        
            dialogContent = `
                <div class="gps-dialog-container">
                    <div class="gps-dialog-section">
                        <div class="gps-dialog-content">
                            <p class="gps-dialog-paragraph">Would you like to use your reaction to initiate ${itemProperName}? ${dialogDescription}</p>
                            <div class="gps-dialog-flex-wrapper">
                                <div class="gps-dialog-select-container">
                                    <div class="gps-dialog-flex">
                                    <label for="enemy-token" class="gps-dialog-label">Enemy Target:</label>
                                    ${enemyTargetNames.length >= 1 ? 
                                        `<select id="enemy-token" class="gps-dialog-select">
                                            <option value="">-- Select Enemy --</option>
                                            ${enemyTargetNames.map((name, index) => `<option class="gps-dialog-option" value="${enemyTargetUuids[index]}">${name}</option>`).join('')}
                                        </select>` : '<div style="padding: 4px; width: 100%; box-sizing: border-box; line-height: normal;"> No valid enemies in range.</div>'
                                    }
                                    </div>
                                    <div class="gps-dialog-flex">
                                    <label for="ally-token" class="gps-dialog-label">Ally Target:</label>
                                    ${allyTargetNames.length >= 1 ? 
                                        `<select id="ally-token" class="gps-dialog-select">
                                            <option value="">-- Select Ally --</option>
                                            ${allyTargetNames.map((name, index) => `<option class="gps-dialog-option" value="${allyTargetUuids[index]}">${name}</option>`).join('')}
                                        </select>` : '<div style="padding: 4px; width: 100%; box-sizing: border-box; line-height: normal;"> No valid allies in range.</div>'
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
                            <i class="fas fa-pause" id="pauseIcon_${dialogId}" style="margin-right: 5px;"></i>Pause
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
                                    <p class="gps-dialog-paragraph">Would you like to use your reaction to cast ${itemProperName}? ${["none", "detailsDSN", "details"].includes(rollDetailSetting) ? `An enemy successfully hit your ally with a ${workflow.attackTotal}.` : "An enemy successfully hit your ally."}</p>
                                    <div id="image-container" class="gps-dialog-image-container">
                                        <img id="img_${dialogId}" src="${chosenItem.img}" class="gps-dialog-image">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="gps-dialog-button-container">
                        <button id="pauseButton_${dialogId}" type="button" class="gps-dialog-button">
                            <i class="fas fa-pause" id="pauseIcon_${dialogId}" style="margin-right: 5px;"></i>Pause
                        </button>
                    </div>
                </div>
            `;
        }

        let content = `<span style='text-wrap: wrap;'><img src="${validTokenPrimary.actor.img}" style="width: 25px; height: auto;" /> ${validTokenPrimary.actor.name} has a reaction available for a save triggering ${itemProperName}.</span>`
        let chatData = { user: gmUser, content: content, roll: false, whisper: gmUser };
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
                        chatContent = `<span style='text-wrap: wrap;'>Your enemy was chronally shifted and failed their save. <img src="${workflowTarget.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    }
                    else {
                        workflow.failedSaves.delete(workflowTarget);
                        workflow.saves.add(workflowTarget);
                        chatContent = `<span style='text-wrap: wrap;'>Your ally was chronally shifted and succeeded their save. <img src="${workflowTarget.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    }

                    await game.gps.socket.executeAsUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: reroll.saveRolls});
                    return;
                }

                else {
                    if(enemyTokenUuid) {
                        chatContent = `<span style='text-wrap: wrap;'>Your enemy was chronally shifted but still succeeded their save. <img src="${workflowTarget.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    }
                    else {
                        chatContent = `<span style='text-wrap: wrap;'>Your ally was chronally shifted but still failed their save. <img src="${workflowTarget.actor.img}" width="30" height="30" style="border:0px"></span>`;
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
                    chatContent = `<span style='text-wrap: wrap;'>The creature was chronally shifted, and failed their attack. <img src="${workflow.token.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    await game.gps.socket.executeAsUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: reroll});
                    return;
                }

                else {
                    chatContent = `<span style='text-wrap: wrap;'>The creature was chronally shifted, but were still able to hit their target. <img src="${workflow.token.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    await game.gps.socket.executeAsUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: reroll});
                    continue;
                }
            }
        }
    }
}