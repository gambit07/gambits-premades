export async function silveryBarbs({workflowData,workflowType}) {
    if(!game.user.isGM) return;
    if (game.settings.get('gambits-premades', 'Enable Silvery Barbs') === false) return;
    const module = await import('../module.js');
    const socket = module.socket;
    const workflowUuid = workflowData;
    const workflow = await MidiQOL.Workflow.getWorkflow(workflowUuid);
    if(!workflow) return;
    if(workflow.item.name.toLowerCase() === "silvery barbs") return;
    
    if (!game.combat) return;

    if(workflowType === "attack" && !workflow.hitTargets.first()) return;

    function findSilveryBarbsTokens(token, dispositionCheck) {
        let validTokens = canvas.tokens.placeables.filter(t => {
            // Check if invalid token on the canvas
            if (!t.actor) return;

            // Check if the token has silvery barbs available
            if (!t.actor.items.find(i => i.name.toLowerCase() === "silvery barbs")) return;

            // Check if the tokens reaction already used
            let reactionUsed = t.actor.effects.find(i => i.name.toLowerCase() === "reaction");
            if (reactionUsed) return;
            
            // Check if the token is the initiating token or is not an opposite token disposition
            if (workflowType === "attack") {
                if (dispositionCheck(t, token)) return;
            }

            if (workflowType === "save") {
                if (t.document.disposition !== token.document.disposition) return;
            }

            let midiSightTest = MidiQOL.canSee(t, token);
            
            if (midiSightTest === false) return;

            // Check if scene is gridless
            let gridDecision;
            canvas.scene.grid.type === 0 ? gridDecision = false : gridDecision = true;

            // Check if token is within 60 feet
            let distance = canvas.grid.measureDistance(token, t, { gridSpaces: gridDecision });
            if(distance > 60) return;

            // Check if the token has available spell slots/uses for silvery barbs
            const spells = t.actor.system.spells;
            let checkSpell = t.actor.items.find(i => i.name.toLowerCase() === "silvery barbs");
            let checkType = checkSpell.system.preparation.mode;
            let hasSpellSlots = false;
            if(checkType === "prepared" && checkSpell.system.preparation.prepared === false) return;
            if(checkType === "prepared" || checkType === "always")
            {
                for (let level = 1; level <= 9; level++) {
                    let spellSlot = t.actor.system.spells[`spell${level}`];
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
        let originTokenUuidPrimary = workflow.token.document.uuid;
        let spellData = validTokenPrimary.actor.items.find(i => i.name.toLowerCase() === "silvery barbs");
        browserUser = MidiQOL.playerForActor(validTokenPrimary.actor);
        if (!browserUser.active) {
            browserUser = game.users?.activeGM;
        }
        if(workflowType === "save") {
            let targetUuids = Array.from(workflow.saves)
            .filter(token => token.document.disposition !== validTokenPrimary.document.disposition)
            .map(token => token.actor.uuid);
            let targetNames = Array.from(workflow.saves)
            .filter(token => token.document.disposition !== validTokenPrimary.document.disposition)
            .map(token => token.actor.name);
            const {silveryBarbsDecision, returnedTokenUuid} = await socket.executeAsUser("showSilveryBarbsDialog", browserUser.id, targetUuids, actorUuidPrimary, validTokenPrimary.document.uuid, dialogTitlePrimary, targetNames, "save");
            if (silveryBarbsDecision === false || !silveryBarbsDecision) continue;
            if (silveryBarbsDecision === true) {
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

                    chatList = `The creature was silvery barbed, but still succeeded their save. <img src="${target.actor.img}" width="30" height="30" style="border:0px">`;

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
                const {silveryBarbsDecision, returnedTokenUuid} = await socket.executeAsUser("showSilveryBarbsDialog", browserUser.id, originTokenUuidPrimary, actorUuidPrimary, validTokenPrimary.document.uuid, dialogTitlePrimary, originTokenUuidPrimary, "attack");
                if (silveryBarbsDecision === false || !silveryBarbsDecision) continue;
                if (silveryBarbsDecision === true) {

                let rerollAddition = workflow.attackRoll.total - workflow.attackRoll.dice[0].total
                let targetAC = workflow.hitTargets.first().actor.system.attributes.ac.value;
                const saveSetting = workflow.options.noOnUseMacro;
                workflow.options.noOnUseMacro = true;
                await workflow.setAttackRoll(await new Roll(`1d20 + ${rerollAddition}`).roll({async: true}));
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

export async function showSilveryBarbsDialog(tokenUuids, actorUuid, tokenUuid, dialogTitle, targetNames, outcomeType) {
    return await new Promise(resolve => {
        const initialTimeLeft = Number(game.settings.get('gambits-premades', 'Silvery Barbs Timeout'));
        let dialogContent;
        let dropdownOptions;
        let originToken = fromUuidSync(tokenUuid);

        const nearbyFriendlies = MidiQOL.findNearby(null, originToken.object, 60, { includeToken: true });
        let validFriendlies = nearbyFriendlies.filter(token => token.document.disposition === originToken.disposition && MidiQOL.canSee(tokenUuid,token.document.uuid) && !token.actor.effects.getName("Silvery Barbs - Advantage"));
        if(outcomeType === "attack") {
        dialogContent = `
            <div style='display: flex; flex-direction: column; align-items: start; justify-content: center; padding: 10px;'>
            <div style='margin-bottom: 20px;'>
                <p style='margin: 0; font-weight: bold;'>Would you like to use your reaction to cast Silvery Barbs?</p>
            </div>
            <div style='display: flex; width: 100%; gap: 20px;'>
                <div style='flex-grow: 1; display: flex; flex-direction: column;'>
                    <p style='margin: 0 0 10px 0;'>Choose who is advantaged:</p>
                    ${validFriendlies.length > 1 ? 
                        `<select id="advantagedSelection" style="padding: 4px; width: 100%; box-sizing: border-box; border-radius: 4px; border: 1px solid #ccc;">
                            ${validFriendlies.map(friendly => `<option value="${friendly.actor.uuid}">${friendly.actor.name}</option>`).join('')}
                        </select>` : '<p>No valid friendlies in range.</p>'
                    }
                </div>
                <div style='padding-left: 20px; border-left: 1px solid #ccc;'>
                    <p><b>Time remaining</b></p>
                    <p><span id='countdown' style='font-size: 16px; color: red;'>${initialTimeLeft}</span> seconds</p>
                </div>
            </div>
        </div>
        `;
        }

        if(outcomeType === "save") {
        dropdownOptions = tokenUuids.map((uuid, index) => 
            `<option value="${uuid}">${targetNames[index]}</option>`
        ).join('');
        
        dialogContent = `
            <div style='display: flex; flex-direction: column; align-items: start; justify-content: center; padding: 10px;'>
                <div style='margin-bottom: 20px;'>
                    <p style='margin: 0; font-weight: bold;'>Would you like to use your reaction to cast Silvery Barbs?</p>
                </div>
                <div style='display: flex; width: 100%; gap: 20px;'>

                        <div style='flex-grow: 1; display: flex; flex-direction: column;'>
                            <p style='margin: 0 0 10px 0;'>Choose a target:</p>
                            <select id="targetSelection" style="padding: 4px; width: 100%; box-sizing: border-box; border-radius: 4px; border: 1px solid #ccc;">
                                ${targetNames.map((name, index) => `<option value="${tokenUuids[index]}">${name}</option>`).join('')}
                            </select>
                        </div>

                    <div style='flex-grow: 1; display: flex; flex-direction: column; border-left: 1px solid #ccc; padding-left: 20px;'>
                        <p style='margin: 0 0 10px 0;'>Choose who is advantaged:</p>
                        ${validFriendlies.length > 1 ? 
                            `<select id="advantagedSelection" style="padding: 4px; width: 100%; box-sizing: border-box; border-radius: 4px; border: 1px solid #ccc;">
                                ${validFriendlies.map(friendly => `<option value="${friendly.actor.uuid}">${friendly.actor.name}</option>`).join('')}
                            </select>` : '<p>No valid friendlies in range.</p>'
                        }
                    </div>
                </div>
                <div style='padding-top: 20px; text-align: center; width: 100%;'>
                    <p><b>Time remaining</b></p>
                    <p><span id='countdown' style='font-size: 16px; color: red;'>${initialTimeLeft}</span> seconds</p>
                </div>
            </div>
        `;
        }

        let dialog = new Dialog({
            title: dialogTitle,
            content: dialogContent,
            buttons: {
                yes: {
                    label: "Yes",
                    callback: async (html) => {
                        let actor = await fromUuid(actorUuid);
                        let uuid = actor.uuid;
                        let originToken;
                        let advantageToken = await fromUuid(html.find("#advantagedSelection").val());
                        if(outcomeType === "attack") {
                            originToken = await fromUuid(tokenUuids);
                        }
                        if(outcomeType === "save") {
                            originToken = await MidiQOL.tokenForActor(html.find("#targetSelection").val());
                        }

                        let chosenSpell = actor.items.find(i => i.name.toLowerCase() === "silvery barbs");

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
                        
                        let silveryBarbsDecision = true;
                        let returnedTokenUuid = originToken.document.uuid;

                        const hasEffectApplied = await game.dfreds.effectInterface.hasEffectApplied('Reaction', uuid);

                        if (!hasEffectApplied) {
                            game.dfreds.effectInterface.addEffect({ effectName: 'Reaction', uuid });
                        }

                        let effectData = [
                            {
                              "icon": "icons/magic/control/control-influence-puppet.webp",
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
                                    "isSave"
                                  ]
                                }
                              }
                            }
                          ];
                        await MidiQOL.socket().executeAsGM("createEffects", { actorUuid: advantageToken.uuid, effects: effectData });

                        resolve({silveryBarbsDecision, returnedTokenUuid});
                    }
                },
                no: {
                    label: "No",
                    callback: async () => {
                        // Reaction Declined
                        resolve({ silveryBarbsDecision: false, returnedTokenUuid: null });
                    }
                },
            }, default: "no",
                render: (html) => { let timeLeft = initialTimeLeft; const countdownElement = html.find("#countdown"); const timer = setInterval(() => { timeLeft--; countdownElement.text(timeLeft); if (timeLeft <= 0) { clearInterval(timer); dialog.close(); } }, 1000); setTimeout(() => { clearInterval(timer); if (timeLeft > 0) dialog.close(); }, timeLeft * 1000); }
        });
        dialog.render(true);
    })
}