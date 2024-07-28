export async function indomitable({workflowData,workflowType,workflowCombat}) {
    const module = await import('../module.js');
    const socket = module.socket;
    const helpers = await import('../helpers.js');
    const workflowUuid = workflowData;
    const workflow = await MidiQOL.Workflow.getWorkflow(workflowUuid);
    let itemName = "indomitable";
    let itemProperName = "Indomitable";
    let dialogId = "indomitable";
    if(!workflow) return;
    if(workflow.item.name === itemProperName) return;

    // Check if there is a save success
    if(workflowType === "save" && workflow.failedSaves.size === 0) return;

    let findValidTokens = helpers.findValidTokens({initiatingToken: workflow.token, targetedToken: null, itemName: itemName, itemType: "feature", itemChecked: ["indomitable"], reactionCheck: true, sightCheck: false, rangeCheck: false, rangeTotal: null, dispositionCheck: false, dispositionCheckType: null, workflowType: workflowType, workflowCombat: workflowCombat});
    
    let browserUser;
    
    for (const validTokenPrimary of findValidTokens) {
        let targetUuids = Array.from(workflow.failedSaves).filter(t => t.document.uuid === validTokenPrimary.document.uuid).map(t => t.document.uuid);
        if(targetUuids.length === 0) continue;

        const dialogTitlePrimary = `${validTokenPrimary.actor.name} | ${itemProperName}`;
        const dialogTitleGM = `Waiting for ${validTokenPrimary.actor.name}'s selection | ${itemProperName}`;
        let chosenItem = validTokenPrimary.actor.items.find(i => i.name === itemProperName);
        browserUser = MidiQOL.playerForActor(validTokenPrimary.actor);
        if (!browserUser.active) browserUser = game.users?.activeGM;

        const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `${itemProperName} Timeout`));
        
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
        let content = `<span style='text-wrap: wrap;'><img src="${validTokenPrimary.actor.img}" style="width: 25px; height: auto;" /> ${validTokenPrimary.actor.name} has a reaction available for a save triggering ${itemProperName}.</span>`
        let chatData = {
        user: game.users.find(u => u.isGM).id,
        content: content,
        whisper: game.users.find(u => u.isGM).id
        };
        let notificationMessage = await MidiQOL.socket().executeAsGM("createChatMessage", { chatData });

        if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser.id !== game.users?.activeGM.id) {
            let userDialogPromise = socket.executeAsUser("process3rdPartyReactionDialog", browserUser.id, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: "user",type: "multiDialog"});
            
            let gmDialogPromise = socket.executeAsGM("process3rdPartyReactionDialog", {dialogTitle:dialogTitleGM,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: "gm",type: "multiDialog"});
        
            result = await socket.executeAsGM("handleDialogPromises", userDialogPromise, gmDialogPromise);
        } else {
            result = await socket.executeAsUser("process3rdPartyReactionDialog", browserUser.id, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source:browserUser.isGM ? "gm" : "user",type:"singleDialog"});
        }

        const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, source, type } = result;

        if (!userDecision) {
            if(source === "gm" || type === "singleDialog") await socket.executeAsGM("deleteChatMessage", { chatId: notificationMessage._id });
            continue;
        }
        else if (userDecision) {
            await socket.executeAsGM("deleteChatMessage", { chatId: notificationMessage._id });
            chosenItem.prepareData();

            const options = {
                showFullCard: false,
                createWorkflow: true,
                versatile: false,
                configureDialog: true,
                targetUuids: [validTokenPrimary.document.uuid],
            };

            let itemRoll;
            if(source && source === "user") itemRoll = await MidiQOL.socket().executeAsUser("completeItemUse", browserUser?.id, { itemData: chosenItem, actorUuid: validTokenPrimary.actor.uuid, options: options });
            else if(source && source === "gm") itemRoll = await MidiQOL.socket().executeAsGM("completeItemUse", { itemData: chosenItem, actorUuid: validTokenPrimary.actor.uuid, options: options });

            if(itemRoll.aborted === true) continue;

            await helpers.addReaction({actorUuid: `${validTokenPrimary.actor.uuid}`});
            
            let indomitableHomebrew = MidiQOL.safeGetGameSetting('gambits-premades', 'enableAutoSucceedIndomitable');
            let saveDC = workflow.saveItem.system.save.dc;
            let saveAbility = workflow.saveItem.system.save.ability;
            let targetSaveBonus =  validTokenPrimary.actor.system.abilities[`${saveAbility}`].save + validTokenPrimary.actor.system.abilities[`${saveAbility}`].saveBonus;
            let reroll;
            if(source && source === "user" && !indomitableHomebrew) reroll = await socket.executeAsUser("rollAsUser", browserUser.id, { rollParams: `1d20 + ${targetSaveBonus}` });
            if(source && source === "gm" && !indomitableHomebrew) reroll = await socket.executeAsGM("rollAsUser", { rollParams: `1d20 + ${targetSaveBonus}` });

            if((reroll?.total >= saveDC) || indomitableHomebrew) {
                workflow.saves.add(validTokenPrimary);
                workflow.failedSaves.delete(validTokenPrimary);

                let chatList = [];

                chatList = `<span style='text-wrap: wrap;'>${validTokenPrimary.actor.name} used indomitable and succeeded their save. <img src="${validTokenPrimary.actor.img}" width="30" height="30" style="border:0px"></span>`;

                let msgHistory = [];
                game.messages.reduce((list, message) => {
                    if (message.flags["midi-qol"]?.itemId === chosenItem._id && message.speaker.token === validTokenPrimary.id) msgHistory.push(message.id);
                }, msgHistory);
                let itemCard = msgHistory[msgHistory.length - 1];
                let chatMessage = await game.messages.get(itemCard);
                let content = await duplicate(chatMessage.content);
                let insertPosition = content.indexOf('<div class="end-midi-qol-attack-roll"></div>');
                if (insertPosition !== -1) {
                    content = content.slice(0, insertPosition) + chatList + content.slice(insertPosition);
                }
                await chatMessage.update({ content: content });
                return;
            }

            else {
                let chatList = [];

                chatList = `<span style='text-wrap: wrap;'>${validTokenPrimary.actor.name} used indomitable but still failed their save. <img src="${validTokenPrimary.actor.img}" width="30" height="30" style="border:0px"></span>`;

                let msgHistory = [];
                game.messages.reduce((list, message) => {
                    if (message.flags["midi-qol"]?.itemId === chosenItem._id && message.speaker.token === validTokenPrimary.id) msgHistory.push(message.id);
                }, msgHistory);
                let itemCard = msgHistory[msgHistory.length - 1];
                let chatMessage = await game.messages.get(itemCard);
                let content = await duplicate(chatMessage.content);
                let insertPosition = content.indexOf('<div class="end-midi-qol-attack-roll"></div>');
                if (insertPosition !== -1) {
                    content = content.slice(0, insertPosition) + chatList + content.slice(insertPosition);
                }
                await chatMessage.update({ content: content });
                return;
            }
        }
    }
}