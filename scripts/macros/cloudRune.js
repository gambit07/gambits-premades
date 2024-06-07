export async function cloudRune({workflowData,workflowType,workflowCombat}) {
    const module = await import('../module.js');
    const helpers = await import('../helpers.js');
    const socket = module.socket;
    const workflowUuid = workflowData;
    const workflow = await MidiQOL.Workflow.getWorkflow(workflowUuid);
    let itemName = "cloud rune";
    let itemProperName = "Cloud Rune";
    let dialogId = "cloudrune";
    if(!workflow) return;
    if(workflow.item.name.toLowerCase() === itemName) return;
    let target = workflow.hitTargets.first();

    if(workflow.targets.size > 1) return;
    if(!game.combat) return;

    let findValidTokens = helpers.findValidTokens({initiatingToken: workflow.token, targetedToken: target, itemName: itemName, itemType: "feature", itemChecked: [itemName], reactionCheck: true, sightCheck: true, rangeCheck: true, rangeTotal: 30, dispositionCheck: true, dispositionCheckType: "enemy", workflowType: workflowType, workflowCombat: workflowCombat});

    let browserUser;

    for (const validTokenPrimary of findValidTokens) {
        const nearbyTokens = MidiQOL.findNearby(null, validTokenPrimary, 30, { includeToken: false });
        let validTokens = nearbyTokens.filter(token => token.document.disposition !== validTokenPrimary.document.disposition && MidiQOL.canSee(validTokenPrimary.document.uuid,token.document.uuid) && token.document.uuid !== workflow.token.document.uuid);
        if(validTokens.length === 0) return;

        if(validTokenPrimary.id === target.id) return;

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
                let userDialogPromise = socket.executeAsUser("showCloudRuneDialog", browserUser.id, {targetUuids: target.document.uuid, actorUuid: actorUuidPrimary, tokenUuid: validTokenPrimary.document.uuid, initiatingTokenUuid: workflow.token.document.uuid, dialogTitle: dialogTitlePrimary, targetNames: workflow, outcomeType: "attack", damageTypes: null, dialogId: dialogId, rollTotals: null, itemProperName: itemProperName, source: "user", type: "multiDialog"});
                
                let gmDialogPromise = socket.executeAsGM("showCloudRuneDialog", {targetUuids: target.document.uuid, actorUuid: actorUuidPrimary, tokenUuid: validTokenPrimary.document.uuid, initiatingTokenUuid: workflow.token.document.uuid, dialogTitle: dialogTitleGM, targetNames: originTokenUuidPrimary, outcomeType: "attack", damageTypes: null, dialogId: dialogId, rollTotals: null, itemProperName: itemProperName, source: "gm", type: "multiDialog"});
            
                result = await socket.executeAsGM("handleDialogPromises", userDialogPromise, gmDialogPromise);
             } else {
                result = await socket.executeAsUser("showCloudRuneDialog", browserUser.id, {targetUuids: target.document.uuid, actorUuid: actorUuidPrimary, tokenUuid: validTokenPrimary.document.uuid, initiatingTokenUuid: workflow.token.document.uuid, dialogTitle: dialogTitlePrimary, targetNames: originTokenUuidPrimary, outcomeType: "attack", damageTypes: null, rollTotals: null, itemProperName: itemProperName, source: browserUser.isGM ? "gm" : "user", type: "singleDialog"});
             }
                 
             const { userDecision, returnedTokenUuid, source, type } = result;

             if (userDecision === false || !userDecision) {
                if(source && source === "user" && type === "multiDialog") await socket.executeAsGM("closeDialogById", { dialogId: dialogId });
                if(source && source === "gm" && type === "multiDialog") await socket.executeAsUser("closeDialogById", browserUser.id, { dialogId: dialogId });
                continue;
            }
            if (userDecision === true) {
                let rerollNew = await new Roll(`${workflow.attackRoll.result}`).roll({async: true});
                let newItemData = workflow.item;

                newItemData = newItemData.clone({
                    system: {
                        "range": {
                            "value": null,
                            "long": null,
                            "units": ""
                        }
                    }
                }, { keepId: true });

                newItemData.prepareData();
                newItemData.prepareFinalAttributes();

                const options = {
                    showFullCard: false,
                    createWorkflow: true,
                    versatile: false,
                    configureDialog: true,
                    targetUuids: [returnedTokenUuid],
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

export async function showCloudRuneDialog({targetUuids, actorUuid, tokenUuid, initiatingTokenUuid, dialogTitle, targetNames, outcomeType, damageTypes, dialogId, source, type, itemProperName, rollTotals}) {
    const module = await import('../module.js');
    const socket = module.socket;

    return await new Promise(resolve => {
        const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `${itemProperName} Timeout`));
        
        let dialogContent;
        let originToken = fromUuidSync(tokenUuid);
        let target = fromUuidSync(targetUuids);
        let browserUser = MidiQOL.playerForActor(originToken.actor);

        const nearbyTokens = MidiQOL.findNearby(null, originToken.object, 30, { includeToken: false });
        let validTokens = nearbyTokens.filter(token => token.document.disposition !== originToken.disposition && MidiQOL.canSee(tokenUuid,token.document.uuid) && token.document.uuid !== initiatingTokenUuid);

        dialogContent = `
        <div style='display: flex; flex-direction: column; align-items: start; justify-content: center; padding: 10px;'>
            <div style='margin-bottom: 20px;'>
                <p>${target.actor.name} has been hit by an attack, would you like to use your ${itemProperName} to deflect it towards another creature?</p>
            </div>
            <div style='display: flex; width: 100%; gap: 20px;'>
                <div style='flex-grow: 1; display: flex; flex-direction: column;'>
                    <p style='margin: 0 0 10px 0;'>Choose who the attack is deflected to:</p>
                    ${validTokens.length >= 1 ? 
                        `<select id="targetSelection" style="padding: 4px; width: 100%; box-sizing: border-box; border-radius: 4px; border: 1px solid #ccc;">
                            ${validTokens.map(valid => `<option value="${valid.actor.uuid}">${valid.actor.name}</option>`).join('')}
                        </select>` : '<p>No valid targets in range.</p>'
                    }
                </div>
                <div style='padding-left: 20px; text-align: center; border-left: 1px solid #ccc;'>
                    <p><b>Time remaining</b></p>
                    <p><span id='countdown' style='font-size: 16px; color: red;'>${initialTimeLeft}</span> seconds</p>
                    <p><button id='pauseButton' style='margin-top: 16px;'>Pause</button></p>
                </div>
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

                        let returnedTokenUuid = await MidiQOL.tokenForActor(html.find("#targetSelection").val()).document.uuid;

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
                        if(itemRoll.aborted === true) return resolve({ userDecision: false, returnedTokenUuid: false, programmaticallyClosed: false, source, type });
                        if(itemRoll) {
                            const uuid = originToken.actor.uuid;
                            const hasEffectApplied = await game.dfreds.effectInterface.hasEffectApplied('Reaction', uuid);

                            if (!hasEffectApplied) {
                                await game.dfreds.effectInterface.addEffect({ effectName: 'Reaction', uuid });
                            }
                        }
                        
                        let userDecision = true;

                        resolve({userDecision, returnedTokenUuid, programmaticallyClosed: false, source, type});
                    }
                },
                no: {
                    label: "No",
                    callback: async () => {
                        // Reaction Declined
                        dialog.dialogState.interacted = true;
                        dialog.dialogState.decision = "no";
                        resolve({ userDecision: false, returnedTokenUuid: false, programmaticallyClosed: false, source, type});
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
                    resolve({ userDecision: false, returnedTokenUuid: false, programmaticallyClosed: true, source, type });
                }
                else if (!dialog.dialogState.interacted) {
                    resolve({ userDecision: false, returnedTokenUuid: false, programmaticallyClosed: false, source, type });
                }
            }
        });
        dialog.dialogState = { interacted: false, decision: null, programmaticallyClosed: false };
        dialog.render(true);
    });
}