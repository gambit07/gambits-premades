export async function silveryBarbs({workflowData,workflowType}) {
    if(!game.user.isGM) return;
    if (game.settings.get('gambits-premades', 'Enable Silvery Barbs') === false) return;
    const module = await import('../module.js');
    const socket = module.socket;
    const workflowUuid = workflowData;
    const workflow = await MidiQOL.Workflow.getWorkflow(workflowUuid);
    if(!workflow) return console.log("no workflow");
    if(workflow.item.name.toLowerCase() === "silvery barbs") return console.log("item is silvery barbs");
    
    if (!game.combat) return console.log("no combat");

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

            // Check if the token has available spell slots/uses for counterspell
            const spells = t.actor.system.spells;
            let checkSpell = t.actor.items.find(i => i.name.toLowerCase() === "silvery barbs");
            let checkType = checkSpell.system.preparation.mode;
            let hasSpellSlots = false;
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
            let targetUuids = Array.from(workflow.saves).map(token => token.actor.uuid);
        const {silveryBarbsDecision} = await socket.executeAsUser("showSilveryBarbsDialog", browserUser.id, targetUuids, actorUuidPrimary, validTokenPrimary.document.uuid, dialogTitlePrimary);
        if (silveryBarbsDecision === false || !silveryBarbsDecision) continue;
        if (silveryBarbsDecision === true) {
                console.log(workflow, "saveroll")
                let target = workflow.saves.first();
                let reroll = await new Roll(`1d20`).roll({async: true});
                //let rerollAddition = workflow.attackRoll.total - workflow.attackRoll.dice[0].total
                //let rerollResult = reroll.total + rerollAddition;
                let targetAC = workflow.actor.system.attributes.spelldc;
                if(reroll.total < targetAC) {
                    workflow.saves.delete(target);
                    workflow.failedSaves.add(target);
                    let chatList = [];

                    chatList = `The creature was silvery barbed, they rolled a ${reroll.total} and needed a ${targetAC} <img src="${workflow.token.actor.img}" width="30" height="30" style="border:0px">`;

                    let msgHistory = [];
                    game.messages.reduce((list, message) => {
                        if (message.flags["midi-qol"]?.itemId === spellData._id && message.speaker.token === validTokenPrimary.id) msgHistory.push(message.id);
                    }, msgHistory);
                    console.log(msgHistory)
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

                    chatList = `The creature was silvery barbed, but still succeeded their save. <img src="${workflow.token.actor.img}" width="30" height="30" style="border:0px">`;

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
                const {silveryBarbsDecision} = await socket.executeAsUser("showSilveryBarbsDialog", browserUser.id, originTokenUuidPrimary, actorUuidPrimary, validTokenPrimary.document.uuid, dialogTitlePrimary);
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

                    chatList = `The creature was silvery barbed, they rolled a ${workflow.attackTotal} and needed a ${targetAC} <img src="${workflow.token.actor.img}" width="30" height="30" style="border:0px">`;

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

export async function showSilveryBarbsDialog(originTokenUuid, actorUuid, tokenUuid, dialogTitle) {
    return await new Promise(resolve => {
        const initialTimeLeft = Number(game.settings.get('gambits-premades', 'Silvery Barbs Timeout'));
        let dialogContent = `
            <div style='display: flex; align-items: center; justify-content: space-between;'>
                <div style='flex: 1;'>
                    Would you like to use your reaction to cast Silvery Barbs?<br/><br/>
                </div>
                <div style='border-left: 1px solid #ccc; padding-left: 10px; text-align: center;'>
                    <p><b>Time remaining</b></p>
                    <p><span id='countdown' style='font-size: 16px; color: red;'>${initialTimeLeft}</span> seconds</p>
                </div>
            </div>`;

        // Create temporary item for dialog
        let dialog = new Dialog({
            title: dialogTitle,
            content: dialogContent,
            buttons: {
                yes: {
                    label: "Yes",
                    callback: async () => {
                        let actor = await fromUuid(actorUuid);
                        let uuid = actor.uuid;
                        let token = await fromUuid(tokenUuid);
                        let originToken = await fromUuid(originTokenUuid);

                        let chosenSpell = actor.items.find(i => i.name.toLowerCase() === "silvery barbs");

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
                        let silveryBarbsDecision = true;

                        const hasEffectApplied = await game.dfreds.effectInterface.hasEffectApplied('Reaction', uuid);

                        if (!hasEffectApplied) {
                            game.dfreds.effectInterface.addEffect({ effectName: 'Reaction', uuid });
                        }

                        resolve({silveryBarbsDecision});
                    }
                },
                no: {
                    label: "No",
                    callback: async () => {
                        // Reaction Declined
                        resolve({ silveryBarbsDecision: false });
                    }
                },
            }, default: "no",
                render: (html) => { let timeLeft = initialTimeLeft; const countdownElement = html.find("#countdown"); const timer = setInterval(() => { timeLeft--; countdownElement.text(timeLeft); if (timeLeft <= 0) { clearInterval(timer); dialog.close(); } }, 1000); setTimeout(() => { clearInterval(timer); if (timeLeft > 0) dialog.close(); }, timeLeft * 1000); }
        });
        dialog.render(true);
    })
}