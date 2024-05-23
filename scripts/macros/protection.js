export async function protection({workflowData,workflowType,workflowCombat}) {
    const module = await import('../module.js');
    const socket = module.socket;
    const helpers = await import('../helpers.js');
    const workflowUuid = workflowData;
    const workflow = await MidiQOL.Workflow.getWorkflow(workflowUuid);
    let itemName = "fighting style: protection";
    let itemProperName = "Protection";
    let dialogId = "protection";
    let target = workflow.targets.first();
    if(!workflow) return;
    if(workflow.item.name.toLowerCase() === itemName) return;
    let enableProtectionOnSuccess = MidiQOL.safeGetGameSetting('gambits-premades', 'enableProtectionOnSuccess');
    
    if (!game.combat) return;
    if (workflow.attackRoll.formula.includes("kl")) return;

    // Check if attack hits
    if(enableProtectionOnSuccess && (workflow.attackTotal < target.actor.system.attributes.ac.value)) return;
    // Check if Opportunity Attack is initiating the workflow
    if(workflow.item.name === "Opportunity Attack") return;

    let findValidTokens;

    if(workflowType === "attack") {
        findValidTokens = helpers.findValidTokens({initiatingToken: workflow.token, targetedToken: target, itemName: itemName, itemType: "item", itemChecked: ["shield"], reactionCheck: true, sightCheck: true, rangeCheck: true, rangeTotal: 5, dispositionCheck: true, dispositionCheckType: "enemyAlly", workflowType: workflowType, workflowCombat: workflowCombat});
    }
    
    let browserUser;
    
    for (const validTokenPrimary of findValidTokens) {
        let actorUuidPrimary = validTokenPrimary.actor.uuid;
        const dialogTitlePrimary = `${validTokenPrimary.actor.name} | ${itemProperName}`;
        const dialogTitleGM = `Waiting for ${validTokenPrimary.actor.name}'s selection | ${itemProperName}`;
        let originTokenUuidPrimary = workflow.token.document.uuid;
        browserUser = MidiQOL.playerForActor(validTokenPrimary.actor);
        if (!browserUser.active) browserUser = game.users?.activeGM;

        if(workflowType === "attack") {
            if (target.document.uuid === validTokenPrimary.document.uuid) return;

            let content = `<span style='text-wrap: wrap;'><img src="${validTokenPrimary.actor.img}" style="width: 25px; height: auto;" /> ${validTokenPrimary.actor.name} has a reaction available for an attack triggering ${itemProperName}.</span>`
            let chatData = {
            user: game.users.find(u => u.isGM).id,
            content: content,
            whisper: game.users.find(u => u.isGM).id
            };
            let notificationMessage = await MidiQOL.socket().executeAsGM("createChatMessage", { chatData });
            let result;
            
            if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser.id !== game.users?.activeGM.id) {
                let userDialogPromise = socket.executeAsUser("showProtectionDialog", browserUser.id, {targetUuids: originTokenUuidPrimary, actorUuid: actorUuidPrimary, tokenUuid: validTokenPrimary.document.uuid, dialogTitle: dialogTitlePrimary, targetNames: target.document.uuid, outcomeType: "attack", attackTotal: workflow.attackTotal, dialogId: `${dialogId}_${browserUser.id}`, source: "user", type: "multiDialog", itemProperName: itemProperName}).then(res => ({...res, source: "user", type: "multiDialog"}));
                
                let gmDialogPromise = socket.executeAsGM("showProtectionDialog", {targetUuids: originTokenUuidPrimary, actorUuid: actorUuidPrimary, tokenUuid: validTokenPrimary.document.uuid, dialogTitle: dialogTitleGM, targetNames: target.document.uuid, outcomeType: "attack", attackTotal: workflow.attackTotal, dialogId: `${dialogId}_${game.users?.activeGM.id}`, source: "gm", type: "multiDialog", itemProperName: itemProperName}).then(res => ({...res, source: "gm", type: "multiDialog"}));
            
                result = await socket.executeAsGM("handleDialogPromises", userDialogPromise, gmDialogPromise);
            } else {
                result = await socket.executeAsUser("showProtectionDialog", browserUser.id, {targetUuids: originTokenUuidPrimary, actorUuid: actorUuidPrimary, tokenUuid: validTokenPrimary.document.uuid, dialogTitle: dialogTitlePrimary, targetNames: target.document.uuid, outcomeType: "attack", attackTotal: workflow.attackTotal, itemProperName: itemProperName, source: browserUser.isGM ? "gm" : "user", type: "singleDialog"}).then(res => ({...res, source: browserUser.isGM ? "gm" : "user", type: "singleDialog"}));
            }
            
            const { userDecision, source, type } = result;

            if (userDecision === false || !userDecision) {
                if(source && source === "user" && type === "multiDialog") await socket.executeAsGM("closeDialogById", { dialogId: `${dialogId}_${game.users?.activeGM.id}` });
                if(source && source === "gm" && type === "multiDialog") await socket.executeAsUser("closeDialogById", browserUser.id, { dialogId: `${dialogId}_${browserUser.id}` });
                await socket.executeAsGM("deleteChatMessage", { chatId: notificationMessage._id });
                continue;
            }
            if (userDecision === true) {
                await socket.executeAsGM("deleteChatMessage", { chatId: notificationMessage._id });
                if(!enableProtectionOnSuccess) workflow.disadvantage = true;
                else if(enableProtectionOnSuccess) {
                    let straightRoll = workflow.attackRoll.dice[0].results[0].result + (workflow.attackRoll.total - workflow.attackRoll.dice[0].total);
                    if(workflow.attackRoll.formula.includes("kh")) {
                        const saveSetting = workflow.options.noOnUseMacro;
                        workflow.options.noOnUseMacro = true;
                        let reroll = await new Roll(`${straightRoll}`).roll({async: true});
                        await workflow.setAttackRoll(reroll);
                        workflow.options.noOnUseMacro = saveSetting;

                        if(target.actor.system.attributes.ac.value > reroll.total) content = `<span style='text-wrap: wrap;'>You use your Fighting Style - Protection to turn the advantage roll into a straight roll, and cause the target to miss ${target.actor.name}. <img src="${workflow.token.actor.img}" width="30" height="30" style="border:0px"></span>`;
                        else content = `<span style='text-wrap: wrap;'>You use your Fighting Style - Protection to turn the advantage roll into a straight roll, but the target still hits ${target.actor.name}. <img src="${workflow.token.actor.img}" width="30" height="30" style="border:0px"></span>`;
                
                        let actorPlayer = MidiQOL.playerForActor(validTokenPrimary.actor);
                        let chatData = {
                        user: actorPlayer.id,
                        speaker: ChatMessage.getSpeaker({ token: validTokenPrimary }),
                        content: content
                        };
                        ChatMessage.create(chatData);
                    }
                    else {
                        const saveSetting = workflow.options.noOnUseMacro;
                        let rerollAddition = workflow.attackRoll.total - workflow.attackRoll.dice[0].total;
                        workflow.options.noOnUseMacro = true;
                        let reroll = await new Roll(`1d20 + ${rerollAddition}`).roll({async: true});
                        if(reroll.total < workflow.attackTotal) await workflow.setAttackRoll(reroll);
                        await MidiQOL.displayDSNForRoll(reroll, 'damageRoll');
                        workflow.options.noOnUseMacro = saveSetting;
                
                        let content;
                
                        if(target.actor.system.attributes.ac.value > reroll.total) content = `<span style='text-wrap: wrap;'>You use your Fighting Style - Protection and cause the target to miss ${target.actor.name}. <img src="${workflow.token.actor.img}" width="30" height="30" style="border:0px"></span>`;
                        else content = `<span style='text-wrap: wrap;'>You use your Fighting Style - Protection but the target still hits ${target.actor.name}. <img src="${workflow.token.actor.img}" width="30" height="30" style="border:0px"></span>`;
                
                        let actorPlayer = MidiQOL.playerForActor(validTokenPrimary.actor);
                        let chatData = {
                        user: actorPlayer.id,
                        speaker: ChatMessage.getSpeaker({ token: validTokenPrimary }),
                        content: content
                        };
                        ChatMessage.create(chatData);
                    }
                }
            }
        }
    }
}

export async function showProtectionDialog({targetUuids, actorUuid, tokenUuid, dialogTitle, targetNames, outcomeType, attackTotal, dialogId, source, type, itemProperName}) {
    const module = await import('../module.js');
    const socket = module.socket;

    return await new Promise(resolve => {
        
        const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `${itemProperName} Timeout`));
        let dialogContent;
        let originToken = fromUuidSync(tokenUuid);
        let browserUser = MidiQOL.playerForActor(originToken.actor);
        let targetToken = fromUuidSync(targetNames);

        if(outcomeType === "attack") {
        dialogContent = `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 5px; background-color: transparent; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <div style="flex-grow: 1; margin-right: 20px;">
                    <p>Would you like to use Protection to disadvantage the attack against ${targetToken.actor.name}?</p>
                </div>
                <div style="display: flex; flex-direction: column; justify-content: center; padding-left: 20px; border-left: 1px solid #ccc; text-align: center;">
                    <p><b>Time Remaining</b></p>
                    <p><span id="countdown" style="font-size: 16px; color: red;">${initialTimeLeft}</span> seconds</p>
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

                        const hasEffectApplied = await game.dfreds.effectInterface.hasEffectApplied('Reaction', uuid);

                        if (!hasEffectApplied) {
                            game.dfreds.effectInterface.addEffect({ effectName: 'Reaction', uuid });
                        }
                        
                        let userDecision = true;

                        resolve({ userDecision, programmaticallyClosed: false });
                    }
                },
                no: {
                    label: "No",
                    callback: async () => {
                        // Reaction Declined
                        dialog.dialogState.interacted = true;
                        dialog.dialogState.decision = "no";
                        resolve({ userDecision: false, programmaticallyClosed: false });
                    }
                },
            }, default: "no",
            render: (html) => {
                $(html).attr('id', dialog.options.id);
                let timeLeft = initialTimeLeft;
                let isPaused = false;
                const countdownElement = html.find("#countdown");
                const pauseButton = html.find("#pauseButton");

                const updateTimer = (newTimeLeft, paused) => {
                    timeLeft = newTimeLeft;
                    isPaused = paused;
                    countdownElement.text(`${timeLeft}`);
                    pauseButton.text(isPaused ? 'Paused' : 'Pause');
                };

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
        dialog.dialogState = {
            interacted: false,
            decision: null,
            programmaticallyClosed: false
        };
        dialog.render(true);
    });
}