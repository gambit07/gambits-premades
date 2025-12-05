export async function temporalShunt({ workflowData,workflowType,workflowCombat }) {
    const workflow = await MidiQOL.Workflow.getWorkflow(`${workflowData}`);
    if(!workflow) return;
    const gpsUuid = "294601e8-ce2f-42e2-b9a0-8e1050f8c78e";
    if(workflow.item.flags["gambits-premades"]?.gpsUuid === gpsUuid) return;
    let itemName = "Temporal Shunt";
    let dialogId = gpsUuid;
    let gmUser = game.gps.getPrimaryGM();
    let itemRoll;

    const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `${itemName} Timeout`));
    let initialTarget = workflow.token;
    let targets = [workflow.token.document.uuid];
    let browserUser;

    let findValidTokens = game.gps.findValidTokens({initiatingToken: initialTarget, targetedToken: null, itemName: itemName, itemType: "spell", itemChecked: null, reactionCheck: true, sightCheck: true, rangeCheck: true, rangeTotal: 120, dispositionCheck: true, dispositionCheckType: "enemy", workflowType: workflowType, workflowCombat: workflowCombat, gpsUuid: gpsUuid});

    if(findValidTokens.length === 0 || !findValidTokens) return;

    for (const validTokenPrimary of findValidTokens) {
        let chosenItem = validTokenPrimary.actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === gpsUuid);
        let itemProperName = chosenItem?.name;
        const dialogTitlePrimary = `${validTokenPrimary.actor.name} | ${itemProperName}`;
        const dialogTitleGM = `Waiting for ${validTokenPrimary.actor.name}'s selection | ${itemProperName}`;
        browserUser = game.gps.getBrowserUser({ actorUuid: validTokenPrimary.actor.uuid });

        let dialogContent = `
            <div class="gps-dialog-container">
                <div class="gps-dialog-section">
                    <div class="gps-dialog-content">
                        <div>
                            <div class="gps-dialog-flex">
                                <p class="gps-dialog-paragraph">Would you like to use your reaction to use ${itemProperName}?</p>
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

        let content = `<span style='text-wrap: wrap;'><img src="${validTokenPrimary.actor.img}" style="width: 25px; height: auto;" /> ${validTokenPrimary.actor.name} has a reaction available for a spell or attack triggering ${itemProperName}.</span>`;
        let chatData = { user: gmUser, content: content, roll: false };
        let notificationMessage = await MidiQOL.socket().executeAsUser("createChatMessage", gmUser, { chatData });

        let result;

        if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser !== gmUser) {
            let userDialogArgs = { dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: "user",type: "multiDialog", browserUser: browserUser, notificationId: notificationMessage._id };
            
            let gmDialogArgs = { dialogTitle:dialogTitleGM,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: "gm",type: "multiDialog", notificationId: notificationMessage._id };
        
            result = await game.gps.socket.executeAsUser("handleDialogPromises", gmUser, {userDialogArgs, gmDialogArgs});
        } else {
            result = await game.gps.socket.executeAsUser("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: gmUser === browserUser ? "gm" : "user",type:"singleDialog", notificationId: notificationMessage._id});
        }
                
        const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, source, type } = result || {};

        if (!userDecision) {
            continue;
        }
        else if (userDecision) {
            const options = {
                showFullCard: false,
                createWorkflow: true,
                versatile: false,
                configureDialog: true,
                targetUuids: [initialTarget.document.uuid]
            };

            if(source && source === "user") itemRoll = await game.gps.socket.executeAsUser("remoteCompleteItemUse", browserUser, { itemUuid: chosenItem.uuid, actorUuid: validTokenPrimary.actor.uuid, options: options });
            else if(source && source === "gm") itemRoll = await game.gps.socket.executeAsUser("remoteCompleteItemUse", gmUser, { itemUuid: chosenItem.uuid, actorUuid: validTokenPrimary.actor.uuid, options: options });

            if(!itemRoll.baseLevel && !itemRoll.castLevel && !itemRoll.checkHits && !itemRoll.itemType) continue;

            let itemRollCastLevel = itemRoll.castLevel;
            let numTargets = itemRollCastLevel - 5;
            let targetsNearby;

            if(itemRollCastLevel > 5) targetsNearby = MidiQOL.findNearby(null, initialTarget, 30, { includeToken: false })?.filter(t => t.document.disposition !== validTokenPrimary.document.disposition);

            if(itemRollCastLevel > 5 && targetsNearby.length !== 0) {
                const targetUuids = targetsNearby.map(t => t.document.uuid);
                const targetNames = targetsNearby.map(t => t.document.name);

                let targetRows = targetUuids.map((uuid, index) => 
                    `<tr>
                        <td style="text-align: center; vertical-align: middle;">
                            <input type="checkbox" value="${uuid}" class="enemy-tokens" style="margin: 0 auto;"> ${targetNames[index]}
                        </td>
                    </tr>`
                ).join('');

                let dialogContent = `
                    <div class="gps-dialog-container">
                        <div class="gps-dialog-section">
                            <div class="gps-dialog-content">
                                <p class="gps-dialog-paragraph">What other targets would you like to be effected by ${itemProperName}? You can select up to ${numTargets} additional ${numTargets === 1 ? 'target' : 'targets'} below.</p>
                                <div>
                                    <div class="gps-dialog-flex">
                                        <table style="background-color: rgba(181, 99, 69, 0.2);" width="100%"><tbody>${targetRows}</tbody></table>
                                        <div id="image-container" class="gps-dialog-image-container">
                                            <img id="img_${dialogId}-1" src="${chosenItem.img}" class="gps-dialog-image">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="gps-dialog-button-container">
                            <button id="pauseButton_${dialogId}-1" type="button" class="gps-dialog-button">
                                <i class="fas fa-pause" id="pauseIcon_${dialogId}-1" style="margin-right: 5px;"></i>Pause
                            </button>
                        </div>
                    </div>
                `;
        
                let result;
        
                if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser !== gmUser) {
                    let userDialogArgs = { dialogTitle:dialogTitlePrimary,dialogContent,dialogId: `${dialogId}-1`,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,numTargets: numTargets, source: "user",type: "multiDialog", browserUser: browserUser };
                    
                    let gmDialogArgs = { dialogTitle:dialogTitleGM,dialogContent,dialogId: `${dialogId}-1`,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,numTargets: numTargets, source: "gm",type: "multiDialog" };
                
                    result = await game.gps.socket.executeAsUser("handleDialogPromises", gmUser, {userDialogArgs, gmDialogArgs});
                } else {
                    result = await game.gps.socket.executeAsUser("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId: `${dialogId}-1`,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,numTargets: numTargets, source: gmUser === browserUser ? "gm" : "user",type:"singleDialog"});
                }
                        
                const { userDecision, enemyTokenUuid, enemyTokenUuids, allyTokenUuid, damageChosen, source, type } = result || {};
                
                targets.push(...enemyTokenUuids);
            }

            let chatContent;
            const saveResult = await game.gps.gpsActivityUse({itemUuid: chosenItem.uuid, identifier: "syntheticSave", targetUuid: targets});

            for(let failedTarget of saveResult.failedSavesObject) {
                failedTarget = await fromUuid(failedTarget.document.uuid);
                failedTarget = failedTarget.object;

                chatContent = `<span style='text-wrap: wrap;'>The targets ${workflowType} roll was successfully interrupted and they disappear.<br><img src="${failedTarget.actor.img}" width="30" height="30" style="border:0px"></span>`;

                await game.gps.socket.executeAsUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent});
                
                let cprConfig = game.gps.getCprConfig({itemUuid: chosenItem.uuid});
                const { animEnabled } = cprConfig;
                if(animEnabled) {
                    for(let target of targets) {
                        target = await fromUuid(target);
                        target = target.object;
                        new Sequence()
                        .effect()
                            .file("jb2a.portals.horizontal.vortex.black")
                            .fadeIn(500)
                            .fadeOut(500)
                            .atLocation(target)
                            .scaleToObject(2)
                        .play()
                    }
                } 
            }

            workflow.aborted = true;
        }
    }
}