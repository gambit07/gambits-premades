export async function indomitable2024({workflowData,workflowType,workflowCombat}) {
    const workflow = await MidiQOL.Workflow.getWorkflow(workflowData);
    if(!workflow) return;
    const gpsUuid = "7ca704b5-7d13-4240-a4dc-fa908dc7bd10";
    if(workflow.item.flags["gambits-premades"]?.gpsUuid === gpsUuid) return;
    let itemName = "Indomitable";
    let dialogId = gpsUuid;
    let gmUser = game.gps.getPrimaryGM();
    const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `${itemName} Timeout`));

    // Check if there is a save success
    if(workflowType === "save" && workflow.failedSaves.size === 0) return;

    let findValidTokens = game.gps.findValidTokens({initiatingToken: workflow.token, targetedToken: null, itemName: itemName, itemType: "feature", itemChecked: ["indomitable"], reactionCheck: false, sightCheck: false, rangeCheck: false, rangeTotal: null, dispositionCheck: false, dispositionCheckType: null, workflowType: workflowType, workflowCombat: workflowCombat, gpsUuid: gpsUuid});
    
    let browserUser;
    
    for (const validTokenPrimary of findValidTokens) {
        let targetUuids = Array.from(workflow.failedSaves).filter(t => t.document.uuid === validTokenPrimary.document.uuid).map(t => t.document.uuid);
        if(targetUuids.length === 0) continue;
        let chosenItem = validTokenPrimary.actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === gpsUuid);
        let itemProperName = chosenItem?.name;
        const dialogTitlePrimary = `${validTokenPrimary.actor.name} | ${itemProperName}`;
        const dialogTitleGM = `Waiting for ${validTokenPrimary.actor.name}'s selection | ${itemProperName}`;
        browserUser = game.gps.getBrowserUser({ actorUuid: validTokenPrimary.actor.uuid });
        
        let indomitableHomebrew = MidiQOL.safeGetGameSetting('gambits-premades', 'enableAutoSucceedIndomitable');
        let contentQuestion;
        if(indomitableHomebrew) contentQuestion = `Would you like to use ${itemProperName} to succeed on your saving throw?`;
        else contentQuestion = `Would you like to use ${itemProperName} to re-roll your saving throw?`;

        let dialogContent = `
            <div class="gps-dialog-container">
                <div class="gps-dialog-section">
                    <div class="gps-dialog-content">
                        <div>
                            <div class="gps-dialog-flex">
                                <p class="gps-dialog-paragraph">${contentQuestion}</p>
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
        let content = `<span style='text-wrap: wrap;'><img src="${validTokenPrimary.actor.img}" style="width: 25px; height: auto;" /> ${validTokenPrimary.actor.name} has an option available for a save triggering ${itemProperName}.</span>`
        let chatData = { user: gmUser, content: content, roll: false, whisper: gmUser };
        let notificationMessage = await MidiQOL.socket().executeAsUser("createChatMessage", gmUser, { chatData });

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
                targetUuids: [validTokenPrimary.document.uuid],
            };

            let itemRoll;
            if(source && source === "user") itemRoll = await MidiQOL.socket().executeAsUser("completeItemUse", browserUser, { itemData: chosenItem, actorUuid: validTokenPrimary.actor.uuid, options: options });
            else if(source && source === "gm") itemRoll = await MidiQOL.socket().executeAsUser("completeItemUse", gmUser, { itemData: chosenItem, actorUuid: validTokenPrimary.actor.uuid, options: options });

            if(itemRoll.aborted === true) continue;
            let chatContent;
            let indomitableHomebrew = MidiQOL.safeGetGameSetting('gambits-premades', 'enableAutoSucceedIndomitable');
            let saveDC = workflow?.saveActivity?.save.dc?.value;
            let saveAbility = workflow?.saveActivity?.ability;
            let reroll;

            if(!indomitableHomebrew) {
                let effectData = [
                    {
                        "name": chosenItem.name,
                        "img": chosenItem.img,
                        "origin": chosenItem.uuid,
                        "type": "base",
                        "system": {},
                        "changes": [
                            {
                            "key": "system.bonuses.abilities.save",
                            "mode": 2,
                            "value": `${validTokenPrimary.actor.classes?.fighter.system.levels}`,
                            "priority": 20
                            }
                        ],
                        "disabled": false,
                        "flags": {
                            "dae": {
                                "specialDuration": [
                                    "isSaveFailure",
                                    "isSaveSuccess"
                                ]
                            }
                        }
                    }
                ];

                await MidiQOL.socket().executeAsUser("createEffects", gmUser, { actorUuid: validTokenPrimary.actor.uuid, effects: effectData });

                let activity = chosenItem.system.activities.find(a => a.identifier === "syntheticSave");
                await game.gps.socket.executeAsUser("gpsActivityUpdate", gmUser, { activityUuid: activity.uuid, updates: {"save.dc.calculation": "", "save.dc.formula": saveDC, "save.dc.value": saveDC, "save.ability": [saveAbility]} });
                if(source && source === "user") reroll = await game.gps.socket.executeAsUser("gpsActivityUse", browserUser, {itemUuid: chosenItem.uuid, identifier: "syntheticSave", targetUuid: validTokenPrimary.document.uuid});
                else if(source && source === "gm") reroll = await game.gps.socket.executeAsUser("gpsActivityUse", gmUser, {itemUuid: chosenItem.uuid, identifier: "syntheticSave", targetUuid: validTokenPrimary.document.uuid});
            }

            if(reroll?.failedSaves?.size === 0 || indomitableHomebrew) {
                workflow.saves.add(validTokenPrimary);
                workflow.failedSaves.delete(validTokenPrimary);

                if(indomitableHomebrew) chatContent = `<span style='text-wrap: wrap;'>${validTokenPrimary.actor.name} used indomitable and auto-succeeded their save. <img src="${validTokenPrimary.actor.img}" width="30" height="30" style="border:0px"></span>`;
                else chatContent = `<span style='text-wrap: wrap;'>${validTokenPrimary.actor.name} used indomitable and succeeded their save. <img src="${validTokenPrimary.actor.img}" width="30" height="30" style="border:0px"></span>`;

                await game.gps.socket.executeAsUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: !indomitableHomebrew ? reroll.saveRolls : null});
                return;
            }

            else {
                chatContent = `<span style='text-wrap: wrap;'>${validTokenPrimary.actor.name} used indomitable but still failed their save. <img src="${validTokenPrimary.actor.img}" width="30" height="30" style="border:0px"></span>`;

                await game.gps.socket.executeAsUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: reroll.saveRolls});
                return;
            }
        }
    }
}