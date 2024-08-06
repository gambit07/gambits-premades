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
    
    if (!game.combat) return;

    // Check if there is a save success
    if(workflowType === "save" && ((workflow.failedSaves.size === 0 && workflow.saves.size === 0) || workflow.failedSaves.size === 0)) return;
    // Check if Opportunity Attack is initiating the workflow
    if(workflow.item.name === "Opportunity Attack") return;

    let findValidTokens;

    findValidTokens = helpers.findValidTokens({initiatingToken: workflow.token, targetedToken: null, itemName: itemName, itemType: "feature", itemChecked: ["indomitable"], reactionCheck: false, sightCheck: false, rangeCheck: false, rangeTotal: null, dispositionCheck: false, dispositionCheckType: null, workflowType: workflowType, workflowCombat: workflowCombat});
    
    let browserUser;
    
    for (const validTokenPrimary of findValidTokens) {
        let targetUuids = Array.from(workflow.failedSaves)
        .filter(token => token.document.uuid === validTokenPrimary.document.uuid)
        .map(token => token.actor.uuid);
        if(targetUuids.length === 0) return;

        let actorUuidPrimary = validTokenPrimary.actor.uuid;
        const dialogTitlePrimary = `${validTokenPrimary.actor.name} | ${itemProperName}`;
        const dialogTitleGM = `Waiting for ${validTokenPrimary.actor.name}'s selection | ${itemProperName}`;
        let spellData = validTokenPrimary.actor.items.find(i => i.name === itemProperName);
        browserUser = MidiQOL.playerForActor(validTokenPrimary.actor);
        if (!browserUser.active) browserUser = game.users?.activeGM;

        if(workflowType === "save") {
            
            let content = `<span style='text-wrap: wrap;'><img src="${validTokenPrimary.actor.img}" style="width: 25px; height: auto;" /> ${validTokenPrimary.actor.name} has a reaction available for a save triggering ${itemProperName}.</span>`
            let chatData = {
            user: game.users.find(u => u.isGM).id,
            content: content,
            whisper: game.users.find(u => u.isGM).id
            };
            let notificationMessage = await MidiQOL.socket().executeAsGM("createChatMessage", { chatData });
            let result;
            
            if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser.id !== game.users?.activeGM.id) {
                let userDialogPromise = socket.executeAsUser("showIndomitableDialog", browserUser.id, {targetUuids: targetUuids, actorUuid: actorUuidPrimary, tokenUuid: validTokenPrimary.document.uuid, dialogTitle: dialogTitlePrimary, dialogId: dialogId, itemProperName: itemProperName, source: "user", type: "multiDialog"});
                
                let gmDialogPromise = socket.executeAsGM("showIndomitableDialog", {targetUuids: targetUuids, actorUuid: actorUuidPrimary, tokenUuid: validTokenPrimary.document.uuid, dialogTitle: dialogTitleGM, dialogId: dialogId, itemProperName: itemProperName, source: "gm", type: "multiDialog"});
            
                result = await socket.executeAsGM("handleDialogPromises", userDialogPromise, gmDialogPromise);
            } else {
                result = await socket.executeAsUser("showIndomitableDialog", browserUser.id, {targetUuids: targetUuids, actorUuid: actorUuidPrimary, tokenUuid: validTokenPrimary.document.uuid, dialogTitle: dialogTitlePrimary, itemProperName: itemProperName, source: browserUser.isGM ? "gm" : "user", type: "singleDialog"});
            }
            
            const { userDecision, source, type } = result;

            if (userDecision === false || !userDecision) {
                if(source && source === "user" && type === "multiDialog") await socket.executeAsGM("closeDialogById", { dialogId: dialogId });
                if(source && source === "gm" && type === "multiDialog") await socket.executeAsUser("closeDialogById", browserUser.id, { dialogId: dialogId });
                await socket.executeAsGM("deleteChatMessage", { chatId: notificationMessage._id });
                continue;
            }
            if (userDecision === true) {
                await socket.executeAsGM("deleteChatMessage", { chatId: notificationMessage._id });
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
                        if (message.flags["midi-qol"]?.itemId === spellData._id && message.speaker.token === validTokenPrimary.id) msgHistory.push(message.id);
                    }, msgHistory);
                    let itemCard = msgHistory[msgHistory.length - 1];
                    let chatMessage = await game.messages.get(itemCard);
                    let content = await duplicate(chatMessage.content);
                    let insertPosition = content.indexOf('<div class="end-midi-qol-attack-roll"></div>');
                    if (insertPosition !== -1) {
                        content = content.slice(0, insertPosition) + chatList + content.slice(insertPosition);
                    }
                    await chatMessage.update({ content: content });
                }

                else {
                    let chatList = [];

                    chatList = `<span style='text-wrap: wrap;'>${validTokenPrimary.actor.name} used indomitable but still failed their save. <img src="${validTokenPrimary.actor.img}" width="30" height="30" style="border:0px"></span>`;

                    let msgHistory = [];
                    game.messages.reduce((list, message) => {
                        if (message.flags["midi-qol"]?.itemId === spellData._id && message.speaker.token === validTokenPrimary.id) msgHistory.push(message.id);
                    }, msgHistory);
                    let itemCard = msgHistory[msgHistory.length - 1];
                    let chatMessage = await game.messages.get(itemCard);
                    let content = await duplicate(chatMessage.content);
                    let insertPosition = content.indexOf('<div class="end-midi-qol-attack-roll"></div>');
                    if (insertPosition !== -1) {
                        content = content.slice(0, insertPosition) + chatList + content.slice(insertPosition);
                    }
                    await chatMessage.update({ content: content });
                }
            }
        }
    }
}

export async function showIndomitableDialog({targetUuids, actorUuid, tokenUuid, dialogTitle, dialogId, source, type, itemProperName}) {
    const module = await import('../module.js');
    const socket = module.socket;

    return await new Promise(resolve => {
        
        const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `${itemProperName} Timeout`));
        let dialogContent;
        let originToken = fromUuidSync(tokenUuid);
        let browserUser = MidiQOL.playerForActor(originToken.actor);

        let indomitableHomebrew = MidiQOL.safeGetGameSetting('gambits-premades', 'enableAutoSucceedIndomitable');
        let contentQuestion;
        if(indomitableHomebrew) contentQuestion = `Would you like to use ${itemProperName} to succeed on your saving throw?`;
        else contentQuestion = `Would you like to use ${itemProperName} to re-roll your saving throw?`;
        
        dialogContent = `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 5px; background-color: transparent; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <div style="flex-grow: 1; margin-right: 20px;">
                    <p style='margin: 0; font-weight: bold;'>${contentQuestion}</p>
                </div>
                <div style="display: flex; flex-direction: column; justify-content: center; padding-left: 20px; border-left: 1px solid #ccc; text-align: center;">
                    <p><b>Time Remaining</b></p>
                    <p><span id="countdown" style="font-size: 16px; color: red;">${initialTimeLeft}</span> seconds</p>
                    <button id='pauseButton' style='margin-top: 5px; width: 100px;'>Pause</button>
                </div>
            </div>
        `;

        let timer;

        let dialog = new Dialog({
            title: dialogTitle,
            content: dialogContent,
            id: dialogId,
            buttons: {
                yes: {
                    label: "Yes",
                    callback: async (html) => {
                        dialog.dialogState.interacted = true;
                        dialog.dialogState.decision = "yes";
                        if(source && source === "user" && type === "multiDialog") await socket.executeAsGM("closeDialogById", { dialogId: dialogId });
                        if(source && source === "gm" && type === "multiDialog") await socket.executeAsUser("closeDialogById", browserUser.id, { dialogId: dialogId });
                        let actor = await fromUuid(actorUuid);
                        let uuid = actor.uuid;

                        let chosenSpell = actor.items.find(i => i.name === itemProperName);

                        chosenSpell.prepareData();
                        chosenSpell.prepareFinalAttributes();

                        const options = {
                            showFullCard: false,
                            createWorkflow: true,
                            versatile: false,
                            configureDialog: true,
                            targetUuids: [originToken.uuid],
                        };

                        const itemRoll = await MidiQOL.completeItemUse(chosenSpell, {}, options);

                        if(itemRoll.aborted === true) return resolve({ userDecision: false, programmaticallyClosed: false, source, type });
                        
                        let userDecision = true;

                        resolve({ userDecision, programmaticallyClosed: false, source, type });
                    }
                },
                no: {
                    label: "No",
                    callback: async () => {
                        // Reaction Declined
                        dialog.dialogState.interacted = true;
                        dialog.dialogState.decision = "no";
                        resolve({ userDecision: false, programmaticallyClosed: false, source, type });
                    }
                },
            }, default: "no",
            render: (html) => {
                $(html).attr('id', dialog.options.id);
                let timeLeft = initialTimeLeft;
                let isPaused = false;
                const countdownElement = html.find("#countdown");
                const pauseButton = html.find("#pauseButton");

                dialog.updateTimer = (newTimeLeft, paused) => {
                    timeLeft = newTimeLeft;
                    isPaused = paused;
                    countdownElement.text(`${timeLeft}`);
                    pauseButton.text(isPaused ? 'Paused' : 'Pause');
                };

                timer = setInterval(() => {
                    if (!isPaused) {
                        timeLeft--;
                        countdownElement.text(`${timeLeft}`);
                        if (timeLeft <= 0) {
                            dialog.data.buttons.no.callback();
                            dialog.close();
                        }
                    }
                }, 1000);

                pauseButton.click(() => {
                    isPaused = !isPaused;
                    pauseButton.text(isPaused ? 'Paused' : 'Pause');
                    if (source && source === "user" && type === "multiDialog") {
                        socket.executeAsGM("pauseDialogById", { dialogId, timeLeft, isPaused });
                    } else if (source && source === "gm" && type === "multiDialog") {
                        socket.executeAsUser("pauseDialogById", browserUser.id, { dialogId, timeLeft, isPaused });
                    }
                });
            },
            close: () => {
                clearInterval(timer);
                if (dialog.dialogState.programmaticallyClosed) {
                    resolve({ userDecision: false, programmaticallyClosed: true, source, type });
                }
                else if (!dialog.dialogState.interacted) {
                    resolve({ userDecision: false, programmaticallyClosed: false, source, type });
                }
            }
        });
        dialog.dialogState = { interacted: false, decision: null, programmaticallyClosed: false };
        dialog.render(true);
    });
}