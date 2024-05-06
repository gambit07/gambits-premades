export async function poetryInMisery({workflowData,workflowType,workflowCombat}) {
    const module = await import('../module.js');
    const helpers = await import('../helpers.js');
    const socket = module.socket;
    const workflowUuid = workflowData;
    const workflow = await MidiQOL.Workflow.getWorkflow(workflowUuid);
    console.log(workflowCombat)
    let itemName = "poetry in misery";
    if(!workflow && !workflowData.actor) return;
    if(workflow?.item.name.toLowerCase() === itemName) return;
    let initiatingToken;
    (workflow) ? initiatingToken = workflow.token : initiatingToken = await MidiQOL.tokenForActor(workflowData.actor.uuid);

    if (!game.combat && (workflowType === "attack")) return;

    // Check if Opportunity Attack is initiating the workflow
    if(workflow?.item.name === "Opportunity Attack") return;

    let findPoetryInMiseryTokens = helpers.findValidTokens({token: initiatingToken, target: initiatingToken, itemName: itemName, itemType: null, itemChecked: null, reactionCheck: true, sightCheck: false, rangeCheck: true, rangeTotal: 30, dispositionCheck: false, dispositionCheckType: "ally", workflowType: workflowType, workflowCombat: workflowCombat});

    let browserUser;

    for (const validTokenPrimary of findPoetryInMiseryTokens) {
        const itemData = validTokenPrimary.actor.items.find(i => i.name.toLowerCase() === "bardic inspiration");
        const resources = ['primary', 'secondary', 'tertiary'];
        let resourceKey = resources.find(key => {
            let resource = validTokenPrimary.actor.system.resources[key];
            return resource?.label?.toLowerCase() === "bardic inspiration";
        });

        if(resourceKey) {
            if(validTokenPrimary.actor.system.resources[resourceKey].value === validTokenPrimary.actor.system.resources[resourceKey].max) return;
        }
        else if(itemData) {
            if(itemData.system.uses.value === itemData.system.uses.max) return;
        }
        else return;

        let actorUuidPrimary = validTokenPrimary.actor.uuid;
        const dialogTitlePrimary = `${validTokenPrimary.actor.name} | Poetry In Misery`;
        const dialogTitleGM = `Waiting for ${validTokenPrimary.actor.name}'s selection | Poetry In Misery`;
        let originTokenUuidPrimary = initiatingToken.document.uuid;
        browserUser = MidiQOL.playerForActor(validTokenPrimary.actor);
        let chatActor;
        if (!browserUser.active) {
            browserUser = game.users?.activeGM;
        }

        if (workflowType === "attack") {
            if(initiatingToken.document.disposition !== validTokenPrimary.document.disposition) return;
            if(!workflow.attackRoll.isFumble) return;
        }
        if (workflowType === "save") {
            if(workflow) {
                if(initiatingToken.document.disposition === validTokenPrimary.document.disposition) return;
                const fumbleRoll = workflow.saveRolls.find(roll => roll.isFumble && roll.data.token.document.disposition === validTokenPrimary.document.disposition);
                if(!fumbleRoll) return;
                chatActor = fumbleRoll.data.token.actor;
            }
            else {
                if(initiatingToken.document.disposition !== validTokenPrimary.document.disposition) return;
                if(!workflowData.roll.isFumble) return;
                chatActor = initiatingToken.actor;
            }
        }
        if(workflowType === "ability") {
            if(initiatingToken.document.disposition !== validTokenPrimary.document.disposition) return;
            if(!workflowData.roll.isFumble) return;
        }

        let result;

        if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser.id !== game.users?.activeGM.id) {
            let userDialogPromise = socket.executeAsUser("showPoetryInMiseryDialog", browserUser.id, originTokenUuidPrimary, actorUuidPrimary, validTokenPrimary.document.uuid, dialogTitlePrimary, originTokenUuidPrimary, workflowType, `poetryinmisery_${browserUser.id}`, 'user').then(res => ({...res, source: "user", type: "multiDialog"}));
            let gmDialogPromise = socket.executeAsGM("showPoetryInMiseryDialog", originTokenUuidPrimary, actorUuidPrimary, validTokenPrimary.document.uuid, dialogTitleGM, originTokenUuidPrimary, workflowType, `poetryinmisery_${game.users?.activeGM.id}`, 'gm').then(res => ({...res, source: "gm", type: "multiDialog"}));
        
            result = await socket.executeAsGM("handleDialogPromises", userDialogPromise, gmDialogPromise);
            } else {
                result = await socket.executeAsUser("showPoetryInMiseryDialog", browserUser.id, originTokenUuidPrimary, actorUuidPrimary, validTokenPrimary.document.uuid, dialogTitlePrimary, originTokenUuidPrimary, workflowType, null, null).then(res => ({...res, source: browserUser.isGM ? "gm" : "user", type: "singleDialog"}));
            }
                
            const { poetryInMiseryDecision, source, type } = result;

            if (poetryInMiseryDecision === false || !poetryInMiseryDecision) {
                if(source && source === "user" && type === "multiDialog") await socket.executeAsGM("closeDialogById", { dialogId: `poetryinmisery_${game.users?.activeGM.id}` });
                if(source && source === "gm" && type === "multiDialog") await socket.executeAsUser("closeDialogById", browserUser.id, { dialogId: `poetryinmisery_${browserUser.id}` });
                continue;
        }
        if (poetryInMiseryDecision === true) {

            if (resourceKey) {
                let updatePath = `system.resources.${resourceKey}.value`;
                await validTokenPrimary.actor.update({ [updatePath]: validTokenPrimary.actor.system.resources[resourceKey].value + 1 });
            }

            else if(itemData) {
                await itemData.update({ 'system.uses.value' : itemData.system.uses.value + 1 })
            }

            let content;
            if (workflowType === "attack") content = `<span style='text-wrap: wrap;'>You use Poetry In Misery to soliloquize over ${initiatingToken.actor.name}'s nat 1 attack roll and regain a use of Bardic Inspiration.<br/><img src="${initiatingToken.actor.img}" width="30" height="30" style="border:0px"></span>`;
            else if (workflowType === "ability") content = `<span style='text-wrap: wrap;'>You use Poetry In Misery to soliloquize over ${initiatingToken.actor.name}'s nat 1 ability check and regain a use of Bardic Inspiration.<br/><img src="${initiatingToken.actor.img}" width="30" height="30" style="border:0px"></span>`;
            else if (workflowType === "save") content = `<span style='text-wrap: wrap;'>You use Poetry In Misery to soliloquize over ${chatActor.name}'s nat 1 saving throw and regain a use of Bardic Inspiration.<br/><img src="${chatActor.img}" width="30" height="30" style="border:0px"></span>`;
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

export async function showPoetryInMiseryDialog(tokenUuids, actorUuid, tokenUuid, dialogTitle, targetNames, outcomeType, dialogId, source) {
    const module = await import('../module.js');
    const socket = module.socket;

    return await new Promise(resolve => {
        const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', 'Poetry In Misery Timeout'));
        
        let dialogContent;
        let originToken = fromUuidSync(tokenUuid);
        let browserUser = MidiQOL.playerForActor(originToken.actor);

        dialogContent = `
        <div style='display: flex; align-items: center; justify-content: space-between;'>
            <div style='flex: 1;'>
            Would you like to use your reaction to use Poetry In Misery for this nat 1 ${outcomeType} roll?<br/><br/>
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
                    callback: async (html) => {
                        dialog.dialogState.interacted = true;
                        dialog.dialogState.decision = "yes";
                        if(source && source === "user") await socket.executeAsGM("closeDialogById", { dialogId: `poetryinmisery_${game.users?.activeGM.id}` });
                        if(source && source === "gm") await socket.executeAsUser("closeDialogById", browserUser.id, { dialogId: `poetryinmisery_${browserUser.id}` });
                        let actor = await fromUuid(actorUuid);
                        let uuid = actor.uuid;

                        const hasEffectApplied = await game.dfreds.effectInterface.hasEffectApplied('Reaction', uuid);

                        if (!hasEffectApplied) {
                            game.dfreds.effectInterface.addEffect({ effectName: 'Reaction', uuid });
                        }
                        
                        let poetryInMiseryDecision = true;

                        resolve({poetryInMiseryDecision, programmaticallyClosed: false});
                    }
                },
                no: {
                    label: "No",
                    callback: async () => {
                        // Reaction Declined
                        dialog.dialogState.interacted = true;
                        dialog.dialogState.decision = "no";
                        resolve({ poetryInMiseryDecision: false, programmaticallyClosed: false});
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
                    resolve({ poetryInMiseryDecision: false, programmaticallyClosed: true });
                }
                else if (!dialog.dialogState.interacted) {
                    resolve({ poetryInMiseryDecision: false, programmaticallyClosed: false });
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