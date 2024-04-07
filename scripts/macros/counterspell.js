export async function counterspell({ workflowData }) {
    const module = await import('../module.js');
    const socket = module.socket;
    const workflowUuid = workflowData;
    const workflow = await MidiQOL.Workflow.getWorkflow(`${workflowUuid}`);
    if(!workflow) return;
    if(workflow.item.type !== "spell" || workflow.item.name.toLowerCase().includes("counterspell")) return;
    const lastMessage = game.messages.contents[game.messages.contents.length - 1]; // Use to hide initial spell message
    
    if (!game.combat) return;

    function findCounterspellTokens(token, dispositionCheck) {
        let validTokens = game.combat.combatants.map(combatant => canvas.tokens.get(combatant.tokenId)).filter(t => {
            // Check if invalid token on the canvas
            if (!t.actor) return;

            // Check if the token has counterspell available
            let checkSpells = t.actor.items.filter(i => i.name.toLowerCase().includes("counterspell"));
            let checkSpell = checkSpells.find(spell => spell?.system?.preparation?.mode);
            if(!checkSpell) return;

            // Check if the tokens reaction already used
            if (t.actor.effects.find(i => i.name.toLowerCase() === "reaction")) return;
            
            // Check if the token is the initiating token or is not an opposite token disposition
            if (dispositionCheck(t, token)) return;

            // Check if token can see initiating token that cast spell
            if(!MidiQOL.canSee(t, token)) return;

            // Check if scene is gridless
            let gridDecision;
            canvas.scene.grid.type === 0 ? gridDecision = false : gridDecision = true;

            // Check if token is within 60 feet
            let distance = canvas.grid.measureDistance(token, t, { gridSpaces: gridDecision });
            if(distance > 60) return;

            // Check if the token has available spell slots/uses for counterspell
            const spells = t.actor.system.spells;
            
            let checkType = checkSpell?.system?.preparation?.mode;
            let hasSpellSlots = false;
            if(checkType === "prepared" && checkSpell.system.preparation.prepared === false) return;
            if(checkType === "prepared" || checkType === "always")
            {
                for (let level = 3; level <= 9; level++) {
                    let spellSlot = t.actor.system.spells[`spell${level}`].value;
                    if (spellSlot > 0) {
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

    let selectedToken = workflow.token;
    let castLevel = false;
    let browserUser;

    await initialCounterspellProcess(workflow, lastMessage, castLevel, selectedToken);
    
    async function initialCounterspellProcess(workflow, lastMessage, castLevel, selectedToken) {
        let findCounterspellTokensPrimary = findCounterspellTokens(selectedToken, (checkedToken, initiatingToken) => {
            return checkedToken.id === initiatingToken.id || checkedToken.document.disposition === initiatingToken.document.disposition;
        });

        if(findCounterspellTokensPrimary.length === 0 || !findCounterspellTokensPrimary) return;

        for (const validTokenPrimary of findCounterspellTokensPrimary) {
            if(lastMessage && validTokenPrimary.actor.type === "character") lastMessage.update({ whisper: [game.users.find((u) => u.isGM && u.active).id] });
            let workflowStatus = workflow.aborted;
            if(workflowStatus === true) return;
            let actorUuidPrimary = validTokenPrimary.actor.uuid;
            const dialogTitlePrimary = `${validTokenPrimary.actor.name} | Counterspell`;
            const dialogTitleGM = `Waiting for ${validTokenPrimary.actor.name}'s selection | Counterspell`;
            castLevel = !castLevel ? workflow.castData.castLevel : castLevel;
            let originTokenUuidPrimary = workflow.token.document.uuid;
            browserUser = MidiQOL.playerForActor(validTokenPrimary.actor);
            if (!browserUser.active) {
                browserUser = game.users?.activeGM;
            }

            const currentIndex = findCounterspellTokensPrimary.indexOf(validTokenPrimary);
            const isLastToken = currentIndex === findCounterspellTokensPrimary.length - 1;

            let content = `<img src="${validTokenPrimary.actor.img}" style="width: 25px; height: auto;" /> ${validTokenPrimary.actor.name} has a reaction available for a spell triggering Counterspell.`
            let chatData = {
            user: game.users.find(u => u.isGM).id,
            content: content,
            whisper: game.users.find(u => u.isGM).id
            };
            let notificationMessage = await MidiQOL.socket().executeAsGM("createChatMessage", { chatData });

            let result;

            if (game.settings.get('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser.id !== game.users?.activeGM.id) {
                let userDialogPromise = socket.executeAsUser("showCounterspellDialog", browserUser.id, originTokenUuidPrimary, actorUuidPrimary, validTokenPrimary.document.uuid, castLevel, dialogTitlePrimary, `counterspell_${browserUser.id}`, 'user').then(res => ({...res, source: "user"}));
                let gmDialogPromise = socket.executeAsGM("showCounterspellDialog", originTokenUuidPrimary, actorUuidPrimary, validTokenPrimary.document.uuid, castLevel, dialogTitleGM, `counterspell_${game.users?.activeGM.id}`, 'gm').then(res => ({...res, source: "gm"}));
        
                result = await socket.executeAsGM("handleDialogPromises", userDialogPromise, gmDialogPromise);
            } else {
                result = await socket.executeAsUser("showCounterspellDialog", browserUser.id, originTokenUuidPrimary, actorUuidPrimary, validTokenPrimary.document.uuid, castLevel, dialogTitlePrimary);
            }
            
            let { counterspellSuccess, counterspellLevel, source, programmaticallyClosed } = result;
            
            if (!counterspellSuccess && !programmaticallyClosed) {
                if(source && source === "user") await socket.executeAsGM("closeDialogById", { dialogId: `counterspell_${game.users?.activeGM.id}` });
                if(source && source === "gm") await socket.executeAsUser("closeDialogById", browserUser.id, { dialogId: `counterspell_${browserUser.id}` });
                if(lastMessage && validTokenPrimary.actor.type === "character") lastMessage.update({ whisper: [] });
                await socket.executeAsGM("deleteChatMessage", { chatId: notificationMessage._id });
                continue;
            }
            else if (!counterspellSuccess && isLastToken && !programmaticallyClosed) {
                if(source && source === "user") await socket.executeAsGM("closeDialogById", { dialogId: `counterspell_${game.users?.activeGM.id}` });
                if(source && source === "gm") await socket.executeAsUser("closeDialogById", browserUser.id, { dialogId: `counterspell_${browserUser.id}` });
                if(lastMessage && validTokenPrimary.actor.type === "character") lastMessage.update({ whisper: [] });
                await socket.executeAsGM("deleteChatMessage", { chatId: notificationMessageSecondary._id });
                return workflow.aborted = false;
            }
            else if (counterspellSuccess === true && !programmaticallyClosed) {
                if(lastMessage && validTokenPrimary.actor.type === "character") lastMessage.update({ whisper: [] });
                await socket.executeAsGM("deleteChatMessage", { chatId: notificationMessage._id });
                castLevel = counterspellLevel;
                await secondaryCounterspellProcess(workflow, lastMessage, castLevel, validTokenPrimary);
                break;
            }
        }
    }

    async function secondaryCounterspellProcess(workflow, lastMessage, castLevel, validTokenPrimary) {        
            let findCounterspellTokensSecondary = findCounterspellTokens(validTokenPrimary, (checkedToken, initiatingToken) => {
                return checkedToken.document.disposition === initiatingToken.document.disposition;
            });

            if(findCounterspellTokensSecondary.length === 0 || !findCounterspellTokensSecondary) return workflow.aborted = true;

            for (const validTokenSecondary of findCounterspellTokensSecondary) {
                let actorUuidSecondary = validTokenSecondary.actor.uuid;
                const dialogTitleSecondary = `${validTokenSecondary.actor.name} | Counterspell`;
                const dialogTitleGMSecondary = `Waiting for ${validTokenSecondary.actor.name}'s selection | Counterspell`;
                let originTokenUuidSecondary = validTokenPrimary.document.uuid;

                const currentIndex = findCounterspellTokensSecondary.indexOf(validTokenSecondary);
                const isLastToken = currentIndex === findCounterspellTokensSecondary.length - 1;
                browserUser = MidiQOL.playerForActor(validTokenSecondary.actor);
                if (!browserUser.active) {
                    browserUser = game.users?.activeGM;
                }

                let contentSecondary = `<img src="${validTokenSecondary.actor.img}" style="width: 25px; height: auto;" /> ${validTokenSecondary.actor.name} has a reaction available for a spell triggering Counterspell.`
                let chatData = {
                user: game.users.find(u => u.isGM).id,
                content: contentSecondary,
                whisper: game.users.find(u => u.isGM).id
                };
                let notificationMessageSecondary = await MidiQOL.socket().executeAsGM("createChatMessage", { chatData });

                let result;

                if (game.settings.get('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser.id !== game.users?.activeGM.id) {
                    let userDialogPromise = socket.executeAsUser("showCounterspellDialog", browserUser.id, originTokenUuidSecondary, actorUuidSecondary, validTokenSecondary.document.uuid, castLevel, dialogTitleSecondary, `counterspell_${browserUser.id}`, 'user').then(res => ({...res, source: "user"}));
                    let gmDialogPromise = socket.executeAsGM("showCounterspellDialog", originTokenUuidSecondary, actorUuidSecondary, validTokenSecondary.document.uuid, castLevel, dialogTitleGMSecondary, `counterspell_${game.users?.activeGM.id}`, 'gm').then(res => ({...res, source: "gm"}));
                
                    result = await socket.executeAsGM("handleDialogPromises", userDialogPromise, gmDialogPromise);
                } else {
                    result = await socket.executeAsUser("showCounterspellDialog", browserUser.id, originTokenUuidSecondary, actorUuidSecondary, validTokenSecondary.document.uuid, castLevel, dialogTitleSecondary);
                }

                let { counterspellSuccess, counterspellLevel, source, programmaticallyClosed } = result;

                if (counterspellSuccess === true && !programmaticallyClosed) {
                    if(lastMessage && validTokenPrimary.actor.type === "character") lastMessage.update({ whisper: [] });
                    await socket.executeAsGM("deleteChatMessage", { chatId: notificationMessageSecondary._id });
                    castLevel = counterspellLevel;
                    await initialCounterspellProcess(workflow, lastMessage, castLevel, validTokenSecondary);
                    break;
                }
                else if (!counterspellSuccess && isLastToken && !programmaticallyClosed) {
                    if(source && source === "user") await socket.executeAsGM("closeDialogById", { dialogId: `counterspell_${game.users?.activeGM.id}` });
                    if(source && source === "gm") await socket.executeAsUser("closeDialogById", browserUser.id, { dialogId: `counterspell_${browserUser.id}` });
                    if(lastMessage && validTokenPrimary.actor.type === "character") lastMessage.update({ whisper: [] });
                    await socket.executeAsGM("deleteChatMessage", { chatId: notificationMessageSecondary._id });
                    return workflow.aborted = true;
                }
                else if (!counterspellSuccess && !programmaticallyClosed) {
                    if(source && source === "user") await socket.executeAsGM("closeDialogById", { dialogId: `counterspell_${game.users?.activeGM.id}` });
                    if(source && source === "gm") await socket.executeAsUser("closeDialogById", browserUser.id, { dialogId: `counterspell_${browserUser.id}` });
                    if(lastMessage) lastMessage.update({ whisper: [] });
                    await socket.executeAsGM("deleteChatMessage", { chatId: notificationMessageSecondary._id });
                    continue;
                }
            }
        }
    }

export async function showCounterspellDialog(originTokenUuid, actorUuid, tokenUuid, castLevel, dialogTitle, dialogId, source) {
    const module = await import('../module.js');
    const socket = module.socket;

    return await new Promise(resolve => {
        async function wait(ms) { return new Promise(resolve => { setTimeout(resolve, ms); }); };
        const initialTimeLeft = Number(game.settings.get('gambits-premades', 'Counterspell Timeout'));
        let dialogContent = `
            <div style='display: flex; align-items: center; justify-content: space-between;'>
                <div style='flex: 1;'>
                    Would you like to use your reaction to counterspell?<br/><br/>
                </div>
                <div style='padding-left: 20px; text-align: center; border-left: 1px solid #ccc;'>
                    <p><b>Time remaining</b></p>
                    <p><span id='countdown' style='font-size: 16px; color: red;'>${initialTimeLeft}</span> seconds</p>
                    <p><button id='pauseButton' style='margin-top: 16px;'>Pause</button></p>
                </div>
            </div>`;

        let timer;

        let dialog = new Dialog({
            title: dialogTitle,
            content: dialogContent,
            id: dialogId,
            buttons: {
                yes: {
                    label: "Yes",
                    callback: async () => {
                        dialog.dialogState.interacted = true;
                        dialog.dialogState.decision = "yes";
                        let actor = await fromUuid(actorUuid);
                        let browserUser = MidiQOL.playerForActor(actor);
                        if(source && source === "user") await socket.executeAsGM("closeDialogById", { dialogId: `counterspell_${game.users?.activeGM.id}` });
                        if(source && source === "gm") await socket.executeAsUser("closeDialogById", browserUser.id, { dialogId: `counterspell_${browserUser.id}` });
                        let uuid = actor.uuid;
                        let token = await fromUuid(tokenUuid);
                        let originToken = await fromUuid(originTokenUuid);

                        let chosenSpell = actor.items.find(i => i.name.toLowerCase().includes("counterspell"));

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
                        let programmaticallyClosed = false;

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
                        await wait(100); //Short pause for chat message creation
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
                        resolve({counterspellSuccess, counterspellLevel, programmaticallyClosed});
                    }
                },
                no: {
                    label: "No",
                    callback: async () => {
                        // Reaction Declined
                        dialog.dialogState.interacted = true;
                        dialog.dialogState.decision = "no";
                        resolve({ counterspellSuccess: false, counterspellLevel: false, programmaticallyClosed: false });
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
                    resolve({counterspellSuccess: false, counterspellLevel: null, programmaticallyClosed: true});
                }
                else if (!dialog.dialogState.interacted) {
                    resolve({ counterspellSuccess: false, counterspellLevel: null, programmaticallyClosed: false });
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