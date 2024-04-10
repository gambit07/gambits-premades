export async function silveryBarbs({workflowData,workflowType}) {
    const module = await import('../module.js');
    const socket = module.socket;
    const workflowUuid = workflowData;
    const workflow = await MidiQOL.Workflow.getWorkflow(workflowUuid);
    if(!workflow) return;
    if(workflow.item.name.toLowerCase().includes("silvery barbs")) return;
    let gridDecision;
    
    if (!game.combat) return;

    // Check if attack hits
    if(workflowType === "attack" && workflow.attackTotal < workflow.targets.first().actor.system.attributes.ac.value) return;
    // Check if there is a save success target
    if(workflowType === "save" && workflow.saves.size === 0) return;
    // Check if Opportunity Attack is initiating the workflow
    if(workflow.item.name === "Opportunity Attack") return;

    function findSilveryBarbsTokens(token, dispositionCheck) {
        let validTokens = game.combat.combatants.map(combatant => canvas.tokens.get(combatant.tokenId)).filter(t => {
            // Check if invalid token on the canvas
            if (!t.actor) return;

            // Check if the token has silvery barbs available
            let checkSpells = t.actor.items.filter(i => i.name.toLowerCase().includes("silvery barbs"));
            let checkSpell = checkSpells.find(spell => spell?.system?.preparation?.mode);
            if(!checkSpell) return;

            // Check if the tokens reaction already used
            if (t.actor.effects.find(i => i.name.toLowerCase() === "reaction")) return;
            
            // Check if the token is the initiating token or is not an opposite token disposition
            if (workflowType === "attack" && dispositionCheck(t, token)) return;
            if (workflowType === "save" && t.document.disposition !== token.document.disposition) return;

            // Check if token can see initiating token for attacks
            if (workflowType === "attack" && !MidiQOL.canSee(t, token)) return;

            // Check if scene is gridless
            canvas.scene.grid.type === 0 ? gridDecision = false : gridDecision = true;

            // Check if token is within 60 feet for attacks
            let distance = canvas.grid.measureDistance(token, t, { gridSpaces: gridDecision });
            if(distance > 60 && workflowType === "attack") return;

            // Check if the token has available spell slots/uses for silvery barbs
            const spells = t.actor.system.spells;
            let checkType = checkSpell?.system?.preparation?.mode;
            let hasSpellSlots = false;
            if(checkType === "prepared" && checkSpell.system.preparation.prepared === false) return;
            if(checkType === "prepared" || checkType === "always")
            {
                for (let level = 1; level <= 9; level++) {
                    let spellSlot = t.actor.system.spells[`spell${level}`].value;
                    if (spellSlot) {
                        hasSpellSlots = true;
                        break;
                    }
                }
            }
            else if(checkType === "pact")
            {
                let spellSlotValue = spells.pact.value;
                if (spellSlotValue > 0) hasSpellSlots = true;
            }
            else if(checkType === "innate" || checkType === "atwill")
            {
                let slotValue = checkSpell.system.uses.value;
                let slotEnabled = checkSpell.system.uses.per;
                if (slotValue > 0 || slotEnabled === null) hasSpellSlots = true;
            }

            if (!hasSpellSlots) {
                return;
            }

            return t;
        });

    return validTokens;
    }

    let findSilveryBarbs = findSilveryBarbsTokens(workflow.token, (checkedToken, initiatingToken) => {
        return checkedToken.id === initiatingToken.id || checkedToken.document.disposition === initiatingToken.document.disposition;
    });
    
    let browserUser;
    
    for (const validTokenPrimary of findSilveryBarbs) {
        let actorUuidPrimary = validTokenPrimary.actor.uuid;
        const dialogTitlePrimary = `${validTokenPrimary.actor.name} | Silvery Barbs`;
        const dialogTitleGM = `Waiting for ${validTokenPrimary.actor.name}'s selection | Silvery Barbs`;
        let originTokenUuidPrimary = workflow.token.document.uuid;
        let spellData = validTokenPrimary.actor.items.find(i => i.name.toLowerCase().includes("silvery barbs"));
        canvas.scene.grid.type === 0 ? gridDecision = false : gridDecision = true;
        browserUser = MidiQOL.playerForActor(validTokenPrimary.actor);
        if (!browserUser.active) browserUser = game.users?.activeGM;

        if(workflowType === "save") {
            let targetUuids = Array.from(workflow.saves)
            .filter(token => token.document.disposition !== validTokenPrimary.document.disposition && MidiQOL.canSee(validTokenPrimary, token) && canvas.grid.measureDistance(validTokenPrimary, token, { gridSpaces: gridDecision }) <= 60)
            .map(token => token.actor.uuid);
            if(targetUuids.length === 0) return;
            let targetNames = Array.from(workflow.saves)
            .filter(token => token.document.disposition !== validTokenPrimary.document.disposition && MidiQOL.canSee(validTokenPrimary, token) && canvas.grid.measureDistance(validTokenPrimary, token, { gridSpaces: gridDecision }) <= 60)
            .map(token => token.actor.name);
            
            let content = `<img src="${validTokenPrimary.actor.img}" style="width: 25px; height: auto;" /> ${validTokenPrimary.actor.name} has a reaction available for a save triggering Silvery Barbs.`
            let chatData = {
            user: game.users.find(u => u.isGM).id,
            content: content,
            whisper: game.users.find(u => u.isGM).id
            };
            let notificationMessage = await MidiQOL.socket().executeAsGM("createChatMessage", { chatData });
            let result;

            if (game.settings.get('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser.id !== game.users?.activeGM.id) {
                let userDialogPromise = socket.executeAsUser("showSilveryBarbsDialog", browserUser.id, targetUuids, actorUuidPrimary, validTokenPrimary.document.uuid, dialogTitlePrimary, targetNames, "save", null, `silverybarbs_${browserUser.id}`, 'user').then(res => ({...res, source: "user"}));
                let gmDialogPromise = socket.executeAsGM("showSilveryBarbsDialog", targetUuids, actorUuidPrimary, validTokenPrimary.document.uuid, dialogTitleGM, targetNames, "save", null, `silverybarbs_${game.users?.activeGM.id}`, 'gm').then(res => ({...res, source: "gm"}));
            
                result = await socket.executeAsGM("handleDialogPromises", userDialogPromise, gmDialogPromise);
            } else {
                result = await socket.executeAsUser("showSilveryBarbsDialog", browserUser.id, targetUuids, actorUuidPrimary, validTokenPrimary.document.uuid, dialogTitlePrimary, targetNames, "save", null);
            }
            
            const { silveryBarbsDecision, returnedTokenUuid, source } = result;

            if (silveryBarbsDecision === false || !silveryBarbsDecision) {
                if(source && source === "user") await socket.executeAsGM("closeDialogById", { dialogId: `silverybarbs_${game.users?.activeGM.id}` });
                if(source && source === "gm") await socket.executeAsUser("closeDialogById", browserUser.id, { dialogId: `silverybarbs_${browserUser.id}` });
                await socket.executeAsGM("deleteChatMessage", { chatId: notificationMessage._id });
                continue;
            }
            if (silveryBarbsDecision === true) {
                await socket.executeAsGM("deleteChatMessage", { chatId: notificationMessage._id });
                let saveDC = workflow.saveItem.system.save.dc;
                let saveAbility = workflow.saveItem.system.save.ability;
                let workflowTarget = Array.from(workflow.saves).find(t => t.document.uuid === returnedTokenUuid);
                const workflowIndex = Array.from(workflow.saves).findIndex(t => t.document.uuid === returnedTokenUuid);
                let targetSaveBonus =  workflowTarget.actor.system.abilities[`${saveAbility}`].save + workflowTarget.actor.system.abilities[`${saveAbility}`].saveBonus;
                let reroll = await new Roll(`1d20 + ${targetSaveBonus}`).roll({async: true});
                await MidiQOL.displayDSNForRoll(reroll, 'damageRoll');
                if(reroll.total < saveDC) {
                    workflow.saves.delete(workflowTarget);
                    workflow.failedSaves.add(workflowTarget);
                    workflow.saveDisplayData[workflowIndex].saveString = ' fails';
                    workflow.saveDisplayData[workflowIndex].saveSymbol = 'fa-times';
                    workflow.saveDisplayData[workflowIndex].rollTotal = reroll.total;
                    workflow.saveDisplayData[workflowIndex].saveClass = 'miss';

                    let chatList = [];

                    chatList = `The creature was silvery barbed and failed their save. <img src="${workflowTarget.actor.img}" width="30" height="30" style="border:0px">`;

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

                    chatList = `The creature was silvery barbed but still succeeded their save. <img src="${workflowTarget.actor.img}" width="30" height="30" style="border:0px">`;

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
                if (game.settings.get('gambits-premades', 'disableSilveryBarbsOnNat20') === true && workflow.isCritical === true) return;
                if (game.settings.get('gambits-premades', 'enableSilveryBarbsOnNat20') === true && workflow.isCritical !== true) return;

                let content = `<img src="${validTokenPrimary.actor.img}" style="width: 25px; height: auto;" /> ${validTokenPrimary.actor.name} has a reaction available for an attack triggering Silvery Barbs.`
                let chatData = {
                user: game.users.find(u => u.isGM).id,
                content: content,
                whisper: game.users.find(u => u.isGM).id
                };
                let notificationMessage = await MidiQOL.socket().executeAsGM("createChatMessage", { chatData });
                let result;

                if (game.settings.get('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser.id !== game.users?.activeGM.id) {
                    let userDialogPromise = socket.executeAsUser("showSilveryBarbsDialog", browserUser.id, originTokenUuidPrimary, actorUuidPrimary, validTokenPrimary.document.uuid, dialogTitlePrimary, originTokenUuidPrimary, "attack", workflow.attackTotal, `silverybarbs_${browserUser.id}`, 'user').then(res => ({...res, source: "user"}));
                    let gmDialogPromise = socket.executeAsGM("showSilveryBarbsDialog", originTokenUuidPrimary, actorUuidPrimary, validTokenPrimary.document.uuid, dialogTitleGM, originTokenUuidPrimary, "attack", workflow.attackTotal, `silverybarbs_${game.users?.activeGM.id}`, 'gm').then(res => ({...res, source: "gm"}));
                
                    result = await socket.executeAsGM("handleDialogPromises", userDialogPromise, gmDialogPromise);
                } else {
                    result = await socket.executeAsUser("showSilveryBarbsDialog", browserUser.id, originTokenUuidPrimary, actorUuidPrimary, validTokenPrimary.document.uuid, dialogTitlePrimary, originTokenUuidPrimary, "attack", workflow.attackTotal);
                }
                
                const { silveryBarbsDecision, returnedTokenUuid, source } = result;

                if (silveryBarbsDecision === false || !silveryBarbsDecision) {
                    if(source && source === "user") await socket.executeAsGM("closeDialogById", { dialogId: `silverybarbs_${game.users?.activeGM.id}` });
                    if(source && source === "gm") await socket.executeAsUser("closeDialogById", browserUser.id, { dialogId: `silverybarbs_${browserUser.id}` });
                    await socket.executeAsGM("deleteChatMessage", { chatId: notificationMessage._id });
                    continue;
                }
                if (silveryBarbsDecision === true) {
                    await socket.executeAsGM("deleteChatMessage", { chatId: notificationMessage._id });
                    let rerollAddition = workflow.attackRoll.total - workflow.attackRoll.dice[0].total;
                    let targetAC = workflow.hitTargets.first().actor.system.attributes.ac.value;
                    const saveSetting = workflow.options.noOnUseMacro;
                    workflow.options.noOnUseMacro = true;
                    let reroll = await new Roll(`1d20 + ${rerollAddition}`).roll({async: true});
                    if(reroll.total < workflow.attackTotal) await workflow.setAttackRoll(reroll);
                    await MidiQOL.displayDSNForRoll(reroll, 'damageRoll');
                    workflow.options.noOnUseMacro = saveSetting;

                    if(workflow.attackTotal < targetAC) {
                        let chatList = [];

                        chatList = `The creature was silvery barbed, and failed their attack. <img src="${workflow.token.actor.img}" width="30" height="30" style="border:0px">`;

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

                        chatList = `The creature was silvery barbed, but were still able to hit their target. <img src="${workflow.token.actor.img}" width="30" height="30" style="border:0px">`;

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

export async function showSilveryBarbsDialog(tokenUuids, actorUuid, tokenUuid, dialogTitle, targetNames, outcomeType, attackTotal, dialogId, source) {
    const module = await import('../module.js');
    const socket = module.socket;

    return await new Promise(resolve => {
        const initialTimeLeft = Number(game.settings.get('gambits-premades', 'Silvery Barbs Timeout'));
        let dialogContent;
        let originToken = fromUuidSync(tokenUuid);
        let browserUser = MidiQOL.playerForActor(originToken.actor);

        const nearbyFriendlies = MidiQOL.findNearby(null, originToken.object, 60, { includeToken: true });
        let validFriendlies = nearbyFriendlies.filter(token => token.document.disposition === originToken.disposition && MidiQOL.canSee(tokenUuid,token.document.uuid) && !token.actor.effects.getName("Silvery Barbs - Advantage"));
        if(outcomeType === "attack") {
        dialogContent = `
            <div style='display: flex; flex-direction: column; align-items: start; justify-content: center; padding: 10px;'>
            <div style='margin-bottom: 20px;'>
                <p style='margin: 0; font-weight: bold;'>The target rolled a ${attackTotal} to attack. Would you like to use your reaction to cast Silvery Barbs?</p>
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
            tokenUuids.map((uuid, index) => 
                `<option value="${uuid}">${targetNames[index]}</option>`
        ).join('');
        
        dialogContent = `
            <div style='display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 10px;'>
            <div style='margin-bottom: 20px;'>
                <p style='margin: 0; font-weight: bold;'>Would you like to use your reaction to cast Silvery Barbs?</p>
            </div>
            <div style='display: flex; width: 100%; gap: 20px; align-items: start; padding-bottom: 5px; border-bottom: 1px solid #ccc;'>
                <div style='flex-grow: 1; display: flex; flex-direction: column;'>
                    <p style='margin: 0 0 10px 0;'>Choose a target:</p>
                    <select id="targetSelection" style="padding: 4px; width: 100%; box-sizing: border-box; border-radius: 4px; border: 1px solid #ccc;">
                        ${targetNames.map((name, index) => `<option value="${tokenUuids[index]}">${name}</option>`).join('')}
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
                        if(source && source === "user") await socket.executeAsGM("closeDialogById", { dialogId: `silverybarbs_${game.users?.activeGM.id}` });
                        if(source && source === "gm") await socket.executeAsUser("closeDialogById", browserUser.id, { dialogId: `silverybarbs_${browserUser.id}` });
                        let actor = await fromUuid(actorUuid);
                        let uuid = actor.uuid;
                        let originToken;
                        let advantageToken = await fromUuid(html.find("#advantagedSelection").val());
                        if(outcomeType === "attack") {
                            originToken = await fromUuid(tokenUuids);
                            originToken = await MidiQOL.tokenForActor(originToken.actor.uuid);
                        }
                        if(outcomeType === "save") {
                            originToken = await MidiQOL.tokenForActor(html.find("#targetSelection").val());
                        }

                        let chosenSpell = actor.items.find(i => i.name.toLowerCase().includes("silvery barbs"));

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

                        if(itemRoll.aborted === true) return resolve({ silveryBarbsDecision: false, returnedTokenUuid: null, programmaticallyClosed: false });
                        
                        let silveryBarbsDecision = true;
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
                        resolve({ silveryBarbsDecision, returnedTokenUuid, programmaticallyClosed: false });
                    }
                },
                no: {
                    label: "No",
                    callback: async () => {
                        // Reaction Declined
                        dialog.dialogState.interacted = true;
                        dialog.dialogState.decision = "no";
                        resolve({ silveryBarbsDecision: false, returnedTokenUuid: null, programmaticallyClosed: false });
                    }
                },
            }, default: "no",
            render: (html) => {
                $(html).attr('id', dialog.options.id);
                let timeLeft = initialTimeLeft;
                let isPaused = false;
                const countdownElement = html.find("#countdown");
                const pauseButton = html.find("#pauseButton");
            
                const timer = setInterval(() => {
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
                });
            },
            close: () => {
                clearInterval(timer);
                if (dialog.dialogState.programmaticallyClosed) {
                    resolve({ silveryBarbsDecision: false, returnedTokenUuid: null, programmaticallyClosed: true });
                }
                else if (!dialog.dialogState.interacted) {
                    resolve({ silveryBarbsDecision: false, returnedTokenUuid: null, programmaticallyClosed: false });
                }
            }
        });
        dialog.dialogState = {
            interacted: false,
            decision: null,
            programmaticallyClosed: false
        };
        dialog.render(true);
    });
}