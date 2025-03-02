export async function taleOfHubris({workflowData,workflowType,workflowCombat}) {
    const workflow = await MidiQOL.Workflow.getWorkflow(workflowData) ?? null;
    if(!workflow && workflowCombat === true) return;
    const gpsUuid = "476f9e94-ea67-4413-aade-ea2bab60fcdd";
    if(workflow?.item.flags["gambits-premades"]?.gpsUuid === gpsUuid) return;
    if(!workflow.isCritical) return;
    let itemName = "Tale of Hubris";
    let dialogId = gpsUuid;
    let initiatingToken = workflow.token;
    let gmUser = game.gps.getPrimaryGM();
    const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `${itemName} Timeout`));

    let findValidTokens = game.gps.findValidTokens({initiatingToken: initiatingToken, targetedToken: workflow.hitTargets.first(), itemName: itemName, itemType: "feature", itemChecked: ["bardic inspiration"], reactionCheck: true, sightCheck: true, rangeCheck: true, rangeTotal: 60, dispositionCheck: true, dispositionCheckType: "enemy", workflowType: workflowType, workflowCombat: workflowCombat, gpsUuid: gpsUuid});

    let browserUser;

    for (const validTokenPrimary of findValidTokens) {
        const itemData = validTokenPrimary.actor.items.find(i => i.name.toLowerCase() === "bardic inspiration");
        let chosenItem = validTokenPrimary.actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === gpsUuid);
        let itemProperName = chosenItem?.name;
        const dialogTitlePrimary = `${validTokenPrimary.actor.name} | ${itemProperName}`;
        const dialogTitleGM = `Waiting for ${validTokenPrimary.actor.name}'s selection | ${itemProperName}`;
        browserUser = game.gps.getBrowserUser({ actorUuid: validTokenPrimary.actor.uuid });
        let chatActor;

        let dialogContent = `
            <div class="gps-dialog-container">
                <div class="gps-dialog-section">
                    <div class="gps-dialog-content">
                        <div>
                            <div class="gps-dialog-flex">
                                <p class="gps-dialog-paragraph">Would you like to use your reaction to initiate ${itemProperName} for this nat 20 ${workflowType} roll?</p>
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

        let result;
        let content = `<span style='text-wrap: wrap;'><img src="${validTokenPrimary.actor.img}" style="width: 25px; height: auto;" /> ${validTokenPrimary.actor.name} has a reaction available for a roll triggering ${itemProperName}.</span>`
        let chatData = { user: gmUser, content: content, roll: false, whisper: gmUser };
        let notificationMessage = await MidiQOL.socket().executeAsUser("createChatMessage", gmUser, { chatData });

        if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser !== gmUser) {
            let userDialogArgs = { dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: "user",type: "multiDialog", browserUser: browserUser, notificationId: notificationMessage._id };
            
            let gmDialogArgs = { dialogTitle:dialogTitleGM,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: "gm",type: "multiDialog", notificationId: notificationMessage._id };
        
            result = await game.gps.socket.executeAsUser("handleDialogPromises", gmUser, {userDialogArgs, gmDialogArgs});
        } else {
            result = await game.gps.socket.executeAsUser("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: gmUser === browserUser ? "gm" : "user",type:"singleDialog", notificationId: notificationMessage._id});
        }

        const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, source, type } = result;

        if (!userDecision) {
            continue;
        }
        else if (userDecision) {
            await game.gps.gpsActivityUse({itemUuid: chosenItem.uuid, identifier: "syntheticUse", targetUuid: initiatingToken.document.uuid});

            if(itemData) {
                await itemData.update({ 'system.uses.spent' : itemData.system.uses.spent + 1 })
            }

            let contentOutcome = `<span style='text-wrap: wrap;'>You use ${itemProperName} to increase the critical threshold on the creature due to its nat 20.<br/><img src="${initiatingToken.actor.img}" width="30" height="30" style="border:0px"></span>`;
            let actorPlayer = MidiQOL.playerForActor(validTokenPrimary.actor);
            let chatDataOutcome = {
            user: actorPlayer.id,
            speaker: ChatMessage.getSpeaker({ token: validTokenPrimary }),
            content: contentOutcome
            };
            ChatMessage.create(chatDataOutcome);

            return;
        }
    }
}