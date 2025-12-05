export async function flashOfGenius({workflowData,workflowType,workflowCombat}) {
    const workflow = workflowCombat ? await MidiQOL.Workflow.getWorkflow(workflowData) ?? null : null;
    if(!workflow && workflowCombat === true) return;
    const gpsUuid = "a0e20506-9e70-4bca-bfa6-7e5d16ba42fa";
    if(workflow?.item?.flags["gambits-premades"]?.gpsUuid === gpsUuid) return;
    let itemName = "Flash of Genius";
    let dialogId = gpsUuid;
    let initiatingToken;
    (workflow) ? initiatingToken = workflow.token : initiatingToken = await MidiQOL.tokenForActor(workflowData.actor.uuid);
    let targetedToken;
    (workflow) ? targetedToken = "" : targetedToken = await MidiQOL.tokenForActor(workflowData.actor.uuid);
    let gmUser = game.gps.getPrimaryGM();
    const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `${itemName} Timeout`));
    let dispositionCheckType;
    (workflow) ? dispositionCheckType = "enemy" : dispositionCheckType = "ally";

    let findValidTokens = game.gps.findValidTokens({initiatingToken: initiatingToken, targetedToken: targetedToken, itemName: itemName, itemType: "feature", itemChecked: ["flash-of-genius"], reactionCheck: true, sightCheck: true, rangeCheck: true, rangeTotal: 30, dispositionCheck: true, dispositionCheckType: dispositionCheckType, workflowType: workflowType, workflowCombat: workflowCombat, gpsUuid: gpsUuid});
    
    let browserUser;
    
    for (const validTokenPrimary of findValidTokens) {
        let targets = workflow ? Array.from(workflow.targets).filter(t => t.document.disposition === validTokenPrimary.document.disposition) : [initiatingToken];
        if(targets.length === 0) continue;
        const casterInTargets = targets.includes(validTokenPrimary);
        const targetUuids = targets.map(t => t.document.uuid);
        const targetNames = targets.map(t => t.document.name);
        let chosenItem = validTokenPrimary.actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === gpsUuid);
        let itemProperName = chosenItem?.name;
        const dialogTitlePrimary = `${validTokenPrimary.actor.name} | ${itemProperName}`;
        const dialogTitleGM = `Waiting for ${validTokenPrimary.actor.name}'s selection | ${itemProperName}`;
        browserUser = game.gps.getBrowserUser({ actorUuid: validTokenPrimary.actor.uuid });

        let dialogContent = `
            <div class="gps-dialog-container">
                <div class="gps-dialog-section">
                    <div class="gps-dialog-content">
                        <p class="gps-dialog-paragraph">Would you like to use your reaction to initiate ${itemProperName}${targets.length > 1 && casterInTargets ? "? Choose yourself or an ally below" : targets.length > 1 ? "? Choose an ally below" : casterInTargets ? ` for yourself?` : ` for ${targetNames[0]}?`}</p>
                            <div>
                                <div class="gps-dialog-flex">
                                    <label for="ally-token" class="gps-dialog-label">Target:</label>
                                    <select id="ally-token" class="gps-dialog-select">
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

        let result;
        let content = `<span style='text-wrap: wrap;'><img src="${validTokenPrimary.actor.img}" style="width: 25px; height: auto;" /> ${validTokenPrimary.actor.name} has an option available for a save triggering ${itemProperName}.</span>`
        let chatData = { user: gmUser, content: content, roll: false };
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
            let target = await fromUuid(allyTokenUuid);
            let intMod = validTokenPrimary.actor.system.abilities.int.mod;

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
            await game.gps.addReaction({actorUuid: `${validTokenPrimary.actor.uuid}`});
            let rollFound = workflow ? workflow.saveRolls.find(roll => roll.data.actorUuid === target.actor.uuid) : workflowData.roll;

            let saveBonus = await new CONFIG.Dice.DamageRoll(`${intMod}`).evaluate();
            let newRoll = await MidiQOL.addRollTo(rollFound, saveBonus);

            let chatContent = `<span style='text-wrap: wrap;'>${validTokenPrimary.actor.name} used ${chosenItem.name} and added ${intMod} to ${target.actor.name}'s roll.<img src="${target.actor.img}" width="30" height="30" style="border:0px"></span>`;

            await game.gps.socket.executeAsUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: newRoll});
            return;
        }
    }
}