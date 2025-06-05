export async function restoreBalance({workflowData,workflowType,workflowCombat}) {
    const workflow = await MidiQOL.Workflow.getWorkflow(workflowData);
    if(!workflow) return;
    const gpsUuid = "6a8cd8d0-7a6b-42b1-9da7-d9d4aa54a7c1"
    if(workflow.item.flags["gambits-premades"]?.gpsUuid === gpsUuid) return;
    let itemName = "Restore Balance";
    let dialogId = gpsUuid;
    let gmUser = game.gps.getPrimaryGM();
    const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `${itemName} Timeout`));

    if(workflow.legendaryResistanceUsed) return;
    
    let findValidTokens = game.gps.findValidTokens({initiatingToken: workflow.token, targetedToken: null, itemName: itemName, itemType: "feature", itemChecked: null, reactionCheck: true, sightCheck: true, rangeCheck: true, rangeTotal: 60, dispositionCheck: false, dispositionCheckType: "", workflowType: workflowType, workflowCombat: workflowCombat, gpsUuid: gpsUuid});
    
    let browserUser;

    for (const validTokenPrimary of findValidTokens) {
        let chosenItem = validTokenPrimary.actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === gpsUuid);
        let itemProperName = chosenItem?.name;
        const dialogTitlePrimary = `${validTokenPrimary.actor.name} | ${itemProperName}`;
        const dialogTitleGM = `Waiting for ${validTokenPrimary.actor.name}'s selection | ${itemProperName}`;
        
        browserUser = game.gps.getBrowserUser({ actorUuid: validTokenPrimary.actor.uuid });

        let dialogContent;

        if(workflowType === "save") {
            let targetAllies = Array.from(workflow.targets).filter(t => t.document.disposition === validTokenPrimary.document.disposition && MidiQOL.canSee(validTokenPrimary, t) && MidiQOL.computeDistance(validTokenPrimary, t, {wallsBlock: true, includeCover: true}) <= 60);
            let targetEnemies = Array.from(workflow.targets).filter(t => t.document.disposition !== validTokenPrimary.document.disposition && MidiQOL.canSee(validTokenPrimary, t) && MidiQOL.computeDistance(validTokenPrimary, t, {wallsBlock: true, includeCover: true}) <= 60);
            
            targetAllies = targetAllies.filter(t => workflow.saveRolls?.find(roll => roll.data.actorId === t.actor.id && roll.formula.includes("kl") && !roll.formula.includes("kh")) !== undefined);
            targetEnemies = targetEnemies.filter(t => workflow.saveRolls?.find(roll => roll.data.actorId === t.actor.id && !roll.formula.includes("kl") && roll.formula.includes("kh")) !== undefined);

            if((!targetAllies || targetAllies?.length === 0) && (!targetEnemies || targetEnemies?.length === 0)) continue;

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
                            <p class="gps-dialog-paragraph">Would you like to use your reaction to initiate ${itemProperName}? ${targetAllyUuids.length >= 1 && targetEnemyUuids.length === 0 ? 'Choose an ally to remove disadvantage from below.' : targetAllyUuids.length === 0 && targetEnemyUuids.length >= 1 ? 'Choose an enemy to remove advantage from below.' : targetAllyUuids.length >= 1 && targetEnemyUuids.length >= 1 ? 'Choose an ally to remove disadvantage from, or an enemy to remove advantage from below.' : ""}</p>
                            <div class="gps-dialog-flex-wrapper">
                                <div class="gps-dialog-select-container">
                                    ${targetAllyUuids.length >= 1 ? 
                                        `<div class="gps-dialog-flex">
                                            <label for="ally-token" class="gps-dialog-label">Ally:</label>
                                            <select id="ally-token" class="gps-dialog-select"
                                                ${targetAllyUuids.length >= 1 && targetEnemyUuids.length >= 1 ? 
                                                    `onchange="resetEnemySelect()"> <option class="gps-dialog-option" value="" selected>Select Ally:</option>` : 
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
                                            <label for="enemy-token" class="gps-dialog-label">Enemy:</label>
                                            <select id="enemy-token" class="gps-dialog-select"
                                                ${targetAllyUuids.length >= 1 && targetEnemyUuids.length >= 1 ? 
                                                    `onchange="resetAllySelect()"> <option class="gps-dialog-option" value="" selected>Select Enemy:</option>` : 
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
                            <i class="fas fa-pause" id="pauseIcon_${dialogId}" style="margin-right: 5px;"></i>Pause
                        </button>
                    </div>
                </div>
            `;
        }
        else if(workflowType === "attack") {
            if(workflow.token.document.disposition === validTokenPrimary.document.disposition && (!workflow.disadvantage && !workflow.attackRoll.formula.includes("kl") || (workflow.advantage === true && workflow.disadvantage === true) || (workflow.attackRoll.formula.includes("kl") && workflow.attackRoll.formula.includes("kh")))) continue;
            if(workflow.token.document.disposition !== validTokenPrimary.document.disposition && (!workflow.advantage && !workflow.attackRoll.formula.includes("kh") || (workflow.advantage === true && workflow.disadvantage === true) || (workflow.attackRoll.formula.includes("kl") && workflow.attackRoll.formula.includes("kh")))) continue;

            dialogContent = `
                <div class="gps-dialog-container">
                    <div class="gps-dialog-section">
                        <div class="gps-dialog-content">
                            <div>
                                <div class="gps-dialog-flex">
                                    <p class="gps-dialog-paragraph">Would you like to use your reaction to initiate ${itemProperName} ${workflow.token.document.disposition === validTokenPrimary.document.disposition ? 'to remove disadvantage from your Ally?' : workflow.token.document.disposition !== validTokenPrimary.document.disposition ? 'to remove advantage from your Enemy?' : ""}</p>
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
            let chatContent;

            let target;
            if(workflowType === "attack") target = await workflow.targets.first();
            else if(workflowType === "save") {
                if(allyTokenUuid) target = await fromUuid(allyTokenUuid);
                else if(enemyTokenUuid) target = await fromUuid(enemyTokenUuid);

                target = target.object;
            }

            let targetAC = target?.actor.system.attributes.ac.value;
            let saveDC = workflow.saveItem?.system.save.dc;
            let saveDice = workflow.saveRolls?.find(dice => dice.data.actorId === target.actor.id)
            let saveResult = saveDice?.dice[0].results[0].result + (saveDice?.total - saveDice?.dice[0].total);
            let attackResult = workflow.attackRoll?.dice[0].results[0].result + (workflow.attackRoll?.total - workflow.attackRoll?.dice[0].total);

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

            if(workflowType === "attack" && workflow.token.document.uuid === validTokenPrimary.document.uuid) {
                if((attackResult >= targetAC && !workflow.hitTargets.first()) || workflow.hitTargets.first()) {
                    if (attackResult >= targetAC && !workflow.hitTargets.first()) workflow.hitTargets.add(target);

                    chatContent = `<span style='text-wrap: wrap;'>Your ally had their source of disadvantage removed and were able to hit their target with a ${attackResult}. <img src="${workflow.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    await game.gps.socket.executeAsUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent});
                    return;
                }
                else if(!workflow.hitTargets.first()) {
                    chatContent = `<span style='text-wrap: wrap;'>Your ally had their source of disadvantage removed but were still unable to hit their target with a ${attackResult}. <img src="${workflow.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    await game.gps.socket.executeAsUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent});
                    return;
                }
            }
            else if(workflowType === "attack" && workflow.token.document.uuid !== validTokenPrimary.document.uuid) {
                if((attackResult < targetAC && workflow.hitTargets.first()) || !workflow.hitTargets.first()) {
                    if(attackResult < targetAC && workflow.hitTargets.first()) workflow.hitTargets.delete(target);

                    chatContent = `<span style='text-wrap: wrap;'>Your enemy had their source of advantage removed and were unable to hit their target with a ${attackResult}. <img src="${workflow.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    await game.gps.socket.executeAsUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent});
                    return;
                }
                else if(workflow.hitTargets.first()) {
                    chatContent = `<span style='text-wrap: wrap;'>Your enemy had their source of advantage removed but were still able to hit their target with a ${attackResult}. <img src="${workflow.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    await game.gps.socket.executeAsUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent});
                    return;
                }
            }
            else if(workflowType === "save" && allyTokenUuid) {
                if((saveResult >= saveDC && workflow.failedSaves.has(target)) || !workflow.failedSaves.has(target)) {
                    if (saveResult >= saveDC && workflow.failedSaves.has(target)) workflow.failedSaves.delete(target);

                    chatContent = `<span style='text-wrap: wrap;'>Your ally had their source of disadvantage removed and were able to save against the effect with a ${saveResult}. <img src="${target.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    await game.gps.socket.executeAsUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent});
                    return;
                }
                else if(workflow.failedSaves.has(target)) {
                    chatContent = `<span style='text-wrap: wrap;'>Your ally had their source of disadvantage removed but were still unable to save against the effect with a ${saveResult}. <img src="${target.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    await game.gps.socket.executeAsUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent});
                    return;
                }
            }
            else if(workflowType === "save" && enemyTokenUuid) {
                if((saveResult < saveDC && !workflow.failedSaves.has(target)) || workflow.failedSaves.has(target)) {
                    if (saveResult < saveDC && !workflow.failedSaves.has(target)) workflow.failedSaves.add(target);

                    chatContent = `<span style='text-wrap: wrap;'>Your enemy had their source of disadvantage removed and were unable to save against the effect with a ${saveResult}. <img src="${target.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    await game.gps.socket.executeAsUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent});
                    return;
                }
                else if(!workflow.failedSaves.has(target)) {
                    chatContent = `<span style='text-wrap: wrap;'>Your enemy had their source of disadvantage removed but were still able to save against the effect with a ${saveResult}. <img src="${target.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    await game.gps.socket.executeAsUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent});
                    return;
                }
            }
        }
    }
}