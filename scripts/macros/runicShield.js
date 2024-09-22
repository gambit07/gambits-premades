export async function runicShield({workflowData,workflowType,workflowCombat}) {
    const module = await import('../module.js');
    const socket = module.socket;
    const helpers = await import('../helpers.js');
    const workflow = await MidiQOL.Workflow.getWorkflow(workflowData);
    if(!workflow) return;
    const gpsUuid = "088a34cd-f8c0-42d0-be77-ccaac97ba913";
    if(workflow.item.flags["gambits-premades"]?.gpsUuid === gpsUuid) return;
    let itemName = "Runic Shield";
    let dialogId = gpsUuid;
    let gmUser = helpers.getPrimaryGM();

    let target = workflow.targets.first();

    if(workflow.attackTotal < target.actor.system.attributes.ac.value) return;

    let findValidTokens = helpers.findValidTokens({initiatingToken: workflow.token, targetedToken: target, itemName: itemName, itemType: "feature", itemChecked: ["runic shield"], reactionCheck: true, sightCheck: true, sightCheckType: "ally", rangeCheck: true, rangeTotal: 60, dispositionCheck: true, dispositionCheckType: "enemyAlly", workflowType: workflowType, workflowCombat: workflowCombat, gpsUuid: gpsUuid});
    
    let browserUser;
    let browserUserEnemy;
    
    for (const validTokenPrimary of findValidTokens) {
        if(validTokenPrimary.id === target.id) continue;
        let chosenItem = validTokenPrimary.actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === gpsUuid);
        let itemProperName = chosenItem?.name;
        const dialogTitlePrimary = `${validTokenPrimary.actor.name} | ${itemProperName}`;
        const dialogTitleGM = `Waiting for ${validTokenPrimary.actor.name}'s selection | ${itemProperName}`;
        browserUser = helpers.getBrowserUser({ actorUuid: validTokenPrimary.actor.uuid });
        browserUserEnemy = helpers.getBrowserUser({ actorUuid: workflow.token.actor.uuid });

        const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `${itemName} Timeout`));

        let dialogContent = `
            <div class="gps-dialog-container">
                <div class="gps-dialog-section">
                    <div class="gps-dialog-content">
                        <div>
                            <div class="gps-dialog-flex">
                                <p class="gps-dialog-paragraph">${target.actor.name} has been hit by an attack, would you like to use ${itemProperName} to force the attacker to re-roll?</p>
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
        let content = `<span style='text-wrap: wrap;'><img src="${validTokenPrimary.actor.img}" style="width: 25px; height: auto;" /> ${validTokenPrimary.actor.name} has a reaction available for an attack triggering ${itemProperName}.</span>`
        let chatData = { user: gmUser, content: content, roll: false, whisper: gmUser };
        let notificationMessage = await MidiQOL.socket().executeAsUser("createChatMessage", gmUser, { chatData });

        if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser !== gmUser) {
            let userDialogArgs = { dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: "user",type: "multiDialog", browserUser: browserUser, notificationId: notificationMessage._id };
            
            let gmDialogArgs = { dialogTitle:dialogTitleGM,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: "gm",type: "multiDialog", notificationId: notificationMessage._id };
        
            result = await socket.executeAsUser("handleDialogPromises", gmUser, {userDialogArgs, gmDialogArgs});
        } else {
            result = await socket.executeAsUser("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: gmUser === browserUser ? "gm" : "user",type:"singleDialog", notificationId: notificationMessage._id});
        }

        const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, source, type } = result;

        if (!userDecision) {
            continue;
        }
        else if (userDecision) {
            chosenItem.prepareData();
            chosenItem.prepareFinalAttributes();
            chosenItem.applyActiveEffects();

            const options = {
                showFullCard: false,
                createWorkflow: true,
                versatile: false,
                configureDialog: true,
                targetUuids: [target.document.uuid],
            };

            let itemRoll;
            if(source && source === "user") itemRoll = await MidiQOL.socket().executeAsUser("completeItemUse", browserUser, { itemData: chosenItem, actorUuid: validTokenPrimary.actor.uuid, options: options });
            else if(source && source === "gm") itemRoll = await MidiQOL.socket().executeAsUser("completeItemUse", gmUser, { itemData: chosenItem, actorUuid: validTokenPrimary.actor.uuid, options: options });

            if(itemRoll.aborted === true) continue;

            workflow.aborted = true;

            await helpers.addReaction({actorUuid: `${validTokenPrimary.actor.uuid}`});

            const optionsEnemy = {
                showFullCard: false,
                createWorkflow: true,
                versatile: false,
                configureDialog: true,
                targetUuids: [target.document.uuid],
            };

            let newItemData = workflow.item;

            newItemData.prepareData();
            newItemData.prepareFinalAttributes();
            newItemData.applyActiveEffects();

            await MidiQOL.socket().executeAsUser("completeItemUse", browserUserEnemy, { itemData: newItemData, actorUuid: workflow.token.actor.uuid, options: optionsEnemy });
        }
    }
}