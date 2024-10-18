export async function burstOfIngenuity({ workflowData,workflowType,workflowCombat }) {
    const module = await import('../module.js');
    const socket = module.socket;
    const helpers = await import('../helpers.js');
    const workflow = await MidiQOL.Workflow.getWorkflow(`${workflowData}`);
    if(!workflow) return;
    const gpsUuid = "e63afca6-62d3-4896-850f-afefd1d8ce0a";
    if(workflow.item.flags["gambits-premades"]?.gpsUuid === gpsUuid) return;
    let itemName = "Burst of Ingenuity";
    let dialogId = gpsUuid;
    let gmUser = helpers.getPrimaryGM();
    let itemRoll;

    const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `${itemName} Timeout`));
    const optionBackground = (document.body.classList.contains("theme-dark")) ? 'black' : 'var(--color-bg)';
    let target = workflow.token;
    let browserUser;

    let findValidTokens = helpers.findValidTokens({initiatingToken: target, targetedToken: null, itemName: itemName, itemType: "feature", itemChecked: null, reactionCheck: false, sightCheck: false, rangeCheck: false, rangeTotal: null, dispositionCheck: true, dispositionCheckType: "enemy", workflowType: workflowType, workflowCombat: workflowCombat, gpsUuid: gpsUuid});

    if(findValidTokens.length === 0 || !findValidTokens) return;

    for (const validTokenPrimary of findValidTokens) {
        let targets = Array.from(workflow.targets).filter(t => t.document.disposition === validTokenPrimary.document.disposition && MidiQOL.computeDistance(validTokenPrimary, t, true) <= 30);

        if(targets.length === 0) continue;

        const targetUuids = targets.map(t => t.document.uuid);
        const targetNames = targets.map(t => t.document.name);
        
        let targetOptions = targetUuids.map((uuid, index) => 
            `<option class="gps-dialog-option" value="${uuid}" style="background-color: ${optionBackground};">${targetNames[index]}</option>`
        ).join('');

        let chosenItem = validTokenPrimary.actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === gpsUuid);
        let itemProperName = chosenItem?.name;
        const dialogTitlePrimary = `${validTokenPrimary.actor.name} | ${itemProperName}`;
        const dialogTitleGM = `Waiting for ${validTokenPrimary.actor.name}'s selection | ${itemProperName}`;
        browserUser = helpers.getBrowserUser({ actorUuid: validTokenPrimary.actor.uuid });

        let dialogContent = `
            <div class="gps-dialog-container">
                <div class="gps-dialog-section">
                    <div class="gps-dialog-content">
                        <p class="gps-dialog-paragraph">Would you like to use your reaction to cast ${itemProperName} and add 2 to this saving throw? Choose an ally below.</p>
                        <div>
                            <div class="gps-dialog-flex">
                                <label for="ally-token" class="gps-dialog-label">+2:</label>
                                <select id="ally-token" class="gps-dialog-select">
                                    ${targetOptions}
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

        let content = `<span style='text-wrap: wrap;'><img src="${validTokenPrimary.actor.img}" style="width: 25px; height: auto;" /> ${validTokenPrimary.actor.name} has a reaction available for a save triggering ${itemProperName}.</span>`;
        let chatData = { user: gmUser, content: content, roll: false, whisper: gmUser };
        let notificationMessage = await MidiQOL.socket().executeAsUser("createChatMessage", gmUser, { chatData });

        let result;

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
            let allyToken;
            if(allyTokenUuid) allyToken = await fromUuid(allyTokenUuid);
            allyToken = allyToken.object;

            const options = {
                showFullCard: false,
                createWorkflow: true,
                versatile: false,
                configureDialog: false,
                targetUuids: [allyToken.document.uuid]
            };

            if(source && source === "user") itemRoll = await socket.executeAsUser("remoteCompleteItemUse", browserUser, { itemUuid: chosenItem.uuid, actorUuid: validTokenPrimary.actor.uuid, options: options });
            else if(source && source === "gm") itemRoll = await socket.executeAsUser("remoteCompleteItemUse", gmUser, { itemUuid: chosenItem.uuid, actorUuid: validTokenPrimary.actor.uuid, options: options });

            if(!itemRoll) continue;

            let rollFound = workflow.saveRolls.find(roll => roll.data.actorUuid === allyToken.actor.uuid);

            let saveBonus = await new CONFIG.Dice.DamageRoll(`2`).evaluate();
            let newRoll;
            if(rollFound) newRoll = await MidiQOL.addRollTo(rollFound, saveBonus);
            let saveDC = workflow.saveItem.system.save.dc;
            let chatContent;
            if(newRoll.total >= saveDC && rollFound.total < saveDC) {
                workflow.failedSaves.delete(allyToken);
                workflow.saves.add(allyToken);
                chatContent = `<span style='text-wrap: wrap;'>You added a +2 bonus to ${allyToken.actor.name}'s roll and caused them to succeed their save.<br><img src="${allyToken.actor.img}" width="30" height="30" style="border:0px"></span>`;
            }
            else if(rollFound.total < saveDC){
                chatContent = `<span style='text-wrap: wrap;'>You added a +2 bonus to ${allyToken.actor.name}'s roll but did not cause them to succeed their save.<br><img src="${allyToken.actor.img}" width="30" height="30" style="border:0px"></span>`;
            }
            else if(rollFound.total >= saveDC){
                chatContent = `<span style='text-wrap: wrap;'>You added a +2 bonus to ${allyToken.actor.name}'s roll but they had already succeeded their save.<br><img src="${allyToken.actor.img}" width="30" height="30" style="border:0px"></span>`;
            }

            await socket.executeAsUser("replaceChatCard", gmUser, {actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: newRoll});
        }
    }
}