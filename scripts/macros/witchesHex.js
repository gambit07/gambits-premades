export async function witchesHex({workflowData,workflowType,workflowCombat}) {
    const module = await import('../module.js');
    const socket = module.socket;
    const helpers = await import('../helpers.js');
    const workflowUuid = workflowData;
    const workflow = await MidiQOL.Workflow.getWorkflow(workflowUuid);
    let itemName = "witches hex";
    let itemProperName = "Witches Hex";
    let dialogId = "witcheshex";
    if(!workflow) return;
    if(workflow.item.name === itemProperName) return;
    
    if (!game.combat) return;

    // Check if Opportunity Attack is initiating the workflow
    if(workflow.item.name === "Opportunity Attack") return;
    if(workflowType === "save" && workflow.saveResults.length === 0) return;

    let findValidTokens;

    if(workflowType === "attack") {
        findValidTokens = helpers.findValidTokens({initiatingToken: workflow.token, targetedToken: null, itemName: itemName, itemType: "feature", itemChecked: [itemName], reactionCheck: true, sightCheck: true, rangeCheck: true, rangeTotal: 60, dispositionCheck: true, dispositionCheckType: "enemy", workflowType: workflowType, workflowCombat: workflowCombat});
    }
    else if(workflowType === "save") {
        findValidTokens = helpers.findValidTokens({initiatingToken: workflow.token, targetedToken: null, itemName: itemName, itemType: "feature", itemChecked: [itemName], reactionCheck: true, sightCheck: false, rangeCheck: false, rangeTotal: null, dispositionCheck: true, dispositionCheckType: "ally", workflowType: workflowType, workflowCombat: workflowCombat});
    }
    
    let browserUser;

    for (const validTokenPrimary of findValidTokens) {
        let actorUuidPrimary = validTokenPrimary.actor.uuid;
        const dialogTitlePrimary = `${validTokenPrimary.actor.name} | ${itemProperName}`;
        const dialogTitleGM = `Waiting for ${validTokenPrimary.actor.name}'s selection | ${itemProperName}`;
        let originTokenUuidPrimary = workflow.token.document.uuid;
        let itemData = validTokenPrimary.actor.items.find(i => i.name === itemProperName);
        let hexDie = validTokenPrimary.actor.system.scale["kp-witch"]["hex-die"].die;
        browserUser = MidiQOL.playerForActor(validTokenPrimary.actor);
        if (!browserUser.active) {
            browserUser = game.users?.activeGM;
        }

        if(workflowType === "save") {
            let targetUuids = Array.from(workflow.targets)
            .filter(token => token.document.disposition !== validTokenPrimary.document.disposition && MidiQOL.canSee(validTokenPrimary, token) && MidiQOL.computeDistance(validTokenPrimary, token, true) <= 60)
            .map(token => token.actor.uuid);
            if(targetUuids.length === 0) return;
            let targetNames = Array.from(workflow.targets)
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
                let userDialogPromise = socket.executeAsUser("showWitchesHexDialog", browserUser.id, {targetUuids: targetUuids, actorUuid: actorUuidPrimary, tokenUuid: validTokenPrimary.document.uuid, dialogTitle: dialogTitlePrimary, targetNames: targetNames, outcomeType: "save", attackTotal: null, dialogId: dialogId, source: "user", type: "multiDialog", itemProperName: itemProperName});
                
                let gmDialogPromise = socket.executeAsGM("showWitchesHexDialog", {targetUuids: targetUuids, actorUuid: actorUuidPrimary, tokenUuid: validTokenPrimary.document.uuid, dialogTitle: dialogTitleGM, targetNames: targetNames, outcomeType: "save", attackTotal: null, dialogId: dialogId, source: "gm", type: "multiDialog", itemProperName: itemProperName});
            
                result = await socket.executeAsGM("handleDialogPromises", userDialogPromise, gmDialogPromise);
            } else {
                result = await socket.executeAsUser("showWitchesHexDialog", browserUser.id, {targetUuids: targetUuids, actorUuid: actorUuidPrimary, tokenUuid: validTokenPrimary.document.uuid, dialogTitle: dialogTitlePrimary, targetNames: targetNames, outcomeType: "save", itemProperName: itemProperName, source: browserUser.isGM ? "gm" : "user", type: "singleDialog"});
            }
            
            const { userDecision, returnedTokenUuid, source, type } = result;

            if (userDecision === false || !userDecision) {
                if(source && source === "user" && type === "multiDialog") await socket.executeAsGM("closeDialogById", { dialogId: dialogId });
                if(source && source === "gm" && type === "multiDialog") await socket.executeAsUser("closeDialogById", browserUser.id, { dialogId: dialogId });
                await socket.executeAsGM("deleteChatMessage", { chatId: notificationMessage._id });
                continue;
            }
            if (userDecision === true) {
                await socket.executeAsGM("deleteChatMessage", { chatId: notificationMessage._id });
                const saveSetting = workflow.options.noOnUseMacro;
                workflow.options.noOnUseMacro = true;
                let saveDC = workflow.saveItem.system.save.dc;

                if(source && source === "user") reroll = await socket.executeAsUser("rollAsUser", browserUser.id, { rollParams: `1${hexDie}`, type: workflowType });
                if(source && source === "gm") reroll = await socket.executeAsGM("rollAsUser", { rollParams: `1${hexDie}`, type: workflowType });
                let rollFound = workflow.saveRolls.find(roll => roll.data.tokenUuid === returnedTokenUuid);
                let rollTotal = rollFound.total;
                let modifiedRoll = await new Roll(`${rollTotal} - ${reroll.total}`).evaluate({async: true});

                workflow.options.noOnUseMacro = saveSetting;

                if(modifiedRoll < saveDC) {
                    workflow.saves.delete(workflowTarget);
                    workflow.failedSaves.add(workflowTarget);

                    let chatList = [];

                    chatList = `<span style='text-wrap: wrap;'>The creature was hexed and failed their save. <img src="${workflowTarget.actor.img}" width="30" height="30" style="border:0px"></span>`;

                    let msgHistory = [];
                    game.messages.reduce((list, message) => {
                        if (message.flags["midi-qol"]?.itemId === itemData._id && message.speaker.token === validTokenPrimary.id) msgHistory.push(message.id);
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

                    chatList = `<span style='text-wrap: wrap;'>The creature was hexed but still succeeded their save. <img src="${workflowTarget.actor.img}" width="30" height="30" style="border:0px"></span>`;

                    let msgHistory = [];
                    game.messages.reduce((list, message) => {
                        if (message.flags["midi-qol"]?.itemId === itemData._id && message.speaker.token === validTokenPrimary.id) msgHistory.push(message.id);
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
                let result;

                if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser.id !== game.users?.activeGM.id) {
                    let userDialogPromise = socket.executeAsUser("showWitchesHexDialog", browserUser.id, {targetUuids: originTokenUuidPrimary, actorUuid: actorUuidPrimary, tokenUuid: validTokenPrimary.document.uuid, dialogTitle: dialogTitlePrimary, targetNames: originTokenUuidPrimary, outcomeType: "attack", dialogId: dialogId, rollTotals: workflow.attackTotal, itemProperName: itemProperName, source: "user", type: "multiDialog"});
                    
                    let gmDialogPromise = socket.executeAsGM("showWitchesHexDialog", {targetUuids: originTokenUuidPrimary, actorUuid: actorUuidPrimary, tokenUuid: validTokenPrimary.document.uuid, dialogTitle: dialogTitleGM, targetNames: originTokenUuidPrimary, outcomeType: "attack", dialogId: dialogId, rollTotals: workflow.attackTotal, itemProperName: itemProperName, source: "gm", type: "multiDialog"});
                
                    result = await socket.executeAsGM("handleDialogPromises", userDialogPromise, gmDialogPromise);
                } else {
                    result = await socket.executeAsUser("showWitchesHexDialog", browserUser.id, {targetUuids: originTokenUuidPrimary, actorUuid: actorUuidPrimary, tokenUuid: validTokenPrimary.document.uuid, dialogTitle: dialogTitlePrimary, targetNames: originTokenUuidPrimary, outcomeType: "attack", rollTotals: workflow.attackTotal, itemProperName: itemProperName, source: browserUser.isGM ? "gm" : "user", type: "singleDialog"});
                }
                    
                const { userDecision, returnedTokenUuid, source, type } = result;

                if (userDecision === false || !userDecision) {
                    if(source && source === "user" && type === "multiDialog") await socket.executeAsGM("closeDialogById", { dialogId: dialogId });
                    if(source && source === "gm" && type === "multiDialog") await socket.executeAsUser("closeDialogById", browserUser.id, { dialogId: dialogId });
                    continue;
                }
                if (userDecision === true) {
                    let targetAC = workflow.hitTargets.first().actor.system.attributes.ac.value;
                    const saveSetting = workflow.options.noOnUseMacro;
                    workflow.options.noOnUseMacro = true;
                    let reroll;
                    if(source && source === "user") reroll = await socket.executeAsUser("rollAsUser", browserUser.id, { rollParams: `1${hexDie}`, type: workflowType });
                    if(source && source === "gm") reroll = await socket.executeAsGM("rollAsUser", { rollParams: `1${hexDie}`, type: workflowType });
                    let rerollNew = await new Roll(`${workflow.attackRoll.result} - ${reroll.total}`).roll({async: true});

                    await workflow.setAttackRoll(rerollNew);
                    workflow.options.noOnUseMacro = saveSetting;

                    if(rerollNew.total < targetAC) {
                        let chatList = [];

                        chatList = `<span style='text-wrap: wrap;'>The creature was hexed reducing their attack by ${reroll.total}, and were unable to hit their target. <img src="${workflow.token.actor.img}" width="30" height="30" style="border:0px"></span>`;

                        let msgHistory = [];
                        game.messages.reduce((list, message) => {
                            if (message.flags["midi-qol"]?.itemId === itemData._id && message.speaker.token === validTokenPrimary.id) msgHistory.push(message.id);
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

                        chatList = `<span style='text-wrap: wrap;'>The creature was hexed reducing their attack by ${reroll.total}, but were still able to hit their target. <img src="${workflow.token.actor.img}" width="30" height="30" style="border:0px"></span>`;

                        let msgHistory = [];
                        game.messages.reduce((list, message) => {
                            if (message.flags["midi-qol"]?.itemId === itemData._id && message.speaker.token === validTokenPrimary.id) msgHistory.push(message.id);
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

export async function showWitchesHexDialog({targetUuids, actorUuid, tokenUuid, dialogTitle, targetNames, outcomeType, attackTotal, dialogId, source, type, itemProperName}) {
    const module = await import('../module.js');
    const socket = module.socket;

    return await new Promise(resolve => {
        
        const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `${itemProperName} Timeout`));
        let dialogContent;
        let originToken = fromUuidSync(tokenUuid);
        let browserUser = MidiQOL.playerForActor(originToken.actor);

        if(outcomeType === "attack") {
        dialogContent = `
            <div style='display: flex; align-items: center; justify-content: space-between;'>
                <div style='flex: 1;'>
                    <p style='margin: 0; font-weight: bold;'>Would you like to use your reaction to cast ${itemProperName}?</p>
                </div>
                <div style='padding-left: 20px; text-align: center; border-left: 1px solid #ccc;'>
                    <p><b>Time remaining</b></p>
                    <p><span id='countdown' style='font-size: 16px; color: red;'>${initialTimeLeft}</span> seconds</p>
                    <p><button id='pauseButton' style='margin-top: 16px;'>Pause</button></p>
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
            </div>
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
                        if(source && source === "user" && type === "multiDialog") await socket.executeAsGM("closeDialogById", { dialogId: dialogId });
                        if(source && source === "gm" && type === "multiDialog") await socket.executeAsUser("closeDialogById", browserUser.id, { dialogId: dialogId });
                        let actor = await fromUuid(actorUuid);
                        let uuid = actor.uuid;
                        let originToken;
                        if(outcomeType === "attack") {
                            originToken = await fromUuid(targetUuids);
                            originToken = await MidiQOL.tokenForActor(originToken.actor.uuid);
                        }
                        if(outcomeType === "save") {
                            originToken = await MidiQOL.tokenForActor(html.find("#targetSelection").val());
                        }

                        let chosenItem = actor.items.find(i => i.name === itemProperName);
                        chosenItem.prepareData();
                        chosenItem.prepareFinalAttributes();

                        const options = {
                            showFullCard: false,
                            createWorkflow: true,
                            versatile: false,
                            configureDialog: true,
                            targetUuids: [originToken.uuid],
                        };

                        const itemRoll = await MidiQOL.completeItemUse(chosenItem, {}, options);
                        if(itemRoll.aborted === true) return resolve({ userDecision: false, returnedTokenUuid: false, programmaticallyClosed: false, source, type });

                        const hasEffectApplied = await game.dfreds.effectInterface.hasEffectApplied('Reaction', uuid);

                        if (!hasEffectApplied) {
                            game.dfreds.effectInterface.addEffect({ effectName: 'Reaction', uuid });
                        }
                        
                        let userDecision = true;
                        let returnedTokenUuid = originToken.document.uuid;

                        let actorLevel = actor.system.details.level;
                        let flamesEmbrace = actor.items.getName("Flame's Embrace");

                        if(actorLevel >= 6 && flamesEmbrace) {

                            let spellDC = actor.system.attributes.spelldc;
                            let saveData = {
                            name: "Flame's Embrace Save",
                            type: "feat",
                            img: `${flamesEmbrace.img}`,
                            effects: [],
                            flags: {
                                "midi-qol": {
                                    noProvokeReaction: true,
                                    onUseMacroName: null,
                                    forceCEOff: true
                                },
                                "midiProperties": {
                                    nodam: true,
                                    magiceffect: true
                                },
                                "autoanimations": {
                                    killAnim: true
                                }
                            },
                            system: {
                                equipped: true,
                                actionType: "save",
                                save: { "dc": `${spellDC}`, "ability": 'con', "scaling": "flat" },
                                components: { concentration: false, material: false, ritual: false, somatic: false, value: "", vocal: false },
                                duration: { units: "inst", value: undefined },
                                properties: {mgc: true}
                            },
                            };
                            const itemUpdate = new CONFIG.Item.documentClass(saveData, {parent: actor});
                            const options = { showFullCard: false, createWorkflow: true, versatile: false, configureDialog: false, targetUuids: [`${originToken.document.uuid}`] };
                            let saveResult = await MidiQOL.completeItemUse(itemUpdate, {}, options);
                    
                            if(saveResult.failedSaves.size !== 0) {

                                let itemData = {
                                    "name": "Flame's Embrace",
                                    "type": "feat",
                                    "img": `${flamesEmbrace.img}`,
                                    "system": {
                                    "description": {
                                        "value": "<p>You have been hexed and are under the effect of Flame's Embrace.</p>"
                                    },
                                    },
                                    "effects": [
                                    {
                                        "icon": `${flamesEmbrace.img}`,
                                        "duration": {
                                        "seconds": 60
                                        },
                                        "disabled": false,
                                        "name": "Flame's Embrace",
                                        "changes": [
                                        {
                                            "key": "system.traits.dv.value",
                                            "mode": 0,
                                            "value": "fire",
                                            "priority": 20
                                        },
                                        {
                                            "key": "flags.midi-qol.onUseMacroName",
                                            "mode": 0,
                                            "value": "ItemMacro, isDamaged",
                                            "priority": 20
                                        }
                                        ],
                                        "transfer": true,
                                        "tint": null
                                    }
                                    ],
                                    "flags": {
                                        "dae": {
                                            "macro": {
                                            "name": "Hexed",
                                            "img": "systems/dnd5e/icons/svg/items/feature.svg",
                                            "type": "script",
                                            "scope": "global",
                                            "command": `if(args[0].macroPass === \"isDamaged\") {\n    let damageTypes = [\"fire\"];\n    let rollFound = workflow.damageDetail.some(roll => damageTypes.includes(roll.type));\n\n    if(rollFound) {\n        let originActor = await fromUuid(\`${actorUuid}\`);\n        let spellDC = originActor.system.attributes.spelldc;\n        const itemData = {\n        name: \"Flame's Embrace Save\",\n        type: \"feat\",\n        img: \`${flamesEmbrace.img}\`,\n        effects: [],\n        flags: {\n            \"midi-qol\": {\n                noProvokeReaction: true,\n                onUseMacroName: null,\n                forceCEOff: true\n            },\n            \"midiProperties\": {\n                nodam: true, magiceffect: true\n            }, "autoanimations": {\n                killAnim: true\n }},\n        system: {\n            equipped: true,\n            actionType: \"save\",\n            save: { \"dc\": spellDC, \"ability\": 'con', \"scaling\": \"flat\" },\n            components: { concentration: false, material: false, ritual: false, somatic: false, value: \"\", vocal: false },\n            duration: { units: \"inst\", value: undefined },\n            properties: {mgc: true}\n        },\n        };\n        const itemUpdate = new CONFIG.Item.documentClass(itemData, {parent: originActor});\n        const options = { showFullCard: false, createWorkflow: true, versatile: false, configureDialog: false, targetUuids: [token.document.uuid] };\n        let saveResult = await MidiQOL.completeItemUse(itemUpdate, {}, options);\n\n        if(saveResult.failedSaves.size === 0) {\n            await macroItem.delete();\n        }\n    }\n}`
                                            }
                                        }
                                    }
                                }

                                await originToken.actor.createEmbeddedDocuments("Item", [itemData]);
                            }
                        }

                        resolve({ userDecision, returnedTokenUuid, programmaticallyClosed: false, source, type });
                    }
                },
                no: {
                    label: "No",
                    callback: async () => {
                        // Reaction Declined
                        dialog.dialogState.interacted = true;
                        dialog.dialogState.decision = "no";
                        resolve({ userDecision: false, returnedTokenUuid: null, programmaticallyClosed: false, source, type });
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
                    resolve({ userDecision: false, returnedTokenUuid: null, programmaticallyClosed: true, source, type });
                }
                else if (!dialog.dialogState.interacted) {
                    resolve({ userDecision: false, returnedTokenUuid: null, programmaticallyClosed: false, source, type });
                }
            }
        });
        dialog.dialogState = { interacted: false, decision: null, programmaticallyClosed: false };
        dialog.render(true);
    });
}