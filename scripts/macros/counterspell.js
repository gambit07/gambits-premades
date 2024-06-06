export async function counterspell({ workflowData,workflowType,workflowCombat }) {
    const module = await import('../module.js');
    const socket = module.socket;
    const helpers = await import('../helpers.js');
    const workflowUuid = workflowData;
    const workflow = await MidiQOL.Workflow.getWorkflow(`${workflowUuid}`);
    let itemName = "counterspell";
    let itemProperName = "Counterspell";
    let dialogId = "counterspell";
    if(!workflow) return;
    if(workflow.item.type !== "spell" || workflow.item.name === itemProperName) return;
    const lastMessage = game.messages.contents[game.messages.contents.length - 1]; // Use to hide initial spell message
    
    if (!game.combat) return;

    let selectedToken = workflow.token;
    let castLevel = false;
    let browserUser;

    await initialCounterspellProcess(workflow, lastMessage, castLevel, selectedToken);
    
    async function initialCounterspellProcess(workflow, lastMessage, castLevel, selectedToken) {

        let findValidTokens = helpers.findValidTokens({initiatingToken: selectedToken, targetedToken: null, itemName: itemName, itemType: "spell", itemChecked: null, reactionCheck: true, sightCheck: true, rangeCheck: true, rangeTotal: 60, dispositionCheck: true, dispositionCheckType: "enemy", workflowType: workflowType, workflowCombat: workflowCombat});

        if(findValidTokens.length === 0 || !findValidTokens) return;

        for (const validTokenPrimary of findValidTokens) {
            let isIncapacitated = await MidiQOL.checkIncapacitated(validTokenPrimary);
            if(isIncapacitated) return;
            if(lastMessage && validTokenPrimary.actor.type === "character") lastMessage.update({ whisper: [game.users.find((u) => u.isGM && u.active).id] });
            let workflowStatus = workflow.aborted;
            if(workflowStatus === true) return;
            let actorUuidPrimary = validTokenPrimary.actor.uuid;
            const dialogTitlePrimary = `${validTokenPrimary.actor.name} | ${itemProperName}`;
            const dialogTitleGM = `Waiting for ${validTokenPrimary.actor.name}'s selection | ${itemProperName}`;
            castLevel = !castLevel ? workflow.castData.castLevel : castLevel;
            let originTokenUuidPrimary = workflow.token.document.uuid;
            browserUser = MidiQOL.playerForActor(validTokenPrimary.actor);
            if (!browserUser.active) {
                browserUser = game.users?.activeGM;
            }

            const currentIndex = findValidTokens.indexOf(validTokenPrimary);
            const isLastToken = currentIndex === findValidTokens.length - 1;

            let content = `<span style='text-wrap: wrap;'><img src="${validTokenPrimary.actor.img}" style="width: 25px; height: auto;" /> ${validTokenPrimary.actor.name} has a reaction available for a spell triggering ${itemProperName}.</span>`
            let chatData = {
            user: game.users.find(u => u.isGM).id,
            content: content,
            whisper: game.users.find(u => u.isGM).id
            };
            let notificationMessage = await MidiQOL.socket().executeAsGM("createChatMessage", { chatData });

            let result;
            
            if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser.id !== game.users?.activeGM.id) {
                let userDialogPromise = socket.executeAsUser("showCounterspellDialog", browserUser.id, {targetUuids: originTokenUuidPrimary, actorUuid: actorUuidPrimary, tokenUuid: validTokenPrimary.document.uuid, castLevel: castLevel, dialogTitle: dialogTitlePrimary, dialogId: dialogId, itemProperName: itemProperName, source: "user", type: "multiDialog"});
                
                let gmDialogPromise = socket.executeAsGM("showCounterspellDialog", {targetUuids: originTokenUuidPrimary, actorUuid: actorUuidPrimary, tokenUuid: validTokenPrimary.document.uuid, castLevel: castLevel, dialogTitle: dialogTitleGM, dialogId: dialogId, itemProperName: itemProperName, source: "gm", type: "multiDialog"});
        
                result = await socket.executeAsGM("handleDialogPromises", userDialogPromise, gmDialogPromise);
            } else {
                result = await socket.executeAsUser("showCounterspellDialog", browserUser.id, {targetUuids: originTokenUuidPrimary, actorUuid: actorUuidPrimary, tokenUuid: validTokenPrimary.document.uuid, castLevel: castLevel, dialogTitle: dialogTitlePrimary, itemProperName: itemProperName, source: browserUser.isGM ? "gm" : "user", type: "singleDialog"});
            }
            
            let { userDecision, counterspellLevel, source, type } = result;
            
            if (!userDecision) {
                if(source && source === "user" && type === "multiDialog") await socket.executeAsGM("closeDialogById", { dialogId: dialogId });
                if(source && source === "gm" && type === "multiDialog") await socket.executeAsUser("closeDialogById", browserUser.id, { dialogId: dialogId });
                if(lastMessage && validTokenPrimary.actor.type === "character") lastMessage.update({ whisper: [] });
                await socket.executeAsGM("deleteChatMessage", { chatId: notificationMessage._id });
                continue;
            }
            else if (!userDecision && isLastToken) {
                if(source && source === "user" && type === "multiDialog") await socket.executeAsGM("closeDialogById", { dialogId: dialogId });
                if(source && source === "gm" && type === "multiDialog") await socket.executeAsUser("closeDialogById", browserUser.id, { dialogId: dialogId });
                if(lastMessage && validTokenPrimary.actor.type === "character") lastMessage.update({ whisper: [] });
                await socket.executeAsGM("deleteChatMessage", { chatId: notificationMessageSecondary._id });
                return workflow.aborted = false;
            }
            else if (userDecision === true) {
                if(lastMessage && validTokenPrimary.actor.type === "character") lastMessage.update({ whisper: [] });
                await socket.executeAsGM("deleteChatMessage", { chatId: notificationMessage._id });
                castLevel = counterspellLevel;
                await secondaryCounterspellProcess(workflow, lastMessage, castLevel, validTokenPrimary);
                break;
            }
        }
    }

    async function secondaryCounterspellProcess(workflow, lastMessage, castLevel, validTokenPrimary) {        

            let findValidTokens = helpers.findValidTokens({initiatingToken: validTokenPrimary, targetedToken: null, itemName: itemName, itemType: "spell", itemChecked: null, reactionCheck: true, sightCheck: true, rangeCheck: true, rangeTotal: 60, dispositionCheck: true, dispositionCheckType: "enemy", workflowType: workflowType, workflowCombat: workflowCombat});

            if(findValidTokens.length === 0 || !findValidTokens) return workflow.aborted = true;

            for (const validTokenSecondary of findValidTokens) {
                let actorUuidSecondary = validTokenSecondary.actor.uuid;
                const dialogTitleSecondary = `${validTokenSecondary.actor.name} | ${itemProperName}`;
                const dialogTitleGMSecondary = `Waiting for ${validTokenSecondary.actor.name}'s selection | ${itemProperName}`;
                let originTokenUuidSecondary = validTokenPrimary.document.uuid;

                const currentIndex = findValidTokens.indexOf(validTokenSecondary);
                const isLastToken = currentIndex === findValidTokens.length - 1;
                browserUser = MidiQOL.playerForActor(validTokenSecondary.actor);
                if (!browserUser.active) {
                    browserUser = game.users?.activeGM;
                }

                let contentSecondary = `<span style='text-wrap: wrap;'><img src="${validTokenSecondary.actor.img}" style="width: 25px; height: auto;" /> ${validTokenSecondary.actor.name} has a reaction available for a spell triggering ${itemProperName}.</span>`
                let chatData = {
                user: game.users.find(u => u.isGM).id,
                content: contentSecondary,
                whisper: game.users.find(u => u.isGM).id
                };
                let notificationMessageSecondary = await MidiQOL.socket().executeAsGM("createChatMessage", { chatData });

                let result;

                if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser.id !== game.users?.activeGM.id) {
                    let userDialogPromise = socket.executeAsUser("showCounterspellDialog", browserUser.id, {targetUuids: originTokenUuidSecondary, actorUuid: actorUuidSecondary, tokenUuid: validTokenSecondary.document.uuid, castLevel: castLevel, dialogTitle: dialogTitleSecondary, dialogId: dialogId, itemProperName: itemProperName, source: "user", type: "multiDialog"});

                    let gmDialogPromise = socket.executeAsGM("showCounterspellDialog", {targetUuids: originTokenUuidSecondary, actorUuid: actorUuidSecondary, tokenUuid: validTokenSecondary.document.uuid, castLevel: castLevel, dialogTitle: dialogTitleGMSecondary, dialogId: dialogId, itemProperName: itemProperName, source: "gm", type: "multiDialog"});
                
                    result = await socket.executeAsGM("handleDialogPromises", userDialogPromise, gmDialogPromise);
                } else {
                    result = await socket.executeAsUser("showCounterspellDialog", browserUser.id, {targetUuids: originTokenUuidSecondary, actorUuid: actorUuidSecondary, tokenUuid: validTokenSecondary.document.uuid, castLevel: castLevel, dialogTitle: dialogTitleSecondary, itemProperName: itemProperName, source: browserUser.isGM ? "gm" : "user", type: "singleDialog"});
                }

                let { userDecision, counterspellLevel, source, type } = result;

                if (userDecision === true) {
                    if(lastMessage && validTokenPrimary.actor.type === "character") lastMessage.update({ whisper: [] });
                    await socket.executeAsGM("deleteChatMessage", { chatId: notificationMessageSecondary._id });
                    castLevel = counterspellLevel;
                    await initialCounterspellProcess(workflow, lastMessage, castLevel, validTokenSecondary);
                    break;
                }
                else if (!userDecision && isLastToken) {
                    if(source && source === "user" && type === "multiDialog") await socket.executeAsGM("closeDialogById", { dialogId: dialogId });
                    if(source && source === "gm" && type === "multiDialog") await socket.executeAsUser("closeDialogById", browserUser.id, { dialogId: dialogId });
                    if(lastMessage && validTokenPrimary.actor.type === "character") lastMessage.update({ whisper: [] });
                    await socket.executeAsGM("deleteChatMessage", { chatId: notificationMessageSecondary._id });
                    return workflow.aborted = true;
                }
                else if (!userDecision) {
                    if(source && source === "user" && type === "multiDialog") await socket.executeAsGM("closeDialogById", { dialogId: dialogId });
                    if(source && source === "gm" && type === "multiDialog") await socket.executeAsUser("closeDialogById", browserUser.id, { dialogId: dialogId });
                    if(lastMessage) lastMessage.update({ whisper: [] });
                    await socket.executeAsGM("deleteChatMessage", { chatId: notificationMessageSecondary._id });
                    continue;
                }
            }
        }
    }

export async function showCounterspellDialog({targetUuids, actorUuid, tokenUuid, castLevel, dialogTitle, dialogId, source, type, itemProperName}) {
    const module = await import('../module.js');
    const socket = module.socket;

    return await new Promise(resolve => {
        async function wait(ms) { return new Promise(resolve => { setTimeout(resolve, ms); }); };
        
        const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `${itemProperName} Timeout`));
        let dialogContent = `
            <div style='display: flex; align-items: center; justify-content: space-between;'>
                <div style='flex: 1;'>
                    Would you like to use your reaction to ${itemProperName}?<br/><br/>
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
                        if(source && source === "user" && type === "multiDialog") await socket.executeAsGM("closeDialogById", { dialogId: dialogId });
                        if(source && source === "gm" && type === "multiDialog") await socket.executeAsUser("closeDialogById", browserUser.id, { dialogId: dialogId });
                        let uuid = actor.uuid;
                        let token = await fromUuid(tokenUuid);
                        let originToken = await fromUuid(targetUuids);

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
                        if(itemRoll.aborted === true) return resolve({ userDecision: false, counterspellLevel: false, programmaticallyClosed: false, source, type });

                        let userDecision = false;
                        let counterspellLevel = false;
                        let programmaticallyClosed = false;

                        let spellPenetrationEnabled = MidiQOL.safeGetGameSetting('gambits-premades', `enableCounterspellSpellPenetration`);
                        let spellPenetration;
                        let spellPenetrationGreater;
                        let spellPenetrationChat;
                        
                        if(spellPenetrationEnabled) {
                            spellPenetration = originToken.actor.items.find(i => i.name === "Spell Penetration");
                            spellPenetrationGreater = originToken.actor.items.find(i => i.name === "Greater Spell Penetration");
                            if(spellPenetration) {
                                castLevel = castLevel + 3;
                                spellPenetrationChat = "<br><br>The spell being countered was considered 3 levels higher due to the caster's <b>Spell Penetration</b> feature.";
                            }
                            else if(spellPenetrationGreater) {
                                castLevel = castLevel + 5;
                                spellPenetrationChat = "<br><br>The spell being countered was considered 5 levels higher due to the caster's <b>Greater Spell Penetration</b> feature.";
                            }
                        }

                        let chatList = [];
                        if(itemRoll) {
                        const spellThreshold = castLevel + 10;

                        if(itemRoll.castData.castLevel < castLevel) {
                            const skillCheck = await actor.rollAbilityTest(actor.system.attributes.spellcasting);
                            let skillCheckTotal;
                            let abjurationCheck = actor.items.find(i => i.name.toLowerCase() === "improved abjuration");
                            abjurationCheck ? skillCheckTotal = skillCheck.total + actor.system?.attributes?.prof : skillCheckTotal = skillCheck.total;
                            if (skillCheckTotal >= spellThreshold) {
                                chatList = `<span style='text-wrap: wrap;'>The creature was counterspelled, you rolled a ${skillCheckTotal} ${skillCheck.options.flavor}.<br><img src="${originToken.actor.img}" width="30" height="30" style="border:0px"></span>`;
                                userDecision = true;
                                counterspellLevel = itemRoll.castData.castLevel;
                            }
                            else {
                                chatList = `<span style='text-wrap: wrap;'>The creature was not counterspelled, you rolled a ${skillCheckTotal} ${skillCheck.options.flavor} and needed a ${spellThreshold}.${spellPenetrationChat}<br><img src="${originToken.actor.img}" width="30" height="30" style="border:0px"></span>`;
                                userDecision = false;
                            }
                        }
                        else {
                            chatList = `<span style='text-wrap: wrap;'>The creature was counterspelled because you cast ${itemProperName} at an equal or higher level.<br><img src="${originToken.actor.img}" width="30" height="30" style="border:0px"></span>`;
                            userDecision = true;
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
                        resolve({userDecision, counterspellLevel, programmaticallyClosed, source, type});
                    }
                },
                no: {
                    label: "No",
                    callback: async () => {
                        // Reaction Declined
                        dialog.dialogState.interacted = true;
                        dialog.dialogState.decision = "no";
                        resolve({ userDecision: false, counterspellLevel: false, programmaticallyClosed: false, source, type });
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
                    resolve({ userDecision: false, counterspellLevel: false, programmaticallyClosed: true, source, type });
                }
                else if (!dialog.dialogState.interacted) {
                    resolve({ userDecision: false, counterspellLevel: false, programmaticallyClosed: false, source, type });
                }
            }
        });
        dialog.dialogState = { interacted: false, decision: null, programmaticallyClosed: false };
        dialog.render(true);
    });
}