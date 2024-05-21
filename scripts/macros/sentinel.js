export async function sentinel({workflowData,workflowType,workflowCombat}) {
    const module = await import('../module.js');
    const helpers = await import('../helpers.js');
    const socket = module.socket;
    const workflowUuid = workflowData;
    const workflow = await MidiQOL.Workflow.getWorkflow(workflowUuid);
    let itemName = "sentinel";
    let itemProperName = "Sentinel";
    let dialogId = "sentinel";
    let gameVersion = parseInt(game.system.version.split('.')[0], 10);
    if(!workflow) return;
    if(workflow.item.name.toLowerCase() === itemName) return;
    let target = workflow.hitTargets.first();

    if (!game.combat) return;

    // Check if Opportunity Attack is initiating the workflow
    if(workflow.item.name === "Opportunity Attack") return;

    let findValidTokens = helpers.findValidTokens({initiatingToken: workflow.token, targetedToken: target, itemName: itemName, itemType: null, itemChecked: null, reactionCheck: true, sightCheck: false, rangeCheck: true, rangeTotal: 5, dispositionCheck: true, dispositionCheckType: "enemy", workflowType: workflowType, workflowCombat: workflowCombat});

    let browserUser;

    for (const validTokenPrimary of findValidTokens) {
        if (target.document.uuid === validTokenPrimary.document.uuid) return;
        const effectNamesOrigin = ["Confusion", "Arms of Hadar", "Shocking Grasp", "Slow", "Staggering Smite"];
        let hasEffectOrigin = (gameVersion >= 3 ? validTokenPrimary.actor.appliedEffects : validTokenPrimary.actor.effects)
            .some(effect => effectNamesOrigin.includes(effect.name));
        if(hasEffectOrigin) return;

        let isIncapacitated = await MidiQOL.checkIncapacitated(validTokenPrimary);
        if(isIncapacitated) return;

        if(validTokenPrimary.id === target.id) return;

        if(target.actor.items.find(i => i.name === itemProperName)) return;

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
                let userDialogPromise = socket.executeAsUser("showSentinelDialog", browserUser.id, {targetUuids: workflow.token.document.uuid, actorUuid: actorUuidPrimary, tokenUuid: validTokenPrimary.document.uuid, dialogTitle: dialogTitlePrimary, targetNames: workflow, outcomeType: "attack", damageTypes: null, dialogId: `${dialogId}_${browserUser.id}`, rollTotals: null, itemProperName: itemProperName}).then(res => ({...res, source: "user", type: "multiDialog"}));
                
                let gmDialogPromise = socket.executeAsGM("showSentinelDialog", {targetUuids: workflow.token.document.uuid, actorUuid: actorUuidPrimary, tokenUuid: validTokenPrimary.document.uuid, dialogTitle: dialogTitleGM, targetNames: originTokenUuidPrimary, outcomeType: "attack", damageTypes: null, dialogId: `${dialogId}_${game.users?.activeGM.id}`, rollTotals: null, itemProperName: itemProperName}).then(res => ({...res, source: "gm", type: "multiDialog"}));
            
                result = await socket.executeAsGM("handleDialogPromises", userDialogPromise, gmDialogPromise);
             } else {
                 result = await socket.executeAsUser("showSentinelDialog", browserUser.id, {targetUuids: workflow.token.document.uuid, actorUuid: actorUuidPrimary, tokenUuid: validTokenPrimary.document.uuid, dialogTitle: dialogTitlePrimary, targetNames: originTokenUuidPrimary, outcomeType: "attack", damageTypes: null, rollTotals: null, itemProperName: itemProperName}).then(res => ({...res, source: browserUser.isGM ? "gm" : "user", type: "singleDialog"}));
             }
                 
             const { userDecision, source, type } = result;

             if (userDecision === false || userDecision === true || !userDecision) {
                 if(source && source === "user" && type === "multiDialog") await socket.executeAsGM("closeDialogById", { dialogId: `${dialogId}_${game.users?.activeGM.id}` });
                 if(source && source === "gm" && type === "multiDialog") await socket.executeAsUser("closeDialogById", browserUser.id, { dialogId: `${dialogId}_${browserUser.id}` });
                 continue;
            }
        }
    }
}

export async function showSentinelDialog({targetUuids, actorUuid, tokenUuid, dialogTitle, targetNames, outcomeType, damageTypes, dialogId, source, type, itemProperName, rollTotals}) {
    const module = await import('../module.js');
    const socket = module.socket;

    return await new Promise(resolve => {
        const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `${itemProperName} Timeout`));
        
        let dialogContent;
        let originToken = fromUuidSync(tokenUuid);
        let browserUser = MidiQOL.playerForActor(originToken.actor);

        // Check valid weapons
        let validWeapons = originToken.actor.items.filter(item => {
            return (item.system.actionType === "mwak" && item.system.equipped === true);
        });
        if (!validWeapons.length) return;
        // Find 'Unarmed Strike' from the validWeapons array and add to end of list
        const unarmedIndex = validWeapons.findIndex(item => item.name.toLowerCase() === "unarmed strike");
        let unarmedStrike;
        if (unarmedIndex > -1) {
            unarmedStrike = validWeapons.splice(unarmedIndex, 1)[0];
        }

        // Sort the weapons alphabetically
        validWeapons.sort((a, b) => a.name.localeCompare(b.name));

        let favoriteWeaponUuid = null;
        // Check for favorite weapon and put it on top
        const favoriteWeapon = originToken.actor.items.find(item => item.flags?.['midi-qol']?.oaFavoriteAttack);
        if (favoriteWeapon) {
            favoriteWeaponUuid = favoriteWeapon.uuid;
            if(favoriteWeapon.system.actionType === "mwak") validWeapons.unshift(favoriteWeapon);
        }

        if (unarmedStrike) {
            validWeapons.push(unarmedStrike);
        }

        let optionData = validWeapons.map(item => `<option value="${item.uuid}">${item.name}</option>`).join("");

        dialogContent = `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 5px; background-color: transparent; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="flex-grow: 1; margin-right: 20px;">
                <p>Would you like to use your reaction to attack?</p>
                <div>
                    <label for="item-select" style="display: block; margin-bottom: 8px;">Choose your Attack:</label>
                    <select id="item-select" style="width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 16px; box-sizing: border-box; background-color: transparent; font-size: 16px; height: auto;">
                        ${optionData}
                    </select>
                </div>
                <div style="display: flex; align-items: center;">
                    <input type="checkbox" id="favorite-checkbox" style="margin-right: 5px; vertical-align: middle;"/>
                    <label for="favorite-checkbox">Favorite this Attack?</label>
                </div>
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
                        if(source && source === "user") await socket.executeAsGM("closeDialogById", { dialogId: `${dialogId}_${game.users?.activeGM.id}` });
                        if(source && source === "gm") await socket.executeAsUser("closeDialogById", browserUser.id, { dialogId: `${dialogId}_${browserUser.id}` });

                        let selectedItemUuid = html.find("#item-select").val();
                        if (!selectedItemUuid) {
                            console.log("No weapon selected");
                            return;
                        }

                        let chosenWeapon = await fromUuid(selectedItemUuid);
                        let favoriteWeaponCheck = favoriteWeaponUuid;
                        let favoriteWeapon;
                        if(favoriteWeaponCheck !== "null") favoriteWeapon = await fromUuid(favoriteWeaponCheck);
                        let favoriteSet = html.find("#favorite-checkbox").is(':checked');
                        if(favoriteSet && favoriteWeaponCheck) {
                        await chosenWeapon.setFlag("midi-qol", "oaFavoriteAttack", true);
                        if (favoriteWeapon.uuid !== chosenWeapon.uuid) {
                        await favoriteWeapon.unsetFlag("midi-qol", "oaFavoriteAttack");
                        }
                        }
                        else if(favoriteSet) {
                        await chosenWeapon.setFlag("midi-qol", "oaFavoriteAttack", true);
                        }

                        chosenWeapon = chosenWeapon.clone({
                            system: {
                                "range": {
                                    "value": null,
                                    "long": null,
                                    "units": ""
                                }
                            }
                        }, { keepId: true });
                        chosenWeapon.prepareData();
                        chosenWeapon.prepareFinalAttributes();

                        const options = {
                            showFullCard: false,
                            createWorkflow: true,
                            versatile: false,
                            configureDialog: false,
                            targetUuids: [`${targetUuids}`],
                            workflowOptions: {
                                autoRollDamage: 'onHit',
                                autoFastDamage: true
                            }
                        };
                        const itemRoll = await MidiQOL.completeItemUse(chosenWeapon, {}, options);
                        if(itemRoll.aborted === true) return resolve({ userDecision: false, programmaticallyClosed: false });
                        if(itemRoll) {
                            const uuid = actor.uuid;
                            const hasEffectApplied = await game.dfreds.effectInterface.hasEffectApplied('Reaction', uuid);

                            if (!hasEffectApplied) {
                            await game.dfreds.effectInterface.addEffect({ effectName: 'Reaction', uuid });
                            }
                        }
                        
                        let userDecision = true;

                        resolve({userDecision, programmaticallyClosed: false});
                    }
                },
                no: {
                    label: "No",
                    callback: async () => {
                        // Reaction Declined
                        dialog.dialogState.interacted = true;
                        dialog.dialogState.decision = "no";
                        resolve({ userDecision: false, programmaticallyClosed: false});
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
                    resolve({ userDecision: false, programmaticallyClosed: true });
                }
                else if (!dialog.dialogState.interacted) {
                    resolve({ userDecision: false, programmaticallyClosed: false });
                }
            }
        });
        dialog.dialogState = { interacted: false, decision: null, programmaticallyClosed: false };
        dialog.render(true);
    });
}