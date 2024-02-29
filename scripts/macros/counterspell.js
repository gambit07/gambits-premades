export async function counterspell(data) {
    if(!game.user.isGM) return;
    if (game.settings.get('gambits-premades', 'Enable Counterspell') === false) return;
    const module = await import('../module.js');
    const socket = module.socket;
    const workflowUuid = data.workflowData;
    const workflow = await MidiQOL.Workflow.getWorkflow(workflowUuid);
    if(!workflow) return;
    if(workflow.item.type !== "spell" || workflow.item.name.toLowerCase() === "counterspell") return;     
    //if(workflow.item.type !== "spell" || (workflow.item.type === "spell" && workflow.item.system.level === 0) || workflow.item.name.toLowerCase() === "counterspell") return; //Use this instead if you'd like to disable cantrips
    
    if (!game.combat) return;

    function findCounterspellTokens(token, dispositionCheck) {
        let validTokens = canvas.tokens.placeables.filter(t => {
            // Check if the token has counterspell available
            if (!t.actor.items.find(i => i.name.toLowerCase() === "counterspell")) return;

            // Check if the tokens reaction already used
            let reactionUsed = t.actor.effects.find(i => i.name.toLowerCase() === "reaction");
            if (reactionUsed) return;
            
            // Check if the token is the initiating token or is not an opposite token disposition
            if (dispositionCheck(t, token)) return;

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
            let checkSpell = t.actor.items.find(i => i.name.toLowerCase() === "counterspell");
            let checkType = checkSpell.system.preparation.mode;
            let hasSpellSlots = false;
            if(checkType === "prepared" || checkType === "always")
            {
                for (let level = 3; level <= 9; level++) {
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

    let findCounterspellTokensPrimary = findCounterspellTokens(workflow.token, (checkedToken, initiatingToken) => {
        return checkedToken.id === initiatingToken.id || checkedToken.document.disposition === initiatingToken.document.disposition;
    });
    
    let castLevel = false;
    let browserUser;
    
    for (const validTokenPrimary of findCounterspellTokensPrimary) {
        let workflowStatus = workflow.aborted;
        if(workflowStatus === true) return;
        let actorUuidPrimary = validTokenPrimary.actor.uuid;
        const dialogTitlePrimary = `${validTokenPrimary.actor.name} | Counterspell`;
        castLevel = !castLevel ? workflow.castData.castLevel : castLevel;
        let originTokenUuidPrimary = workflow.token.document.uuid;
        browserUser = MidiQOL.playerForActor(validTokenPrimary.actor);
        if (!browserUser.active) {
            browserUser = game.users?.activeGM;
        }
        
        const {counterspellSuccess, counterspellLevel} = await socket.executeAsUser("showCounterspellDialog", browserUser.id, originTokenUuidPrimary, actorUuidPrimary, validTokenPrimary.document.uuid, castLevel, dialogTitlePrimary);
        console.log(counterspellSuccess, "counterspell success first loop")
        if (counterspellSuccess === false || !counterspellSuccess) continue;
        if (counterspellSuccess === true) {
            castLevel = counterspellLevel;
            let findCounterspellTokensSecondary = findCounterspellTokens(workflow.token, (checkedToken, initiatingToken) => {
                return checkedToken.document.disposition !== initiatingToken.document.disposition;
            });

            if(findCounterspellTokensSecondary.length === 0) return workflow.aborted = true;

            for (const validTokenSecondary of findCounterspellTokensSecondary) {
                let actorUuidSecondary = validTokenSecondary.actor.uuid;
                const dialogTitleSecondary = `${validTokenSecondary.actor.name} | Counterspell`;
                let originTokenUuidSecondary = validTokenPrimary.document.uuid;

                const currentIndex = findCounterspellTokensSecondary.indexOf(validTokenSecondary);
                const isLastToken = currentIndex === findCounterspellTokensSecondary.length - 1;
                browserUser = MidiQOL.playerForActor(validTokenSecondary.actor);
                if (!browserUser.active) {
                    browserUser = game.users?.activeGM;
                }

                const {counterspellSuccess, counterspellLevel} = await socket.executeAsUser("showCounterspellDialog", browserUser.id, originTokenUuidSecondary, actorUuidSecondary, validTokenSecondary.document.uuid, castLevel, dialogTitleSecondary);
                console.log(counterspellSuccess, "counterspell success second loop")
                if (counterspellSuccess === true) {
                    castLevel = counterspellLevel;
                    break;
                }
                if (!counterspellSuccess && isLastToken) return workflow.aborted = true;
                if (!counterspellSuccess) continue;
            }
        }
    }
}

export async function showCounterspellDialog(originTokenUuid, actorUuid, tokenUuid, castLevel, dialogTitle) {
    return await new Promise(resolve => {
        const initialTimeLeft = Number(game.settings.get('gambits-premades', 'Counterspell Timeout'));
        let dialogContent = `
            <div style='display: flex; align-items: center; justify-content: space-between;'>
                <div style='flex: 1;'>
                    Would you like to use your reaction to counterspell?<br/><br/>
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

                        let chosenSpell = actor.items.find(i => i.name.toLowerCase() === "counterspell");

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
                        let counterspellSuccess = false;
                        let counterspellLevel = false;

                        let chatList = [];
                        if(itemRoll) {
                        const spellThreshold = castLevel + 10;

                        if(itemRoll.castData.castLevel < castLevel) {
                            const skillCheck = await actor.rollAbilityTest(actor.system.attributes.spellcasting);
                            let skillCheckTotal;
                            let abjurationCheck = actor.items.find(i => i.name.toLowerCase() === "improved abjuration");
                            abjurationCheck ? skillCheckTotal = skillCheck.total + actor.system?.attributes?.prof : skillCheckTotal = skillCheck.total;
                            if (skillCheckTotal >= spellThreshold) {
                                chatList = `The creature was counterspelled, you rolled a ${skillCheckTotal} ${skillCheck.options.flavor}.  <img src="${originToken.actor.img}" width="30" height="30" style="border:0px">`;
                                counterspellSuccess = true;
                                counterspellLevel = itemRoll.castData.castLevel;
                            }
                            else {
                                chatList = `The creature was not counterspelled, you rolled a ${skillCheckTotal} ${skillCheck.options.flavor} and needed a ${spellThreshold}.  <img src="${originToken.actor.img}" width="30" height="30" style="border:0px">`;
                                counterspellSuccess = false;
                            }
                        }
                        else {
                            chatList = `The creature was counterspelled because you cast counterspell at an equal or higher level. <img src="${originToken.actor.img}" width="30" height="30" style="border:0px">`;
                            counterspellSuccess = true;
                            counterspellLevel = itemRoll.castData.castLevel;
                        }

                        const hasEffectApplied = await game.dfreds.effectInterface.hasEffectApplied('Reaction', uuid);

                        if (!hasEffectApplied) {
                            game.dfreds.effectInterface.addEffect({ effectName: 'Reaction', uuid });
                        }
                        }
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
                        resolve({counterspellSuccess, counterspellLevel});
                    }
                },
                no: {
                    label: "No",
                    callback: async () => {
                        // Reaction Declined
                        resolve({ counterspellSuccess: false, counterspellLevel: false });
                    }
                },
            }, default: "no",
                render: (html) => { let timeLeft = initialTimeLeft; const countdownElement = html.find("#countdown"); const timer = setInterval(() => { timeLeft--; countdownElement.text(timeLeft); if (timeLeft <= 0) { clearInterval(timer); dialog.close(); } }, 1000); setTimeout(() => { clearInterval(timer); if (timeLeft > 0) dialog.close(); }, timeLeft * 1000); }
        });
        dialog.render(true);
    })
}