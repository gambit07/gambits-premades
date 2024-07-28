export async function interception({workflowData,workflowType,workflowCombat}) {
    const module = await import('../module.js');
    const helpers = await import('../helpers.js');
    const socket = module.socket;
    const workflowUuid = workflowData;
    const workflow = await MidiQOL.Workflow.getWorkflow(workflowUuid);
    let itemName = "fighting style: interception";
    let itemProperName = "Interception";
    let dialogId = "interception";
    let target = workflow.hitTargets.first();
    if(!workflow) return;
    if(workflow.item.name.toLowerCase() === itemName) return;
    const actionTypes = ["mwak", "rwak", "msak", "rsak"];
    if (!actionTypes.some(type => workflow.item.system.actionType?.includes(type))) {
        return;
    }

    if (!game.combat) return;

    // Check if Opportunity Attack is initiating the workflow
    if(workflow.item.name === "Opportunity Attack") return;

    let findValidTokens = helpers.findValidTokens({initiatingToken: workflow.token, targetedToken: target, itemName: itemName, itemType: "item", itemChecked: ["mwak", "shield"], reactionCheck: true, sightCheck: true, rangeCheck: true, rangeTotal: 5, dispositionCheck: true, dispositionCheckType: "enemyAlly", workflowType: workflowType, workflowCombat: workflowCombat});

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

        if(workflowType === "damage") {
            if (target.document.uuid === validTokenPrimary.document.uuid) return;
            let damageTypes = workflow.damageRolls.map(roll => roll.options.type);
            let hasHealing = damageTypes.some(type => type === "healing");
            if (hasHealing) return;

            let damageTotals = workflow.damageRolls.map(roll => roll.total);

            let result;

            if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser.id !== game.users?.activeGM.id) {
                let userDialogPromise = socket.executeAsUser("showInterceptionDialog", browserUser.id, {targetUuids: originTokenUuidPrimary, actorUuid: actorUuidPrimary, tokenUuid: validTokenPrimary.document.uuid, dialogTitle: dialogTitlePrimary, targetNames: originTokenUuidPrimary, outcomeType: "damage", damageTypes: damageTypes, dialogId: dialogId, rollTotals: damageTotals, itemProperName: itemProperName, source: "user", type: "multiDialog"});
                
                let gmDialogPromise = socket.executeAsGM("showInterceptionDialog", {targetUuids: originTokenUuidPrimary, actorUuid: actorUuidPrimary, tokenUuid: validTokenPrimary.document.uuid, dialogTitle: dialogTitleGM, targetNames: originTokenUuidPrimary, outcomeType: "damage", damageTypes: damageTypes, dialogId: dialogId, rollTotals: damageTotals, itemProperName: itemProperName, source: "gm", type: "multiDialog"});
            
                result = await socket.executeAsGM("handleDialogPromises", userDialogPromise, gmDialogPromise);
             } else {
                 result = await socket.executeAsUser("showInterceptionDialog", browserUser.id, {targetUuids: originTokenUuidPrimary, actorUuid: actorUuidPrimary, tokenUuid: validTokenPrimary.document.uuid, dialogTitle: dialogTitlePrimary, targetNames: originTokenUuidPrimary, outcomeType: "damage", damageTypes: damageTypes, rollTotals: damageTotals, itemProperName: itemProperName, source: browserUser.isGM ? "gm" : "user", type: "singleDialog"});
             }
                 
             const { userDecision, damageChosen, source, type } = result;

             if (userDecision === false || !userDecision) {
                 if(source && source === "user" && type === "multiDialog") await socket.executeAsGM("closeDialogById", { dialogId: dialogId });
                 if(source && source === "gm" && type === "multiDialog") await socket.executeAsUser("closeDialogById", browserUser.id, { dialogId: dialogId });
                 continue;
            }
            if (userDecision === true) {
                let primaryFile = "jb2a.spiritual_weapon.sword.spectral.orange";
                let alternateFile = "jb2a.icon.shield.yellow";

                let fileToPlay = Sequencer.Database.getEntry(primaryFile) ? primaryFile : Sequencer.Database.getEntry(alternateFile) ? alternateFile : "";

                new Sequence()
                    .effect()
                    .file(fileToPlay)
                    .atLocation(validTokenPrimary)
                    .moveTowards(target)
                    .scaleToObject(2.0)
                    .zIndex(0)
                    .belowTokens(false)
                    .fadeIn(250)
                    .fadeOut(250)
                    .play();

                const saveSetting = workflow.options.noOnUseMacro;
                workflow.options.noOnUseMacro = true;
                let actorProf = validTokenPrimary.actor.system.attributes.prof;
                let reroll;
                let numDice = '1d10';
                if(MidiQOL.safeGetGameSetting('gambits-premades', 'enableInterceptionCustomDice')) {
                    let dieNumber = MidiQOL.safeGetGameSetting('gambits-premades', 'enableInterceptionCustomDiceNumber');
                    let dieFace = MidiQOL.safeGetGameSetting('gambits-premades', 'enableInterceptionCustomDiceFace');
                    numDice = `${dieNumber}d${dieFace}`;
                }

                if(source && source === "user") reroll = await socket.executeAsUser("rollAsUser", browserUser.id, { rollParams: `${numDice} + ${actorProf}`, type: workflowType });
                if(source && source === "gm") reroll = await socket.executeAsGM("rollAsUser", { rollParams: `${numDice} + ${actorProf}`, type: workflowType });

                let remainingReduction = reroll.total;
                let updatedRolls = [];
                let processedRolls = new Set();
                
                for (const priority of damageChosen) {
                    let rollFound = workflow.damageRolls.find(roll => roll.options.type === priority);
                
                    if (rollFound) {
                     processedRolls.add(rollFound);
                        let rollTotal = rollFound.total;
                        if (rollTotal >= remainingReduction) {
                            let modifiedRoll = await new Roll(`${rollTotal} - ${remainingReduction}`).evaluate({async: true});
                            modifiedRoll.options.type = priority;
                            updatedRolls.push(modifiedRoll);
                            remainingReduction = 0;
                            break;
                        } else {
                            remainingReduction -= rollTotal;
                            let zeroRoll = await new Roll(`${rollTotal} - ${rollTotal}`).evaluate({async: true});
                            zeroRoll.options.type = priority;
                            updatedRolls.push(zeroRoll);
                        }
                    }
                }
                
                workflow.damageRolls.forEach(roll => {
                    if (!processedRolls.has(roll)) {
                        updatedRolls.push(roll);
                    }
                });

                await workflow.setDamageRolls(updatedRolls);
        
                workflow.options.noOnUseMacro = saveSetting;

                 let content = `<span style='text-wrap: wrap;'>You use ${itemProperName} and reduce damage taken for ${target.actor.name} by ${reroll.total}. <img src="${workflow.token.actor.img}" width="30" height="30" style="border:0px"></span>`;
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

export async function showInterceptionDialog({targetUuids, actorUuid, tokenUuid, dialogTitle, targetNames, outcomeType, damageTypes, dialogId, source, type, itemProperName, rollTotals}) {
    const module = await import('../module.js');
    const socket = module.socket;

    return await new Promise(resolve => {
        const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `${itemProperName} Timeout`));
        
        let dialogContent;
        let originToken = fromUuidSync(tokenUuid);
        let browserUser = MidiQOL.playerForActor(originToken.actor);
        const rollDetailSetting = MidiQOL.safeGetGameSetting('midi-qol', 'ConfigSettings').hideRollDetails;

        if (outcomeType === "damage") {
            dialogContent = `
                <div style='display: flex; flex-direction: column; align-items: start; justify-content: center; padding: 10px;'>
                    <div style='margin-bottom: 20px;'>
                        <p style='margin: 0; font-weight: bold;'>Would you like to use your reaction to use ${itemProperName} for this ${outcomeType} roll?</p>
                    </div>
                    <div style='display: flex; width: 100%; gap: 20px;'>
                        <div style='flex-grow: 1; display: flex; flex-direction: column;'>
                            <p style='margin: 0 0 10px 0;'>Order damage types to prioritize which reduction should be applied first:</p>
                            <ul id="damageList" class="sortable" style="padding: 0; margin: 0; list-style-type: none;">
                                ${damageTypes.map((name, index) => `
                                <li draggable="true" style="padding: 6px; margin-bottom: 4px; cursor: grab; border: 1px solid #ccc;">
                                    <span class="damage-type">${name}</span>${["none", "detailsDSN", "details", "d20Only", "hitDamage", "hitCriticalDamage"].includes(rollDetailSetting) ? ` - ${rollTotals[index]} pts` : ""}
                                </li>`).join('')}
                            </ul>
                        </div>
                    </div>
                    <div style='padding-top: 20px; text-align: center; width: 100%;'>
                        <p><b>Time remaining</b></p>
                        <p><span id='countdown' style='font-size: 16px; color: red;'>${initialTimeLeft}</span> seconds</p>
                        <button id='pauseButton' style='margin-top: 5px; width: 100px;'>Pause</button>
                    </div>
                </div>
                <script>
                    (function() {
                        let draggedItem = null;
                
                        document.querySelectorAll('#damageList li').forEach(item => {
                            item.addEventListener('dragstart', function(event) {
                                event.dataTransfer.setData('text/plain', event.target.innerText);
                                event.dataTransfer.effectAllowed = 'move';
                                draggedItem = event.target;
                            });
                        });
                
                        const damageList = document.getElementById('damageList');
                
                        damageList.addEventListener('dragover', function(event) {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = 'move';
                            const target = event.target;
                            if (target && target.nodeName === 'LI') {
                                const rect = target.getBoundingClientRect();
                                const next = (event.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
                                damageList.insertBefore(draggedItem, next && target.nextSibling || target);
                            }
                        });
                
                        damageList.addEventListener('dragend', function() {
                            draggedItem = null;
                        });
                    })();
                </script>
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
                        if(source && source === "user" && type === "multiDialog") await socket.executeAsGM("closeDialogById", { dialogId: dialogId });
                        if(source && source === "gm" && type === "multiDialog") await socket.executeAsUser("closeDialogById", browserUser.id, { dialogId: dialogId });
                        let actor = await fromUuid(actorUuid);
                        let uuid = actor.uuid;
                        let originToken;
                        originToken = await fromUuid(targetUuids);
                        originToken = await MidiQOL.tokenForActor(originToken.actor.uuid);
                        let damageChosen = [];
                        html.find("#damageList li .damage-type").each(function() {
                            damageChosen.push($(this).text().trim());
                        });

                        const hasEffectApplied = await game.dfreds.effectInterface.hasEffectApplied('Reaction', uuid);

                        if (!hasEffectApplied) {
                            game.dfreds.effectInterface.addEffect({ effectName: 'Reaction', uuid });
                        }
                        
                        let userDecision = true;

                        resolve({userDecision, damageChosen, programmaticallyClosed: false, source, type});
                    }
                },
                no: {
                    label: "No",
                    callback: async () => {
                        // Reaction Declined
                        dialog.dialogState.interacted = true;
                        dialog.dialogState.decision = "no";
                        resolve({ userDecision: false, damageChosen: false, programmaticallyClosed: false, source, type});
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
                    resolve({ userDecision: false, damageChosen: false, programmaticallyClosed: true, source, type });
                }
                else if (!dialog.dialogState.interacted) {
                    resolve({ userDecision: false, damageChosen: false, programmaticallyClosed: false, source, type });
                }
            }
        });
        dialog.dialogState = { interacted: false, decision: null, programmaticallyClosed: false };
        dialog.render(true);
    });
}