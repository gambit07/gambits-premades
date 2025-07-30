export async function witchesHex({workflowData,workflowType,workflowCombat}) {
    const workflow = await MidiQOL.Workflow.getWorkflow(workflowData);
    if(!workflow) return;
    const gpsUuid = "02fc5000-7f5d-462e-94ac-42a27f453a8f";
    const gpsUuidFlamesEmbrace = "ac1b7150-bf0c-4a83-a815-607031ee9e07"
    if(workflow.item.flags["gambits-premades"]?.gpsUuid === gpsUuid) return;
    let itemName = "Witches Hex";
    let dialogId = gpsUuid;
    let gmUser = game.gps.getPrimaryGM();
    
    if(workflowType === "save" && workflow.saveResults.length === 0) return;
    if(workflowType === "attack" && (workflow.isCritical === true || workflow.isFumble === true)) return;

    let findValidTokens;

    if(workflowType === "attack") {
        findValidTokens = game.gps.findValidTokens({initiatingToken: workflow.token, targetedToken: null, itemName: itemName, itemType: "feature", itemChecked: [itemName], reactionCheck: true, sightCheck: true, rangeCheck: true, rangeTotal: 60, dispositionCheck: true, dispositionCheckType: "enemy", workflowType: workflowType, workflowCombat: workflowCombat, gpsUuid: gpsUuid});
    }
    else if(workflowType === "save") {
        findValidTokens = game.gps.findValidTokens({initiatingToken: workflow.token, targetedToken: null, itemName: itemName, itemType: "feature", itemChecked: [itemName], reactionCheck: true, sightCheck: false, rangeCheck: false, rangeTotal: null, dispositionCheck: true, dispositionCheckType: "ally", workflowType: workflowType, workflowCombat: workflowCombat, gpsUuid: gpsUuid});
    }
    
    let browserUser;

    for (const validTokenPrimary of findValidTokens) {
        let chosenItem = validTokenPrimary.actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === gpsUuid);
        let itemProperName = chosenItem?.name;
        let cprConfig = game.gps.getCprConfig({itemUuid: chosenItem.uuid});
        const { animEnabled } = cprConfig;
        const dialogTitlePrimary = `${validTokenPrimary.actor.name} | ${itemProperName}`;
        const dialogTitleGM = `Waiting for ${validTokenPrimary.actor.name}'s selection | ${itemProperName}`;
        const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `${itemName} Timeout`));
        let hexDie = validTokenPrimary.actor.system.scale["kp-witch"]["hex-die"]?.die;
        if(!hexDie) {
            ui.notifications.error("You must have a Witch scale for this actor named 'kp-witch'")
            continue;
        }
        browserUser = game.gps.getBrowserUser({ actorUuid: validTokenPrimary.actor.uuid });
        let content;
        let dialogContent;

        if(workflowType === "save") {
            let targets = Array.from(workflow.saves).filter(t => t.document.disposition !== validTokenPrimary.document.disposition && MidiQOL.canSee(validTokenPrimary, t) && MidiQOL.computeDistance(validTokenPrimary, t, {wallsBlock: true, includeCover: true}) <= 60);

            const targetUuids = targets.map(t => t.document.uuid);
            const targetNames = targets.map(t => t.document.name);
            if(targetUuids.length === 0) continue;

            targetUuids.map((uuid, index) => 
                `<option value="${uuid}">${targetNames[index]}</option>`
            ).join('');
            
            dialogContent = `
                <div class="gps-dialog-container">
                    <div class="gps-dialog-section">
                        <div class="gps-dialog-content">
                            <p class="gps-dialog-paragraph">Would you like to use your reaction to cast ${itemProperName} to try and reduce an enemies saving throw? Choose an enemy to target below.</p>
                            <div>
                                <div class="gps-dialog-flex">
                                    <label for="enemy-token" class="gps-dialog-label">Target:</label>
                                    <select id="enemy-token" class="gps-dialog-select">
                                        ${targetNames.map((name, index) => `<option class="gps-dialog-option" value="${targetUuids[index]}">${name}</option>`).join('')}
                                    </select>
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

            content = `<span style='text-wrap: wrap;'><img src="${validTokenPrimary.actor.img}" style="width: 25px; height: auto;" /> ${validTokenPrimary.actor.name} has a reaction available for a save triggering ${itemProperName}.</span>`
        }

        if(workflowType === "attack") {
            dialogContent = `
            <div class="gps-dialog-container">
                <div class="gps-dialog-section">
                    <div class="gps-dialog-content">
                        <div>
                            <div class="gps-dialog-flex">
                                <p class="gps-dialog-paragraph">Would you like to use your reaction to initiate ${itemProperName} to try and reduce the enemies attack roll?</p>
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

            content = `<span style='text-wrap: wrap;'><img src="${validTokenPrimary.actor.img}" style="width: 25px; height: auto;" /> ${validTokenPrimary.actor.name} has a reaction available for an attack triggering ${itemProperName}.</span>`
        }
            
        let chatData = { user: gmUser, content: content, roll: false, whisper: gmUser };
        let notificationMessage = await MidiQOL.socket().executeAsUser("createChatMessage", gmUser, { chatData });

        let result;
        
        if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser !== gmUser) {
            let userDialogArgs = { dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: "user",type: "multiDialog", browserUser: browserUser, notificationId: notificationMessage._id };
            
            let gmDialogArgs = { dialogTitle:dialogTitleGM,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: "gm",type: "multiDialog", notificationId: notificationMessage._id };
        
            result = await game.gps.socket.executeAsUser("handleDialogPromises", gmUser, {userDialogArgs, gmDialogArgs});
        } else {
            result = await game.gps.socket.executeAsUser("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: gmUser === browserUser ? "gm" : "user",type:"singleDialog", notificationId: notificationMessage._id});
        }
                
        const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, selectedItemUuid, favoriteCheck, source, type } = result || {};

        if (!userDecision) {
            continue;
        }
        else if (userDecision) {
            let target;
            let targetDocument;
            let chatContent;
            if(workflowType === "attack") {
                target = workflow.token;
            }
            if(workflowType === "save") {
                targetDocument = await fromUuid(enemyTokenUuid);
                target = targetDocument.object;
            }

            const options = {
                showFullCard: false,
                createWorkflow: true,
                versatile: false,
                configureDialog: true,
                targetUuids: [`${target.document.uuid}`],
            };

            let itemRoll;
            if(source && source === "user") itemRoll = await MidiQOL.socket().executeAsUser("completeItemUse", browserUser, { itemData: chosenItem, actorUuid: validTokenPrimary.actor.uuid, options: options });
            else if(source && source === "gm") itemRoll = await MidiQOL.socket().executeAsUser("completeItemUse", gmUser, { itemData: chosenItem, actorUuid: validTokenPrimary.actor.uuid, options: options });
            if(!itemRoll) continue;

            if(animEnabled) {
                new Sequence()
                .effect()
                    .file("animated-spell-effects-cartoon.misc.all seeing eye")
                    .fadeIn(250)
                    .fadeOut(250)
                    .atLocation(target)
                    .playbackRate(0.9)
                .play()
            }

            await game.gps.addReaction({actorUuid: `${validTokenPrimary.actor.uuid}`});

            let actorLevel = validTokenPrimary.actor.system.details.level;
            let flamesEmbrace = validTokenPrimary.actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === gpsUuidFlamesEmbrace);
            
            if(actorLevel >= 6 && flamesEmbrace) {
                let saveResult;
                if(source && source === "user") saveResult = await game.gps.socket.executeAsUser("gpsActivityUse", browserUser, {itemUuid: flamesEmbrace.uuid, identifier: "syntheticSave", targetUuid: target.document.uuid});
                else if(source && source === "gm") saveResult = await game.gps.socket.executeAsUser("gpsActivityUse", gmUser, {itemUuid: flamesEmbrace.uuid, identifier: "syntheticSave", targetUuid: target.document.uuid});
                if(!saveResult) continue;

                if(saveResult.failedSaves.size !== 0) {
                    if(animEnabled) {
                        new Sequence()
                        .effect()
                            .name(`${target.id}.FlamesEmbrace`)
                            .file("animated-spell-effects-cartoon.fire.18")
                            .attachTo(target, { align: "top", edge: "on" })
                            .persist()
                            .scaleToObject(0.5)
                            .filter("ColorMatrix", { hue: 70 })
                        .play()
                    }
                }
            }

            let reroll;

            if(workflowType === "save") {
                const saveSetting = workflow.workflowOptions.noOnUseMacro;
                workflow.workflowOptions.noOnUseMacro = true;
                let saveDC = workflow.activityHasSave.dc.value;
                

                if(source && source === "user") reroll = await game.gps.socket.executeAsUser("rollAsUser", browserUser, { rollParams: `1${hexDie}`, type: workflowType });
                if(source && source === "gm") reroll = await game.gps.socket.executeAsUser("rollAsUser", gmUser, { rollParams: `1${hexDie}`, type: workflowType });
                let rollFound = workflow.saveRolls.find(roll => roll.data.tokenUuid === enemyTokenUuid);
                let rollTotal = rollFound.total;
                let modifiedRoll = await new Roll(`${rollTotal} - ${reroll.total}`).evaluate();

                workflow.workflowOptions.noOnUseMacro = saveSetting;

                if(modifiedRoll.total < saveDC) {
                    workflow.saves.delete(target);
                    workflow.failedSaves.add(target);

                    chatContent = `<span style='text-wrap: wrap;'>The creature was hexed and failed their save. <img src="${target.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    await game.gps.socket.executeAsUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: modifiedRoll});
                    return;
                }
                else {
                    chatContent = `<span style='text-wrap: wrap;'>The creature was hexed but still succeeded their save. <img src="${target.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    await game.gps.socket.executeAsUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: modifiedRoll});
                    continue;
                }
            }
            else if(workflowType === "attack") {
                let targetAC = workflow.targets.first().actor.system.attributes.ac.value;
                const saveSetting = workflow.workflowOptions.noOnUseMacro;
                workflow.workflowOptions.noOnUseMacro = true;

                if(source && source === "user") reroll = await game.gps.socket.executeAsUser("rollAsUser", browserUser, { rollParams: `1${hexDie}`, type: workflowType });
                if(source && source === "gm") reroll = await game.gps.socket.executeAsUser("rollAsUser", gmUser, { rollParams: `1${hexDie}`, type: workflowType });
                let rerollNew = await new Roll(`${workflow.attackRoll.result} - ${reroll.total}`).evaluate();

                await workflow.setAttackRoll(rerollNew);
                workflow.workflowOptions.noOnUseMacro = saveSetting;

                if(rerollNew.total < targetAC) {
                    chatContent = `<span style='text-wrap: wrap;'>The creature was hexed reducing their attack by ${reroll.total}, and were unable to hit their target. <img src="${workflow.token.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    await game.gps.socket.executeAsUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: rerollNew});
                    return;
                }
                else {
                    chatContent = `<span style='text-wrap: wrap;'>The creature was hexed reducing their attack by ${reroll.total}, but were still able to hit their target. <img src="${workflow.token.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    await game.gps.socket.executeAsUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: rerollNew});
                    continue;
                }
            }
        }
    }
}