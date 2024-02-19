export async function counterspell() {
    Hooks.on("midi-qol.prePreambleComplete", async (workflow) => {
        if(workflow.item.type !== "spell" || workflow.item.name.toLowerCase() === "counterspell") return console.log("No spell was cast");
        
        //if(workflow.item.type !== "spell" || (workflow.item.type === "spell" && workflow.item.system.level === 0) || workflow.item.name.toLowerCase() === "counterspell") return; //Use this instead if you'd like to disable cantrips
        function findCounterspellTokens(token, dispositionCheck) {
        let validTokens = canvas.tokens.placeables.filter(t => {
            // Check if token is within 60 feet
            let distance = canvas.grid.measureDistance(workflow.token, t, { gridSpaces: true });
            if(distance > 60) return console.log(t.document.name, "token not within 60 feet");
            
            // Check if the token has counterspell available
            if (!t.actor.items.find(i => i.name.toLowerCase() === "counterspell")) return console.log(t.document.name, "token no counterspell");
            
            // Check if the tokens reaction already used
            let reactionUsed = t.actor.effects.find(i => i.name.toLowerCase() === "reaction");
            if (reactionUsed) return console.log(t.document.name, "token already used reaction");
            
            // Check if the token is the initiating token or is not an opposite token disposition
            if (dispositionCheck(t, workflow.token)) return console.log(t.document.name, "token did not pass disposition params");

            let midiSightTest = MidiQOL.canSee(t, workflow.token);
            
            if (midiSightTest === false) return console.log(t.document.name, "token can't see/sense caster");

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
                return console.log(t.document.name, "token has no available spell slots for Counterspell");
            }

            return t;
        });

        return validTokens;
    }

        const module = await import('../module.js');
        const socket = module.socket;

        let findCounterspellTokensPrimary = findCounterspellTokens(workflow.token, (checkedToken, initiatingToken) => {
            return checkedToken.id === initiatingToken.id || checkedToken.document.disposition === initiatingToken.document.disposition;
        });
        
        let castLevel = false;
        for (const validToken of findCounterspellTokensPrimary) {
            let workflowStatus = workflow.aborted;
            if(workflowStatus === true) return;
            let actorUuid = validToken.actor.uuid;
            const dialogTitle = `${validToken.actor.name} | Counterspell`;
            castLevel = !castLevel ? workflow.castData.castLevel : castLevel;
            let originTokenUuid = workflow.token.document.uuid;
            let browserUser = MidiQOL.playerForActor(validToken.actor);
            if (!browserUser.active) {
                browserUser = game.users?.activeGM;
            }
            
            const {counterspellSuccess, counterspellLevel} = await socket.executeAsUser("showCounterspellDialog", browserUser.id, originTokenUuid, actorUuid, validToken.document.uuid, castLevel, dialogTitle);
            if (counterspellSuccess === false) continue;
            if (counterspellSuccess === true) {
                castLevel = counterspellLevel;
                let findCounterspellTokensSecondary = findCounterspellTokens(workflow.token, (checkedToken, initiatingToken) => {
                    return checkedToken.document.disposition !== initiatingToken.document.disposition;
                });

                if(findCounterspellTokensSecondary.length === 0) return workflow.aborted = true;

                for (const validTokenSecondary of findCounterspellTokensSecondary) {
                    let actorUuid = validTokenSecondary.actor.uuid;
                    const dialogTitle = `${validTokenSecondary.actor.name} | Counterspell`;
                    let originTokenUuid = validToken.document.uuid;

                    const currentIndex = findCounterspellTokensSecondary.indexOf(validTokenSecondary);
                    const isLastToken = currentIndex === findCounterspellTokensSecondary.length - 1;
                    browserUser = MidiQOL.playerForActor(validTokenSecondary.actor);
                    if (!browserUser.active) {
                        browserUser = game.users?.activeGM;
                    }

                    const {counterspellSuccess, counterspellLevel} = await socket.executeAsUser("showCounterspellDialog", browserUser.id, originTokenUuid, actorUuid, validTokenSecondary.document.uuid, castLevel, dialogTitle);
                    
                    if (counterspellSuccess === true) {
                        castLevel = counterspellLevel;
                        break;
                    }
                    if (!counterspellSuccess && isLastToken) return workflow.aborted = true;
                    if (!counterspellSuccess) continue;
                }
            }
        }
    });
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

                        if(itemRoll.castData.castLevel <= castLevel) {
                            const skillCheck = await actor.rollAbilityTest(actor.system.attributes.spellcasting);
                            if (skillCheck.total >= spellThreshold) {
                                chatList = `<div class="midi-qol-flex-container"><div class="midi-qol-target-npc midi-qol-target-name" id="${originToken.id}"></br>The creature was counterspelled, you rolled a ${skillCheck.total} ${skillCheck.options.flavor}.</div><div><img src="${originToken.actor.img}" width="30" height="30" style="border:0px"></div></div>`;
                                counterspellSuccess = true;
                                counterspellLevel = itemRoll.castData.castLevel;
                            }
                            else {
                                chatList = `<div class="midi-qol-flex-container"><div class="midi-qol-target-npc midi-qol-target-name" id="${originToken.id}"></br>The creature was not counterspelled, you rolled a ${skillCheck.total} ${skillCheck.options.flavor} and needed a ${spellThreshold}.</div><div><img src="${originToken.actor.img}" width="30" height="30" style="border:0px"></div></div>`;
                                counterspellSuccess = false;
                            }
                        }
                        else {
                            chatList = `<div class="midi-qol-flex-container"><div class="midi-qol-target-npc midi-qol-target-name" id="${originToken.id}"></br>The creature was counterspelled because you cast counterspell at a higher level.</div><div><img src="${originToken.actor.img}" width="30" height="30" style="border:0px"></div></div>`;
                            counterspellSuccess = true;
                            counterspellLevel = itemRoll.castData.castLevel;
                        }
                        }
                        let finalResults = `<div><div class="midi-qol-nobox">` + chatList + `</div></div>`;
                        let msgHistory = [];
                        game.messages.reduce((list, message) => {
                            if (message.flags["midi-qol"]?.itemId === chosenSpell._id && message.speaker.token === token.id) msgHistory.push(message.id);
                        }, msgHistory);
                        let itemCard = msgHistory[msgHistory.length - 1];
                        let chatMessage = await game.messages.get(itemCard);
                        let content = await duplicate(chatMessage.content);
                        let insertPosition = content.indexOf('<div class="end-midi-qol-other-roll"></div>');
                        if (insertPosition !== -1) {
                            content = content.slice(0, insertPosition) + finalResults + content.slice(insertPosition);
                        }
                        await chatMessage.update({ content: content });
                        resolve({counterspellSuccess, counterspellLevel});
                    }
                },
                no: {
                    label: "No",
                    callback: async () => {
                        console.log("Reaction declined");
                        resolve({ counterspellSuccess: false, counterspellLevel: false });
                    }
                },
            }, default: "no",
                render: (html) => { let timeLeft = initialTimeLeft; const countdownElement = html.find("#countdown"); const timer = setInterval(() => { timeLeft--; countdownElement.text(timeLeft); if (timeLeft <= 0) { clearInterval(timer); dialog.close(); } }, 1000); setTimeout(() => { clearInterval(timer); if (timeLeft > 0) dialog.close(); }, timeLeft * 1000); }
        });
        dialog.render(true);
    })
}