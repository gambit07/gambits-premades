export async function indomitable2024({workflowData,workflowType,workflowCombat}) {
    const workflow = await MidiQOL.Workflow.getWorkflow(workflowData);
    if(!workflow) return;
    const gpsUuid = "7ca704b5-7d13-4240-a4dc-fa908dc7bd10";
    if(workflow.item.flags["gambits-premades"]?.gpsUuid === gpsUuid) return;
    let itemName = "Indomitable";
    let dialogId = gpsUuid;
    let gmUser = game.gps.getPrimaryGM();
    let debugEnabled = MidiQOL.safeGetGameSetting('gambits-premades', 'debugEnabled');
    const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `${itemName} Timeout`));

    // Check if there is a save success
    if(workflowType === "save" && workflow.failedSaves.size === 0) return debugEnabled ? game.gps.logInfo(`${itemName} failed due to no valid failed save targets`) : "";

    let findValidTokens = game.gps.findValidTokens({initiatingToken: workflow.token, targetedToken: null, itemName: itemName, itemType: "feature", itemChecked: ["indomitable"], reactionCheck: false, sightCheck: false, rangeCheck: false, rangeTotal: null, dispositionCheck: false, dispositionCheckType: null, workflowType: workflowType, workflowCombat: workflowCombat, gpsUuid: gpsUuid});
    
    let browserUser;
    
    for (const validTokenPrimary of findValidTokens) {
        let targetUuids = Array.from(workflow.failedSaves).filter(t => t.document.uuid === validTokenPrimary.document.uuid).map(t => t.document.uuid);
        if(targetUuids.length === 0) continue;
        let chosenItem = validTokenPrimary.actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === gpsUuid);
        let itemProperName = chosenItem?.name;
        const dialogTitlePrimary = `${validTokenPrimary.actor.name} | ${itemProperName}`;
        const dialogTitleGM = game.i18n.format("GAMBITSPREMADES.Dialogs.Common.WaitingForSelection", { actorName: validTokenPrimary.actor.name, itemName: itemProperName });
        browserUser = game.gps.getBrowserUser({ actorUuid: validTokenPrimary.actor.uuid });
        
        let indomitableHomebrew = MidiQOL.safeGetGameSetting('gambits-premades', 'enableAutoSucceedIndomitable');
        let contentQuestion;
        if(indomitableHomebrew) contentQuestion = game.i18n.format("GAMBITSPREMADES.Dialogs.Common.PromptAutoSaveSuccess", { itemProperName: itemProperName });
        else contentQuestion = game.i18n.format("GAMBITSPREMADES.Dialogs.Common.PromptRerollSave", { itemProperName: itemProperName });

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
                        <i class="fas fa-pause" id="pauseIcon_${dialogId}" style="margin-right: 5px;"></i>${game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.Pause")}
                    </button>
                </div>
            </div>
        `;

        let result;
        let content = `<span style='text-wrap: wrap;'><img src="${validTokenPrimary.actor.img}" style="width: 25px; height: auto;" /> ${game.i18n.format("GAMBITSPREMADES.ChatMessages.Common.OptionAvailableSaveTrigger", { actorName: validTokenPrimary.actor.name, itemProperName: itemProperName })}</span>`
        let chatData = { user: gmUser, content: content, roll: false };
        let notificationMessage = await MidiQOL.socket().executeAsUser("createChatMessage", gmUser, { chatData });

        if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser !== gmUser) {
            let userDialogArgs = { dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: "user",type: "multiDialog", browserUser: browserUser, notificationId: notificationMessage._id };
            
            let gmDialogArgs = { dialogTitle:dialogTitleGM,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: "gm",type: "multiDialog", notificationId: notificationMessage._id };
        
            result = await game.gps.handleDialogPromises({userDialogArgs, gmDialogArgs});
        } else {
            result = await game.gps.queryDialog("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: gmUser === browserUser ? "gm" : "user",type:"singleDialog", notificationId: notificationMessage._id});
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
                workflowOptions: { notReaction: true },
            };

            let itemRoll;
            if(source && source === "user") itemRoll = await MidiQOL.socket().executeAsUser("completeItemUse", browserUser, { itemData: chosenItem, actorUuid: validTokenPrimary.actor.uuid, config: { midiOptions: { ...options, workflowData: true } } });
            else if(source && source === "gm") itemRoll = await MidiQOL.socket().executeAsUser("completeItemUse", gmUser, { itemData: chosenItem, actorUuid: validTokenPrimary.actor.uuid, config: { midiOptions: { ...options, workflowData: true } } });

            if(!itemRoll || itemRoll.aborted) continue;
            let chatContent;
            let indomitableHomebrew = MidiQOL.safeGetGameSetting('gambits-premades', 'enableAutoSucceedIndomitable');
            let saveDC = workflow?.saveActivity?.save.dc?.value;
            let saveRoll = workflow.tokenSaves?.[validTokenPrimary.document.uuid];
            let saveAbility = saveRoll?.options?.midiChosenId ?? saveRoll?.data?.roll?.ability ?? workflow.saveActivity?.save?.ability?.first();
            let reroll;

            if(!indomitableHomebrew) {
                const bonusId = foundry.utils.randomID();
                let effectData = [
                    {
                        "_id": bonusId,
                        "name": chosenItem.name,
                        "img": chosenItem.img,
                        "origin": chosenItem.uuid,
                        "type": "base",
                        "system": { changes: [
                            {
                            "key": "system.rolls.ability.save.bonus",
                            type: "add",
                            "value": `${validTokenPrimary.actor.classes?.fighter?.system.levels ?? 0}`,
                            "priority": 20
                            }
                        ]},
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

                await MidiQOL.socket().executeAsUser("createEffects", gmUser, { actorUuid: validTokenPrimary.actor.uuid, effects: effectData, options: {keepId: true} });

                try {
                let activity = chosenItem.system.activities.find(a => a.identifier === "syntheticSave");
                await game.gps.queryUser("gpsActivityUpdate", gmUser, { activityUuid: activity.uuid, updates: {"save.dc.calculation": "", "save.dc.formula": saveDC, "save.dc.value": saveDC, "save.ability": [saveAbility]} });
                if(source && source === "user") reroll = await game.gps.queryUser("gpsActivityUse", browserUser, {itemUuid: chosenItem.uuid, identifier: "syntheticSave", targetUuid: validTokenPrimary.document.uuid});
                else if(source && source === "gm") reroll = await game.gps.queryUser("gpsActivityUse", gmUser, {itemUuid: chosenItem.uuid, identifier: "syntheticSave", targetUuid: validTokenPrimary.document.uuid});
                } finally {
                    if(validTokenPrimary.actor.effects.has(bonusId)) await MidiQOL.socket().executeAsUser("removeEffects", gmUser, {actorUuid: validTokenPrimary.actor.uuid, effects: [bonusId]});
                }
            }

            if(!indomitableHomebrew && !reroll?.saveRolls) continue;
            if(!indomitableHomebrew) await game.gps.updateSaveResult({workflow, token: validTokenPrimary, roll: reroll.saveRolls, saved: reroll.failedSaves.size === 0});
            if(reroll?.failedSaves?.size === 0 || indomitableHomebrew) {
                workflow.saves.add(validTokenPrimary);
                workflow.failedSaves.delete(validTokenPrimary);

                if(indomitableHomebrew) chatContent = `<span style='text-wrap: wrap;'>${game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Fighter.Indomitable.AutoSuccess", { actorName: validTokenPrimary.actor.name })} <img src="${validTokenPrimary.actor.img}" width="30" height="30" style="border:0px"></span>`;
                else chatContent = `<span style='text-wrap: wrap;'>${game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Fighter.Indomitable.Success", { actorName: validTokenPrimary.actor.name })} <img src="${validTokenPrimary.actor.img}" width="30" height="30" style="border:0px"></span>`;

                await game.gps.queryUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: !indomitableHomebrew ? reroll.saveRolls : null});
                continue;
            }

            else {
                chatContent = `<span style='text-wrap: wrap;'>${game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Fighter.Indomitable.Failure", { actorName: validTokenPrimary.actor.name })} <img src="${validTokenPrimary.actor.img}" width="30" height="30" style="border:0px"></span>`;

                await game.gps.queryUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: reroll.saveRolls});
                continue;
            }
        }
    }
}