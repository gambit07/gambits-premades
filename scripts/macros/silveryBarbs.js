export async function silveryBarbs({workflowData,workflowType,workflowCombat}) {
    const module = await import('../module.js');
    const socket = module.socket;
    const helpers = await import('../helpers.js');
    const workflowUuid = workflowData;
    const workflow = await MidiQOL.Workflow.getWorkflow(workflowUuid);
    let itemName = "silvery barbs";
    let itemProperName = "Silvery Barbs";
    let dialogId = "silverybarbs";
    if(!workflow) return;
    if(workflow.item.name === itemProperName) return;
    
    if (!game.combat) return;

    // Check if attack hits
    if(workflowType === "attack" && workflow.attackTotal < workflow.targets.first().actor.system.attributes.ac.value) return;
    // Check if there is a save success
    if(workflowType === "save" && workflow.saves.size === 0) return;
    // Check if Opportunity Attack is initiating the workflow
    if(workflow.item.name === "Opportunity Attack") return;

    let findValidTokens;
    
    if(workflowType === "attack") {
        findValidTokens = helpers.findValidTokens({initiatingToken: workflow.token, targetedToken: null, itemName: itemName, itemType: "spell", itemChecked: null, reactionCheck: true, sightCheck: true, rangeCheck: true, rangeTotal: 60, dispositionCheck: true, dispositionCheckType: "enemy", workflowType: workflowType, workflowCombat: workflowCombat});
    }
    else if(workflowType === "save") {
        findValidTokens = helpers.findValidTokens({initiatingToken: workflow.token, targetedToken: null, itemName: itemName, itemType: "spell", itemChecked: null, reactionCheck: true, sightCheck: false, rangeCheck: false, rangeTotal: null, dispositionCheck: true, dispositionCheckType: "ally", workflowType: workflowType, workflowCombat: workflowCombat});
    }
    
    let browserUser;
    
    for (const validTokenPrimary of findValidTokens) {
        let actorUuidPrimary = validTokenPrimary.actor.uuid;
        const dialogTitlePrimary = `${validTokenPrimary.actor.name} | ${itemProperName}`;
        const dialogTitleGM = `Waiting for ${validTokenPrimary.actor.name}'s selection | ${itemProperName}`;
        let originTokenUuidPrimary = workflow.token.document.uuid;
        let spellData = validTokenPrimary.actor.items.find(i => i.name === itemProperName);
        browserUser = MidiQOL.playerForActor(validTokenPrimary.actor);
        if (!browserUser.active) browserUser = game.users?.activeGM;

        if(workflowType === "save") {
            let targetUuids = Array.from(workflow.saves)
            .filter(token => token.document.disposition !== validTokenPrimary.document.disposition && MidiQOL.canSee(validTokenPrimary, token) && MidiQOL.computeDistance(validTokenPrimary, token, true) <= 60)
            .map(token => token.actor.uuid);
            if(targetUuids.length === 0) return;
            let targetNames = Array.from(workflow.saves)
            .filter(token => token.document.disposition !== validTokenPrimary.document.disposition && MidiQOL.canSee(validTokenPrimary, token) && MidiQOL.computeDistance(validTokenPrimary, token, true) <= 60)
            .map(token => token.actor.name);
            
            let content = `<span style='text-wrap: wrap;'><img src="${validTokenPrimary.actor.img}" style="width: 25px; height: auto;" /> ${validTokenPrimary.actor.name} has a reaction available for a save triggering ${itemProperName}.</span>`
            let chatData = {
            user: game.users.find(u => u.isGM).id,
            content: content,
            whisper: game.users.find(u => u.isGM).id
            };
            let notificationMessage = await MidiQOL.socket().executeAsGM("createChatMessage", { chatData });
            let result;
            
            if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser.id !== game.users?.activeGM.id) {
                let userDialogPromise = socket.executeAsUser("showSilveryBarbsDialog", browserUser.id, {targetUuids: targetUuids, actorUuid: actorUuidPrimary, tokenUuid: validTokenPrimary.document.uuid, dialogTitle: dialogTitlePrimary, targetNames: targetNames, outcomeType: "save", attackTotal: null, dialogId: `${dialogId}_${browserUser.id}`, source: 'user', itemProperName: itemProperName}).then(res => ({...res, source: "user", type: "multiDialog"}));
                
                let gmDialogPromise = socket.executeAsGM("showSilveryBarbsDialog", {targetUuids: targetUuids, actorUuid: actorUuidPrimary, tokenUuid: validTokenPrimary.document.uuid, dialogTitle: dialogTitleGM, targetNames: targetNames, outcomeType: "save", attackTotal: null, dialogId: `${dialogId}_${game.users?.activeGM.id}`, source: 'gm', itemProperName: itemProperName}).then(res => ({...res, source: "gm", type: "multiDialog"}));
            
                result = await socket.executeAsGM("handleDialogPromises", userDialogPromise, gmDialogPromise);
            } else {
                result = await socket.executeAsUser("showSilveryBarbsDialog", browserUser.id, {targetUuids: targetUuids, actorUuid: actorUuidPrimary, tokenUuid: validTokenPrimary.document.uuid, dialogTitle: dialogTitlePrimary, targetNames: targetNames, outcomeType: "save", itemProperName: itemProperName}).then(res => ({...res, source: browserUser.isGM ? "gm" : "user", type: "singleDialog"}));;
            }
            
            const { userDecision, returnedTokenUuid, source, type } = result;

            if (userDecision === false || !userDecision) {
                if(source && source === "user" && type === "multiDialog") await socket.executeAsGM("closeDialogById", { dialogId: `${dialogId}_${game.users?.activeGM.id}` });
                if(source && source === "gm" && type === "multiDialog") await socket.executeAsUser("closeDialogById", browserUser.id, { dialogId: `${dialogId}_${browserUser.id}` });
                await socket.executeAsGM("deleteChatMessage", { chatId: notificationMessage._id });
                continue;
            }
            if (userDecision === true) {
                await socket.executeAsGM("deleteChatMessage", { chatId: notificationMessage._id });
                let saveDC = workflow.saveItem.system.save.dc;
                let saveAbility = workflow.saveItem.system.save.ability;
                let workflowTarget = Array.from(workflow.saves).find(t => t.document.uuid === returnedTokenUuid);
                const workflowIndex = Array.from(workflow.saves).findIndex(t => t.document.uuid === returnedTokenUuid);
                let targetSaveBonus =  workflowTarget.actor.system.abilities[`${saveAbility}`].save + workflowTarget.actor.system.abilities[`${saveAbility}`].saveBonus;
                let reroll;
                if(source && source === "user") reroll = await socket.executeAsUser("rollAsUser", browserUser.id, { rollParams: `1d20 + ${targetSaveBonus}` });
                if(source && source === "gm") reroll = await socket.executeAsGM("rollAsUser", { rollParams: `1d20 + ${targetSaveBonus}` });

                if(reroll.total < saveDC) {
                    workflow.saves.delete(workflowTarget);
                    workflow.failedSaves.add(workflowTarget);

                    let chatList = [];

                    chatList = `<span style='text-wrap: wrap;'>The creature was silvery barbed and failed their save. <img src="${workflowTarget.actor.img}" width="30" height="30" style="border:0px"></span>`;

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

                    chatList = `<span style='text-wrap: wrap;'>The creature was silvery barbed but still succeeded their save. <img src="${workflowTarget.actor.img}" width="30" height="30" style="border:0px"></span>`;

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

            if(workflowType === "attack") {
                if (workflow.token.document.disposition === validTokenPrimary.document.disposition) return;
                
                if (MidiQOL.safeGetGameSetting('gambits-premades', 'disableSilveryBarbsOnNat20') === true && workflow.isCritical === true) return;
                if (MidiQOL.safeGetGameSetting('gambits-premades', 'enableSilveryBarbsOnNat20') === true && workflow.isCritical !== true) return;

                let content = `<span style='text-wrap: wrap;'><img src="${validTokenPrimary.actor.img}" style="width: 25px; height: auto;" /> ${validTokenPrimary.actor.name} has a reaction available for an attack triggering ${itemProperName}.</span>`
                let chatData = {
                user: game.users.find(u => u.isGM).id,
                content: content,
                whisper: game.users.find(u => u.isGM).id
                };
                let notificationMessage = await MidiQOL.socket().executeAsGM("createChatMessage", { chatData });
                let result;
                
                if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser.id !== game.users?.activeGM.id) {
                    let userDialogPromise = socket.executeAsUser("showSilveryBarbsDialog", browserUser.id, {targetUuids: originTokenUuidPrimary, actorUuid: actorUuidPrimary, tokenUuid: validTokenPrimary.document.uuid, dialogTitle: dialogTitlePrimary, targetNames: originTokenUuidPrimary, outcomeType: "attack", attackTotal: workflow.attackTotal, dialogId: `${dialogId}_${browserUser.id}`, source: 'user', itemProperName: itemProperName}).then(res => ({...res, source: "user", type: "multiDialog"}));

                    let gmDialogPromise = socket.executeAsGM("showSilveryBarbsDialog", {targetUuids: originTokenUuidPrimary, actorUuid: actorUuidPrimary, tokenUuid: validTokenPrimary.document.uuid, dialogTitle: dialogTitleGM, targetNames: originTokenUuidPrimary, outcomeType: "attack", attackTotal: workflow.attackTotal, dialogId: `${dialogId}_${game.users?.activeGM.id}`, source: 'gm', itemProperName: itemProperName}).then(res => ({...res, source: "gm", type: "multiDialog"}));
                
                    result = await socket.executeAsGM("handleDialogPromises", userDialogPromise, gmDialogPromise);
                } else {
                    result = await socket.executeAsUser("showSilveryBarbsDialog", browserUser.id, {targetUuids: originTokenUuidPrimary, actorUuid: actorUuidPrimary, tokenUuid: validTokenPrimary.document.uuid, dialogTitle: dialogTitlePrimary, targetNames: originTokenUuidPrimary, outcomeType: "attack", attackTotal: workflow.attackTotal, itemProperName: itemProperName}).then(res => ({...res, source: browserUser.isGM ? "gm" : "user", type: "singleDialog"}));
                }
                
                const { userDecision, returnedTokenUuid, source, type } = result;

                if (userDecision === false || !userDecision) {
                    if(source && source === "user" && type === "multiDialog") await socket.executeAsGM("closeDialogById", { dialogId: `${dialogId}_${game.users?.activeGM.id}` });
                    if(source && source === "gm" && type === "multiDialog") await socket.executeAsUser("closeDialogById", browserUser.id, { dialogId: `${dialogId}_${browserUser.id}` });
                    await socket.executeAsGM("deleteChatMessage", { chatId: notificationMessage._id });
                    continue;
                }
                if (userDecision === true) {
                    await socket.executeAsGM("deleteChatMessage", { chatId: notificationMessage._id });
                    let rerollAddition = workflow.attackRoll.total - workflow.attackRoll.dice[0].total;
                    let targetAC = workflow.hitTargets.first().actor.system.attributes.ac.value;
                    const saveSetting = workflow.options.noOnUseMacro;
                    workflow.options.noOnUseMacro = true;
                    let reroll;
                    if(source && source === "user") reroll = await socket.executeAsUser("rollAsUser", browserUser.id, { rollParams: `1d20 + ${rerollAddition}` });
                    if(source && source === "gm") reroll = await socket.executeAsGM("rollAsUser", { rollParams: `1d20 + ${rerollAddition}` });
                    if(reroll.total < workflow.attackTotal) await workflow.setAttackRoll(reroll);

                    workflow.options.noOnUseMacro = saveSetting;

                    if(workflow.attackTotal < targetAC) {
                        let chatList = [];

                        chatList = `<span style='text-wrap: wrap;'>The creature was silvery barbed, and failed their attack. <img src="${workflow.token.actor.img}" width="30" height="30" style="border:0px"></span>`;

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

                        chatList = `<span style='text-wrap: wrap;'>The creature was silvery barbed, but were still able to hit their target. <img src="${workflow.token.actor.img}" width="30" height="30" style="border:0px"></span>`;

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

export async function showSilveryBarbsDialog({targetUuids, actorUuid, tokenUuid, dialogTitle, targetNames, outcomeType, attackTotal, dialogId, source, type, itemProperName}) {
    const module = await import('../module.js');
    const socket = module.socket;

    return await new Promise(resolve => {
        
        const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `${itemProperName} Timeout`));
        let dialogContent;
        let originToken = fromUuidSync(tokenUuid);
        let browserUser = MidiQOL.playerForActor(originToken.actor);
        const rollDetailSetting = MidiQOL.safeGetGameSetting('midi-qol', 'ConfigSettings').hideRollDetails;

        const nearbyFriendlies = MidiQOL.findNearby(null, originToken.object, 60, { includeToken: true });
        let validFriendlies = nearbyFriendlies.filter(token => token.document.disposition === originToken.disposition && MidiQOL.canSee(tokenUuid,token.document.uuid) && !token.actor.effects.getName(`${itemProperName} - Advantage`));
        if(outcomeType === "attack") {
        dialogContent = `
            <div style='display: flex; flex-direction: column; align-items: start; justify-content: center; padding: 10px;'>
                <div style='margin-bottom: 20px;'>
                    <p style='margin: 0; font-weight: bold;'>Would you like to use your reaction to cast ${itemProperName}? ${["none", "detailsDSN", "details"].includes(rollDetailSetting) ? `An enemy successfully hit your ally with a ${attackTotal}.` : "An enemy successfully hit your ally."}</p>
                </div>
                <div style='display: flex; width: 100%; gap: 20px;'>
                    <div style='flex-grow: 1; display: flex; flex-direction: column;'>
                        <p style='margin: 0 0 10px 0;'>Choose who is advantaged:</p>
                        ${validFriendlies.length >= 1 ? 
                            `<select id="advantagedSelection" style="padding: 4px; width: 100%; box-sizing: border-box; border-radius: 4px; border: 1px solid #ccc;">
                                ${validFriendlies.map(friendly => `<option value="${friendly.actor.uuid}">${friendly.actor.name}</option>`).join('')}
                            </select>` : '<p>No valid friendlies in range.</p>'
                        }
                    </div>
                    <div style='padding-left: 20px; text-align: center; border-left: 1px solid #ccc;'>
                        <p><b>Time remaining</b></p>
                        <p><span id='countdown' style='font-size: 16px; color: red;'>${initialTimeLeft}</span> seconds</p>
                        <p><button id='pauseButton' style='margin-top: 16px;'>Pause</button></p>
                    </div>
                </div>
            </div>
            `;
        }

        if(outcomeType === "save") {
            targetUuids.map((uuid, index) => 
                `<option value="${uuid}">${targetNames[index]}</option>`
        ).join('');
        
        dialogContent = `
            <div style='display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 10px;'>
            <div style='margin-bottom: 20px;'>
                <p style='margin: 0; font-weight: bold;'>Would you like to use your reaction to cast ${itemProperName}? An enemy succeeded their saving throw.</p>
            </div>
            <div style='display: flex; width: 100%; gap: 20px; align-items: start; padding-bottom: 5px; border-bottom: 1px solid #ccc;'>
                <div style='flex-grow: 1; display: flex; flex-direction: column;'>
                    <p style='margin: 0 0 10px 0;'>Choose a target:</p>
                    <select id="targetSelection" style="padding: 4px; width: 100%; box-sizing: border-box; border-radius: 4px; border: 1px solid #ccc;">
                        ${targetNames.map((name, index) => `<option value="${targetUuids[index]}">${name}</option>`).join('')}
                    </select>
                </div>
        
                <div style='flex-grow: 1; display: flex; flex-direction: column; border-left: 1px solid #ccc; padding-left: 20px;'>
                    <p style='margin: 0 0 10px 0;'>Choose who is advantaged:</p>
                    ${validFriendlies.length >= 1 ? 
                        `<select id="advantagedSelection" style="padding: 4px; width: 100%; box-sizing: border-box; border-radius: 4px; border: 1px solid #ccc;">
                            ${validFriendlies.map(friendly => `<option value="${friendly.actor.uuid}">${friendly.actor.name}</option>`).join('')}
                        </select>` : '<p>No valid friendlies in range.</p>'
                    }
                </div>
            </div>
            <!-- This div is now moved outside and after the flex container of the two columns -->
            <div style='width: 100%; text-align: center;'>
                <p><b>Time remaining</b></p>
                <p><span id='countdown' style='font-size: 16px; color: red;'>${initialTimeLeft}</span> seconds</p>
                <button id='pauseButton' style='margin-top: 5px; width: 100px;'>Pause</button>
            </div>
            </div>
        `;
        }

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
                        if(source && source === "user") await socket.executeAsGM("closeDialogById", { dialogId: dialogId });
                        if(source && source === "gm") await socket.executeAsUser("closeDialogById", browserUser.id, { dialogId: dialogId });
                        let actor = await fromUuid(actorUuid);
                        let uuid = actor.uuid;
                        let originToken;
                        let advantageToken = await fromUuid(html.find("#advantagedSelection").val());
                        if(outcomeType === "attack") {
                            originToken = await fromUuid(targetUuids);
                            originToken = await MidiQOL.tokenForActor(originToken.actor.uuid);
                        }
                        if(outcomeType === "save") {
                            originToken = await MidiQOL.tokenForActor(html.find("#targetSelection").val());
                        }

                        let chosenSpell = actor.items.find(i => i.name === itemProperName);

                        chosenSpell.prepareData();
                        chosenSpell.prepareFinalAttributes();

                        const options = {
                            showFullCard: false,
                            createWorkflow: true,
                            versatile: false,
                            configureDialog: true,
                            targetUuids: [originToken.document.uuid],
                        };

                        const itemRoll = await MidiQOL.completeItemUse(chosenSpell, {}, options);

                        const hasEffectApplied = await game.dfreds.effectInterface.hasEffectApplied('Reaction', uuid);

                        if (!hasEffectApplied) {
                            game.dfreds.effectInterface.addEffect({ effectName: 'Reaction', uuid });
                        }

                        if(itemRoll.aborted === true) return resolve({ userDecision: false, returnedTokenUuid: null, programmaticallyClosed: false });
                        
                        let userDecision = true;
                        let returnedTokenUuid = originToken.document.uuid;

                        let effectData = [
                            {
                              "icon": `${chosenSpell.img}`,
                              "duration": {
                                "rounds": null,
                                "startTime": null,
                                "seconds": 60,
                                "combat": null,
                                "turns": null,
                                "startRound": null,
                                "startTurn": null
                              },
                              "disabled": false,
                              "name": "Silvery Barbs - Advantage",
                              "changes": [
                                {
                                  "key": "flags.midi-qol.advantage.attack.all",
                                  "mode": 0,
                                  "value": "1",
                                  "priority": 20
                                },
                                {
                                  "key": "flags.midi-qol.advantage.ability.check.all",
                                  "mode": 0,
                                  "value": "1",
                                  "priority": 20
                                },
                                {
                                  "key": "flags.midi-qol.advantage.ability.save.all",
                                  "mode": 0,
                                  "value": "1",
                                  "priority": 20
                                }
                              ],
                              "transfer": false,
                              "flags": {
                                "dae": {
                                  "specialDuration": [
                                    "1Attack",
                                    "isCheck",
                                    "isSave",
                                    "isSkill"
                                  ]
                                }
                              }
                            }
                          ];
                        if(advantageToken) await MidiQOL.socket().executeAsGM("createEffects", { actorUuid: advantageToken.uuid, effects: effectData });
                        resolve({ userDecision, returnedTokenUuid, programmaticallyClosed: false });
                    }
                },
                no: {
                    label: "No",
                    callback: async () => {
                        // Reaction Declined
                        dialog.dialogState.interacted = true;
                        dialog.dialogState.decision = "no";
                        resolve({ userDecision: false, returnedTokenUuid: null, programmaticallyClosed: false });
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
                    resolve({ userDecision: false, programmaticallyClosed: true });
                }
                else if (!dialog.dialogState.interacted) {
                    resolve({ userDecision: false, programmaticallyClosed: false });
                }
            }
        });
        dialog.dialogState = { interacted: false, decision: null, programmaticallyClosed: false };
        dialog.render(true);
    });
}