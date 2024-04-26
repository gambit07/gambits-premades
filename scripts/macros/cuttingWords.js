export async function cuttingWords({workflowData,workflowType}) {
    const module = await import('../module.js');
    const socket = module.socket;
    const workflowUuid = workflowData;
    const workflow = await MidiQOL.Workflow.getWorkflow(workflowUuid);
    if(!workflow) return;
    if(workflow.item.name.toLowerCase() === "cutting words") return;
    
    if (!game.combat) return;

    // Check if Opportunity Attack is initiating the workflow
    if(workflow.item.name === "Opportunity Attack") return;

    function findCuttingWordsTokens(token, dispositionCheck) {
        let validTokens = game.combat.combatants.map(combatant => canvas.tokens.get(combatant.tokenId)).filter(t => {
            // Check if invalid token on the canvas
            if (!t.actor) return;

            // Check if the token has cutting words available
            if (!t.actor.items.find(i => i.name.toLowerCase() === "cutting words")) return;

            // Check if the tokens reaction already used
            let reactionUsed = t.actor.effects.find(i => i.name.toLowerCase() === "reaction");
            if (reactionUsed) return;
            
            // Check if the token is the initiating token or is not an opposite token disposition
            if (workflowType === "attack" || workflowType === "damage") {
                if (dispositionCheck(t, token)) return;
            }

            let midiSightTest = MidiQOL.canSee(t, token);
            
            if (midiSightTest === false) return;

            // Check if token is within 60 feet
            let measuredDistance = MidiQOL.computeDistance(token,t,true);
            let range = game.gps.convertFromFeet({range: 60});
            if (measuredDistance === -1 || (measuredDistance > range)) return;

            // Check if the token has available uses of Bardic Inspiration for Cutting Words
            const itemNames = ["bardic inspiration"];

            let resourceExistsWithValue = [t.actor.system.resources.primary, t.actor.system.resources.secondary, t.actor.system.resources.tertiary].some(resource =>
                itemNames.includes(resource?.label.toLowerCase()) && resource.value !== 0);
            let itemExistsWithValue;

            if (!resourceExistsWithValue) {
                itemExistsWithValue = !!t.actor.items.find(i => itemNames.includes(i.name.toLowerCase()) && i.system.uses.value !== 0);
            }

            if (!resourceExistsWithValue && !itemExistsWithValue) return;

            return t;
        });

    return validTokens;
    }

    let findCuttingWords = findCuttingWordsTokens(workflow.token, (checkedToken, initiatingToken) => {
        return checkedToken.id === initiatingToken.id || checkedToken.document.disposition === initiatingToken.document.disposition;
    });
    
    let browserUser;

    for (const validTokenPrimary of findCuttingWords) {
        let actorUuidPrimary = validTokenPrimary.actor.uuid;
        const dialogTitlePrimary = `${validTokenPrimary.actor.name} | Cutting Words`;
        const dialogTitleGM = `Waiting for ${validTokenPrimary.actor.name}'s selection | Cutting Words`;
        let originTokenUuidPrimary = workflow.token.document.uuid;
        let spellData = validTokenPrimary.actor.items.find(i => i.name.toLowerCase() === "cutting words");
        let bardicDie = validTokenPrimary.actor.system.scale.bard["bardic-inspiration"].die;
        browserUser = MidiQOL.playerForActor(validTokenPrimary.actor);
        if (!browserUser.active) {
            browserUser = game.users?.activeGM;
        }

        if(workflowType === "damage") {
               if (workflow.token.document.disposition === validTokenPrimary.document.disposition) return;
               let damageTypes = workflow.damageRolls.map(roll => roll.options.type);
               let damageTotals = workflow.damageRolls.map(roll => roll.total);

               let result;

               if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser.id !== game.users?.activeGM.id) {
                let userDialogPromise = socket.executeAsUser("showCuttingWordsDialog", browserUser.id, originTokenUuidPrimary, actorUuidPrimary, validTokenPrimary.document.uuid, dialogTitlePrimary, originTokenUuidPrimary, "damage", damageTypes, `cuttingwords_${browserUser.id}`, 'user', damageTotals).then(res => ({...res, source: "user", type: "multiDialog"}));
                let gmDialogPromise = socket.executeAsGM("showCuttingWordsDialog", originTokenUuidPrimary, actorUuidPrimary, validTokenPrimary.document.uuid, dialogTitleGM, originTokenUuidPrimary, "damage", damageTypes, `cuttingwords_${game.users?.activeGM.id}`, 'gm', damageTotals).then(res => ({...res, source: "gm", type: "multiDialog"}));
            
                result = await socket.executeAsGM("handleDialogPromises", userDialogPromise, gmDialogPromise);
                } else {
                    result = await socket.executeAsUser("showCuttingWordsDialog", browserUser.id, originTokenUuidPrimary, actorUuidPrimary, validTokenPrimary.document.uuid, dialogTitlePrimary, originTokenUuidPrimary, "damage", damageTypes, null, null, damageTotals).then(res => ({...res, source: browserUser.isGM ? "gm" : "user", type: "singleDialog"}));
                }
                    
                const { cuttingWordsDecision, damageChosen, source, type } = result;

                if (cuttingWordsDecision === false || !cuttingWordsDecision) {
                    if(source && source === "user" && type === "multiDialog") await socket.executeAsGM("closeDialogById", { dialogId: `cuttingwords_${game.users?.activeGM.id}` });
                    if(source && source === "gm" && type === "multiDialog") await socket.executeAsUser("closeDialogById", browserUser.id, { dialogId: `cuttingwords_${browserUser.id}` });
                    continue;
               }
               if (cuttingWordsDecision === true) {
                   const saveSetting = workflow.options.noOnUseMacro;
                   workflow.options.noOnUseMacro = true;
                   let reroll;
                   if(source && source === "user") reroll = await socket.executeAsUser("rollAsUser", browserUser.id, { rollParams: `1${bardicDie}`, type: workflowType });
                   if(source && source === "gm") reroll = await socket.executeAsGM("rollAsUser", { rollParams: `1${bardicDie}`, type: workflowType });

                   let remainingReduction = reroll.total;
                   let updatedRolls = [];
                   let processedRolls = new Set();
                   
                   for (const priority of damageChosen) {
                       let rollFound = workflow.damageRolls.find(roll => roll.options.type === priority);
                   
                       if (rollFound) {
                        processedRolls.add(rollFound);
                           let rollTotal = rollFound.total;
                           if (rollTotal >= remainingReduction) {
                               let modifiedRoll = await new Roll(`${rollTotal} - ${remainingReduction}`).evaluate({async: true});
                               modifiedRoll.options.type = priority;
                               updatedRolls.push(modifiedRoll);
                               remainingReduction = 0;
                               break;
                           } else {
                               remainingReduction -= rollTotal;
                               let zeroRoll = await new Roll(`${rollTotal} - ${rollTotal}`).evaluate({async: true});
                               zeroRoll.options.type = priority;
                               updatedRolls.push(zeroRoll);
                           }
                       }
                   }
                   
                   workflow.damageRolls.forEach(roll => {
                    if (!processedRolls.has(roll)) {
                        updatedRolls.push(roll);
                    }
                });

                   await workflow.setDamageRolls(updatedRolls);
           
                   workflow.options.noOnUseMacro = saveSetting;

                    let chatList = [];

                    chatList = `<span style='text-wrap: wrap;'>The creature takes a cutting word, and their damage is reduced by ${reroll.total}. <img src="${workflow.token.actor.img}" width="30" height="30" style="border:0px"></span>`;

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

            if(workflowType === "attack") {
                if (workflow.token.document.disposition === validTokenPrimary.document.disposition) return;

                let result;

                if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser.id !== game.users?.activeGM.id) {
                    let userDialogPromise = socket.executeAsUser("showCuttingWordsDialog", browserUser.id, originTokenUuidPrimary, actorUuidPrimary, validTokenPrimary.document.uuid, dialogTitlePrimary, originTokenUuidPrimary, "attack", null, `cuttingwords_${browserUser.id}`, 'user', workflow.attackTotal).then(res => ({...res, source: "user", type: "multiDialog"}));
                    let gmDialogPromise = socket.executeAsGM("showCuttingWordsDialog", originTokenUuidPrimary, actorUuidPrimary, validTokenPrimary.document.uuid, dialogTitleGM, originTokenUuidPrimary, "attack", null, `cuttingwords_${game.users?.activeGM.id}`, 'gm', workflow.attackTotal).then(res => ({...res, source: "gm", type: "multiDialog"}));
                
                    result = await socket.executeAsGM("handleDialogPromises", userDialogPromise, gmDialogPromise);
                } else {
                    result = await socket.executeAsUser("showCuttingWordsDialog", browserUser.id, originTokenUuidPrimary, actorUuidPrimary, validTokenPrimary.document.uuid, dialogTitlePrimary, originTokenUuidPrimary, "attack", null, null, null, workflow.attackTotal).then(res => ({...res, source: browserUser.isGM ? "gm" : "user", type: "singleDialog"}));
                }
                    
                const { cuttingWordsDecision, damageChosen, source, type } = result;

                if (cuttingWordsDecision === false || !cuttingWordsDecision) {
                    if(source && source === "user" && type === "multiDialog") await socket.executeAsGM("closeDialogById", { dialogId: `cuttingwords_${game.users?.activeGM.id}` });
                    if(source && source === "gm" && type === "multiDialog") await socket.executeAsUser("closeDialogById", browserUser.id, { dialogId: `cuttingwords_${browserUser.id}` });
                    continue;
                }
                if (cuttingWordsDecision === true) {
                    let targetAC = workflow.hitTargets.first().actor.system.attributes.ac.value;
                    const saveSetting = workflow.options.noOnUseMacro;
                    workflow.options.noOnUseMacro = true;
                    let reroll;
                    if(source && source === "user") reroll = await socket.executeAsUser("rollAsUser", browserUser.id, { rollParams: `1${bardicDie}`, type: workflowType });
                    if(source && source === "gm") reroll = await socket.executeAsGM("rollAsUser", { rollParams: `1${bardicDie}`, type: workflowType });
                    let rerollNew = await new Roll(`${workflow.attackRoll.result} - ${reroll.total}`).roll({async: true});

                    await workflow.setAttackRoll(rerollNew);
                    workflow.options.noOnUseMacro = saveSetting;

                    if((workflow.attackTotal - reroll.total) < targetAC) {
                        let chatList = [];

                        chatList = `<span style='text-wrap: wrap;'>The creature takes a cutting word reducing their attack by ${reroll.total}, and were unable to hit their target. <img src="${workflow.token.actor.img}" width="30" height="30" style="border:0px"></span>`;

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

                        chatList = `<span style='text-wrap: wrap;'>The creature takes a cutting word reducing their attack by ${reroll.total}, but were still able to hit their target. <img src="${workflow.token.actor.img}" width="30" height="30" style="border:0px"></span>`;

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

export async function showCuttingWordsDialog(tokenUuids, actorUuid, tokenUuid, dialogTitle, targetNames, outcomeType, damageTypes, dialogId, source, rollTotals) {
    const module = await import('../module.js');
    const socket = module.socket;

    return await new Promise(resolve => {
        const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', 'Cutting Words Timeout'));
        
        let dialogContent;
        let originToken = fromUuidSync(tokenUuid);
        let browserUser = MidiQOL.playerForActor(originToken.actor);
        const rollDetailSetting = MidiQOL.safeGetGameSetting('midi-qol', 'ConfigSettings').hideRollDetails;

        if(outcomeType === "attack") {
        dialogContent = `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 5px; background-color: transparent; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <div style="flex-grow: 1; margin-right: 20px;">
                    <p>${["none", "detailsDSN", "details"].includes(rollDetailSetting) ? `The target rolled a ${rollTotals} to attack. ` : ""}Would you like to use your reaction to use Cutting Words for this ${outcomeType} roll?</p>
                </div>
                <div style="display: flex; flex-direction: column; justify-content: center; padding-left: 20px; border-left: 1px solid #ccc; text-align: center;">
                    <p><b>Time Remaining</b></p>
                    <p><span id="countdown" style="font-size: 16px; color: red;">${initialTimeLeft}</span> seconds</p>
                </div>
            </div>
        `;
        }

        if (outcomeType === "damage") {
            dialogContent = `
                <div style='display: flex; flex-direction: column; align-items: start; justify-content: center; padding: 10px;'>
                    <div style='margin-bottom: 20px;'>
                        <p style='margin: 0; font-weight: bold;'>Would you like to use your reaction to use Cutting Words for this ${outcomeType} roll?</p>
                    </div>
                    <div style='display: flex; width: 100%; gap: 20px;'>
                        <div style='flex-grow: 1; display: flex; flex-direction: column;'>
                            <p style='margin: 0 0 10px 0;'>Order damage types to prioritize which reduction should be applied first:</p>
                            <ul id="damageList" class="sortable" style="padding: 0; margin: 0; list-style-type: none;">
                                ${damageTypes.map((name, index) => `
                                <li draggable="true" style="padding: 6px; margin-bottom: 4px; cursor: grab; border: 1px solid #ccc;">
                                    <span class="damage-type">${name}</span>${["none", "detailsDSN", "details", "d20Only", "hitDamage", "hitCriticalDamage"].includes(rollDetailSetting) ? ` - ${rollTotals[index]} pts` : ""}
                                </li>`).join('')}
                            </ul>
                        </div>
                    </div>
                    <div style='padding-top: 20px; text-align: center; width: 100%;'>
                        <p><b>Time remaining</b></p>
                        <p><span id='countdown' style='font-size: 16px; color: red;'>${initialTimeLeft}</span> seconds</p>
                    </div>
                </div>
                <script>
                    let draggedItem = null;
        
                    document.querySelectorAll('#damageList li').forEach(item => {
                        item.addEventListener('dragstart', function(event) {
                            event.dataTransfer.setData('text/plain', event.target.innerText);
                            event.dataTransfer.effectAllowed = 'move';
                            draggedItem = event.target;
                        });
                    });
        
                    const damageList = document.getElementById('damageList');
        
                    damageList.addEventListener('dragover', function(event) {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = 'move';
                        const target = event.target;
                        if (target && target.nodeName === 'LI') {
                            const rect = target.getBoundingClientRect();
                            const next = (event.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
                            damageList.insertBefore(draggedItem, next && target.nextSibling || target);
                        }
                    });
        
                    damageList.addEventListener('dragend', function() {
                        draggedItem = null;
                    });
                </script>
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
                        if(source && source === "user") await socket.executeAsGM("closeDialogById", { dialogId: `cuttingwords_${game.users?.activeGM.id}` });
                        if(source && source === "gm") await socket.executeAsUser("closeDialogById", browserUser.id, { dialogId: `cuttingwords_${browserUser.id}` });
                        let actor = await fromUuid(actorUuid);
                        let token = await MidiQOL.tokenForActor(actorUuid);
                        let uuid = actor.uuid;
                        let originToken;
                        originToken = await fromUuid(tokenUuids);
                        originToken = await MidiQOL.tokenForActor(originToken.actor.uuid);
                        let damageChosen = [];
                        html.find("#damageList li .damage-type").each(function() {
                            damageChosen.push($(this).text().trim());
                        });

                        let chosenSpell = actor.items.find(i => i.name.toLowerCase() === "cutting words");

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

                        if(!itemRoll) return;

                        const hasEffectApplied = await game.dfreds.effectInterface.hasEffectApplied('Reaction', uuid);

                        if (!hasEffectApplied) {
                            game.dfreds.effectInterface.addEffect({ effectName: 'Reaction', uuid });
                        }

                        if(itemRoll.aborted === true) return resolve({ cuttingWordsDecision: false, damageChosen: false, programmaticallyClosed: false });

                        let hasDeafened = originToken.actor.effects.find(i => i.name.toLowerCase() === "deafened");
                        let charmImmunity = originToken.actor.system.traits.ci.value.has("charmed");
                        
                        if (charmImmunity || hasDeafened) {
                        let chatList = [];

                        chatList = `<span style='text-wrap: wrap;'>The creature seems to not be effected by your cutting words.<img src="${originToken.actor.img}" width="30" height="30" style="border:0px"></span>`;

                        let msgHistory = [];
                        game.messages.reduce((list, message) => {
                            if (message.flags["midi-qol"]?.itemId === chosenSpell._id && message.speaker.token === token.id) msgHistory.push(message.id);
                        }, msgHistory);
                        let itemCard = msgHistory[msgHistory.length - 1];
                        let chatMessage = await game.messages.get(itemCard);
                        let content = await duplicate(chatMessage.content);
                        let insertPosition = content.indexOf('<div class="end-midi-qol-attack-roll"></div>');
                        if (insertPosition !== -1) {
                            content = content.slice(0, insertPosition) + chatList + content.slice(insertPosition);
                        }
                        await chatMessage.update({ content: content });

                        return resolve({ cuttingWordsDecision: false, damageChosen: false, programmaticallyClosed: false });
                        }
                        
                        let cuttingWordsDecision = true;

                        resolve({cuttingWordsDecision, damageChosen, programmaticallyClosed: false});
                    }
                },
                no: {
                    label: "No",
                    callback: async () => {
                        // Reaction Declined
                        dialog.dialogState.interacted = true;
                        dialog.dialogState.decision = "no";
                        resolve({ cuttingWordsDecision: false, damageChosen: false, programmaticallyClosed: false});
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
                    resolve({ cuttingWordsDecision: false, damageChosen: false, programmaticallyClosed: true });
                }
                else if (!dialog.dialogState.interacted) {
                    resolve({ cuttingWordsDecision: false, damageChosen: false, programmaticallyClosed: false });
                }
            }
        });
        dialog.dialogState = {
            interacted: false,
            decision: null,
            programmaticallyClosed: false
        };
        dialog.render(true);
    })
}