export async function poetryInMisery({workflowData,workflowType}) {
    const module = await import('../module.js');
    const helpers = await import('../helpers.js');
    const socket = module.socket;
    const workflowUuid = workflowData;
    const workflow = await MidiQOL.Workflow.getWorkflow(workflowUuid);
    let itemName = "poetry in misery";
    if(!workflow) return;
    if(workflow.item.name.toLowerCase() === itemName) return;
    if(!workflow.attackRoll.isFumble) return;
    console.log(workflow)

    if (!game.combat) return;

    // Check if Opportunity Attack is initiating the workflow
    if(workflow.item.name === "Opportunity Attack") return;

    let findPoetryInMiseryTokens = helpers.findValidTokens(workflow.token, workflow.token, itemName, null, null, true, false, true, 30, true, "ally");

    let browserUser;

    for (const validTokenPrimary of findPoetryInMiseryTokens) {
        const itemData = validTokenPrimary.actor.items.find(i => i.name.toLowerCase() === itemName);
        if(itemData.system.uses?.value === itemData.system.uses?.max) return;
        let actorUuidPrimary = validTokenPrimary.actor.uuid;
        const dialogTitlePrimary = `${validTokenPrimary.actor.name} | Poetry In Misery`;
        const dialogTitleGM = `Waiting for ${validTokenPrimary.actor.name}'s selection | Poetry In Misery`;
        let originTokenUuidPrimary = workflow.token.document.uuid;
        browserUser = MidiQOL.playerForActor(validTokenPrimary.actor);
        if (!browserUser.active) {
            browserUser = game.users?.activeGM;
        }

        if(workflowType === "attack" || workflowType === "save" || workflowType === "ability") {
            if (workflow.token.document.disposition === validTokenPrimary.document.disposition) return;

            let result;

            if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser.id !== game.users?.activeGM.id) {
             let userDialogPromise = socket.executeAsUser("showPoetryInMiseryDialog", browserUser.id, originTokenUuidPrimary, actorUuidPrimary, validTokenPrimary.document.uuid, dialogTitlePrimary, originTokenUuidPrimary, workflowType, `poetryinmisery_${browserUser.id}`, 'user').then(res => ({...res, source: "user", type: "multiDialog"}));
             let gmDialogPromise = socket.executeAsGM("showPoetryInMiseryDialog", originTokenUuidPrimary, actorUuidPrimary, validTokenPrimary.document.uuid, dialogTitleGM, originTokenUuidPrimary, workflowType, `poetryinmisery_${game.users?.activeGM.id}`, 'gm').then(res => ({...res, source: "gm", type: "multiDialog"}));
         
             result = await socket.executeAsGM("handleDialogPromises", userDialogPromise, gmDialogPromise);
             } else {
                 result = await socket.executeAsUser("showPoetryInMiseryDialog", browserUser.id, originTokenUuidPrimary, actorUuidPrimary, validTokenPrimary.document.uuid, dialogTitlePrimary, originTokenUuidPrimary, workflowType, null, null).then(res => ({...res, source: browserUser.isGM ? "gm" : "user", type: "singleDialog"}));
             }
                 
             const { poetryInMiseryDecision, damageChosen, source, type } = result;

             if (poetryInMiseryDecision === false || !poetryInMiseryDecision) {
                 if(source && source === "user" && type === "multiDialog") await socket.executeAsGM("closeDialogById", { dialogId: `poetryinmisery_${game.users?.activeGM.id}` });
                 if(source && source === "gm" && type === "multiDialog") await socket.executeAsUser("closeDialogById", browserUser.id, { dialogId: `poetryinmisery_${browserUser.id}` });
                 continue;
            }
            if (poetryInMiseryDecision === true) {

                const resources = ['primary', 'secondary', 'tertiary'];
                let resourceKey = resources.find(key => {
                    let resource = actorUuidPrimary.system.resources[key];
                    return itemData.includes(resource?.label.toLowerCase());
                });

                if (resourceKey) {
                    let updatePath = `system.resources.${resourceKey}.value`;
                    await actorUuidPrimary.update({ [updatePath]: actorUuidPrimary.system.resources[resourceKey].value + 1 });
                }
    
                if (!resourceKey) {
                    let itemExists = actorUuidPrimary.items.find(i => itemData.includes(i.name.toLowerCase()));
                    if(itemExists) await itemExists.update({ 'system.uses.value' : itemExists.system.uses.value + 1 })
                }

                let content = `<span style='text-wrap: wrap;'>You use Poetry In Misery to soliloquize over ${workflow.token.actor.name} and regain a use of Bardic Inspiration. <img src="${workflow.token.actor.img}" width="30" height="30" style="border:0px"></span>`;
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

export async function showPoetryInMiseryDialog(tokenUuids, actorUuid, tokenUuid, dialogTitle, targetNames, outcomeType, dialogId, source) {
    const module = await import('../module.js');
    const socket = module.socket;

    return await new Promise(resolve => {
        const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', 'Poetry In Misery Timeout'));
        
        let dialogContent;
        let originToken = fromUuidSync(tokenUuid);
        let browserUser = MidiQOL.playerForActor(originToken.actor);
        const rollDetailSetting = MidiQOL.safeGetGameSetting('midi-qol', 'ConfigSettings').hideRollDetails;

        if (outcomeType === "damage") {
            dialogContent = `
                <div style='display: flex; flex-direction: column; align-items: start; justify-content: center; padding: 10px;'>
                    <div style='margin-bottom: 20px;'>
                        <p style='margin: 0; font-weight: bold;'>Would you like to use your reaction to use Poetry In Misery for this nat 1 ${outcomeType} roll?</p>
                    </div>
                    <div style='padding-top: 20px; text-align: center; width: 100%;'>
                        <p><b>Time remaining</b></p>
                        <p><span id='countdown' style='font-size: 16px; color: red;'>${initialTimeLeft}</span> seconds</p>
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
                        if(source && source === "user") await socket.executeAsGM("closeDialogById", { dialogId: `poetryinmisery_${game.users?.activeGM.id}` });
                        if(source && source === "gm") await socket.executeAsUser("closeDialogById", browserUser.id, { dialogId: `poetryinmisery_${browserUser.id}` });
                        let actor = await fromUuid(actorUuid);
                        let uuid = actor.uuid;
                        let originToken;
                        originToken = await fromUuid(tokenUuids);
                        originToken = await MidiQOL.tokenForActor(originToken.actor.uuid);

                        const hasEffectApplied = await game.dfreds.effectInterface.hasEffectApplied('Reaction', uuid);

                        if (!hasEffectApplied) {
                            game.dfreds.effectInterface.addEffect({ effectName: 'Reaction', uuid });
                        }
                        
                        let poetryInMiseryDecision = true;

                        resolve({poetryInMiseryDecision, damageChosen, programmaticallyClosed: false});
                    }
                },
                no: {
                    label: "No",
                    callback: async () => {
                        // Reaction Declined
                        dialog.dialogState.interacted = true;
                        dialog.dialogState.decision = "no";
                        resolve({ poetryInMiseryDecision: false, damageChosen: false, programmaticallyClosed: false});
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
                    resolve({ poetryInMiseryDecision: false, damageChosen: false, programmaticallyClosed: true });
                }
                else if (!dialog.dialogState.interacted) {
                    resolve({ poetryInMiseryDecision: false, damageChosen: false, programmaticallyClosed: false });
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