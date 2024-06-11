export async function powerWordRebound({workflowData,workflowType,workflowCombat}) {
    const module = await import('../module.js');
    const helpers = await import('../helpers.js');
    const socket = module.socket;
    const workflowUuid = workflowData;
    const workflow = await MidiQOL.Workflow.getWorkflow(workflowUuid);
    let itemName = "power word rebound";
    let itemProperName = "Power Word Rebound";
    let dialogId = "powerwordrebound";
    if(!workflow) return;
    if(workflow.item.name.toLowerCase() === itemName) return;
    let target = workflow.hitTargets.first();

    if(target.actor.system.attributes.hp.value >= Math.floor(target.actor.system.attributes.hp.max / 2)) return;
    if(workflow.targets.size > 1) return;
    if(!game.combat) return;

    let findValidTokens = helpers.findValidTokens({initiatingToken: workflow.token, targetedToken: target, itemName: itemName, itemType: "spell", itemChecked: null, reactionCheck: true, sightCheck: true, rangeCheck: true, rangeTotal: 60, dispositionCheck: true, dispositionCheckType: "enemy", workflowType: workflowType, workflowCombat: workflowCombat});

    let browserUser;

    for (const validTokenPrimary of findValidTokens) {

        let actorUuidPrimary = validTokenPrimary.actor.uuid;
        const dialogTitlePrimary = `${validTokenPrimary.actor.name} | ${itemProperName}`;
        const dialogTitleGM = `Waiting for ${validTokenPrimary.actor.name}'s selection | ${itemProperName}`;
        let originTokenUuidPrimary = workflow.token.document.uuid;
        browserUser = MidiQOL.playerForActor(validTokenPrimary.actor);
        if (!browserUser.active) {
            browserUser = game.users?.activeGM;
        }

        if(workflowType === "attack") {
            let result;

            if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser.id !== game.users?.activeGM.id) {
                let userDialogPromise = socket.executeAsUser("showPowerWordReboundDialog", browserUser.id, {targetUuids: target.document.uuid, actorUuid: actorUuidPrimary, tokenUuid: validTokenPrimary.document.uuid, initiatingTokenUuid: workflow.token.document.uuid, dialogTitle: dialogTitlePrimary, targetNames: workflow, outcomeType: "attack", damageTypes: null, dialogId: dialogId, rollTotals: null, itemProperName: itemProperName, source: "user", type: "multiDialog"});
                
                let gmDialogPromise = socket.executeAsGM("showPowerWordReboundDialog", {targetUuids: target.document.uuid, actorUuid: actorUuidPrimary, tokenUuid: validTokenPrimary.document.uuid, initiatingTokenUuid: workflow.token.document.uuid, dialogTitle: dialogTitleGM, targetNames: originTokenUuidPrimary, outcomeType: "attack", damageTypes: null, dialogId: dialogId, rollTotals: null, itemProperName: itemProperName, source: "gm", type: "multiDialog"});
            
                result = await socket.executeAsGM("handleDialogPromises", userDialogPromise, gmDialogPromise);
             } else {
                result = await socket.executeAsUser("showPowerWordReboundDialog", browserUser.id, {targetUuids: target.document.uuid, actorUuid: actorUuidPrimary, tokenUuid: validTokenPrimary.document.uuid, initiatingTokenUuid: workflow.token.document.uuid, dialogTitle: dialogTitlePrimary, targetNames: originTokenUuidPrimary, outcomeType: "attack", damageTypes: null, rollTotals: null, itemProperName: itemProperName, source: browserUser.isGM ? "gm" : "user", type: "singleDialog"});
             }
                 
             const { userDecision, source, type } = result;

             if (userDecision === false || !userDecision) {
                if(source && source === "user" && type === "multiDialog") await socket.executeAsGM("closeDialogById", { dialogId: dialogId });
                if(source && source === "gm" && type === "multiDialog") await socket.executeAsUser("closeDialogById", browserUser.id, { dialogId: dialogId });
                continue;
            }
            if (userDecision === true) {
                let rerollNew = await new Roll(`${workflow.attackRoll.result}`).roll({async: true});
                let newItemData = workflow.item;

                newItemData.prepareData();
                newItemData.prepareFinalAttributes();

                const options = {
                    showFullCard: false,
                    createWorkflow: true,
                    versatile: false,
                    configureDialog: true,
                    targetUuids: [workflow.token.document.uuid],
                    workflowOptions: {autoRollDamage: 'always', autoFastDamage: true, autoRollAttack: true, autoFastAttack: true}
                };

                workflow.aborted = true;

                Hooks.once("midi-qol.preAttackRollComplete", async (workflow) => {
                    await workflow.setAttackRoll(rerollNew);
                });
                
                // Complete the new item use workflow
                await MidiQOL.completeItemUse(newItemData, {}, options);
            }
        }
    }
}

export async function showPowerWordReboundDialog({targetUuids, actorUuid, tokenUuid, initiatingTokenUuid, dialogTitle, targetNames, outcomeType, damageTypes, dialogId, source, type, itemProperName, rollTotals}) {
    const module = await import('../module.js');
    const socket = module.socket;

    return await new Promise(resolve => {
        const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `${itemProperName} Timeout`));
        
        let dialogContent;
        let originToken = fromUuidSync(tokenUuid);
        let target = fromUuidSync(targetUuids);
        let browserUser = MidiQOL.playerForActor(originToken.actor);

        dialogContent = `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 5px; background-color: transparent; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="flex-grow: 1; margin-right: 20px;">
                <p>${target.actor.name} has been hit by an attack and is under half health, would you like to use ${itemProperName} to deflect it?</p>
            </div>
            <div style="display: flex; flex-direction: column; justify-content: center; padding-left: 20px; border-left: 1px solid #ccc; text-align: center;">
                <p><b>Time Remaining</b></p>
                <p><span id="countdown" style="font-size: 16px; color: red;">${initialTimeLeft}</span> seconds</p>
                <button id='pauseButton' style='margin-top: 5px; width: 100px;'>Pause</button>
            </div>
        </div>
        `;

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
                        if(source && source === "user" && type === "multiDialog") await socket.executeAsGM("closeDialogById", { dialogId: dialogId });
                        if(source && source === "gm" && type === "multiDialog") await socket.executeAsUser("closeDialogById", browserUser.id, { dialogId: dialogId });

                        let chosenSpell = await originToken.actor.items.find(i => i.name === itemProperName);
                        chosenSpell.prepareData();
                        chosenSpell.prepareFinalAttributes();

                        const options = {
                            showFullCard: false,
                            createWorkflow: true,
                            versatile: false,
                            configureDialog: true,
                            targetUuids: [initiatingTokenUuid]
                        };

                        const itemRoll = await MidiQOL.completeItemUse(chosenSpell, {}, options);
                        if(itemRoll.aborted === true) return resolve({ userDecision: false, programmaticallyClosed: false, source, type });
                        if(itemRoll) {
                            const uuid = originToken.actor.uuid;
                            const hasEffectApplied = await game.dfreds.effectInterface.hasEffectApplied('Reaction', uuid);

                            if (!hasEffectApplied) {
                                await game.dfreds.effectInterface.addEffect({ effectName: 'Reaction', uuid });
                            }
                        }
                        
                        let userDecision = true;

                        resolve({userDecision, programmaticallyClosed: false, source, type});
                    }
                },
                no: {
                    label: "No",
                    callback: async () => {
                        // Reaction Declined
                        dialog.dialogState.interacted = true;
                        dialog.dialogState.decision = "no";
                        resolve({ userDecision: false, programmaticallyClosed: false, source, type});
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
                    resolve({ userDecision: false, programmaticallyClosed: true, source, type });
                }
                else if (!dialog.dialogState.interacted) {
                    resolve({ userDecision: false, programmaticallyClosed: false, source, type });
                }
            }
        });
        dialog.dialogState = { interacted: false, decision: null, programmaticallyClosed: false };
        dialog.render(true);
    });
}