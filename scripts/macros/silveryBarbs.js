//done
export async function silveryBarbs({workflowData,workflowType,workflowCombat}) {
    const module = await import('../module.js');
    const socket = module.socket;
    const helpers = await import('../helpers.js');
    const workflowUuid = workflowData;
    const workflow = await MidiQOL.Workflow.getWorkflow(workflowUuid);
    let itemName = "silvery barbs";
    let itemProperName = "Silvery Barbs";
    let dialogId = "silverybarbs";
    if(!workflow) return;
    if(workflow.item.name === itemProperName) return;

    // Check if attack hits
    if(workflowType === "attack" && workflow.attackTotal < workflow.targets.first().actor.system.attributes.ac.value) return;
    // Check if there is a save success
    if(workflowType === "save" && workflow.saves.size === 0) return;

    let findValidTokens;
    
    if(workflowType === "attack") {
        findValidTokens = helpers.findValidTokens({initiatingToken: workflow.token, targetedToken: null, itemName: itemName, itemType: "spell", itemChecked: null, reactionCheck: true, sightCheck: true, rangeCheck: true, rangeTotal: 60, dispositionCheck: true, dispositionCheckType: "enemy", workflowType: workflowType, workflowCombat: workflowCombat});
    }
    else if(workflowType === "save") {
        findValidTokens = helpers.findValidTokens({initiatingToken: workflow.token, targetedToken: null, itemName: itemName, itemType: "spell", itemChecked: null, reactionCheck: true, sightCheck: false, rangeCheck: false, rangeTotal: null, dispositionCheck: true, dispositionCheckType: "ally", workflowType: workflowType, workflowCombat: workflowCombat});
    }
    
    let browserUser;

    for (const validTokenPrimary of findValidTokens) {
        const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `${itemProperName} Timeout`));
        let chosenItem = validTokenPrimary.actor.items.find(i => i.name === itemProperName);
        const dialogTitlePrimary = `${validTokenPrimary.actor.name} | ${itemProperName}`;
        const dialogTitleGM = `Waiting for ${validTokenPrimary.actor.name}'s selection | ${itemProperName}`;
        
        browserUser = MidiQOL.playerForActor(validTokenPrimary.actor);
        if (!browserUser.active) browserUser = game.users?.activeGM;

        let dialogContent;
        const rollDetailSetting = MidiQOL.safeGetGameSetting('midi-qol', 'ConfigSettings').hideRollDetails;
        const nearbyFriendlies = MidiQOL.findNearby(null, validTokenPrimary, 60, { includeToken: true });
        let validFriendlies = nearbyFriendlies.filter(token => token.document.disposition === validTokenPrimary.document.disposition && MidiQOL.canSee(validTokenPrimary.document.uuid,token.document.uuid) && !token.actor.effects.getName(`${itemProperName} - Advantage`));
        const optionBackground = (document.body.classList.contains("theme-dark")) ? 'black' : 'var(--color-bg)';

        if(workflowType === "save") {
            let targets = Array.from(workflow.saves).filter(t => t.document.disposition !== validTokenPrimary.document.disposition && MidiQOL.canSee(validTokenPrimary, t) && MidiQOL.computeDistance(validTokenPrimary, t, true) <= 60);

            const targetUuids = targets.map(t => t.document.uuid);
            const targetNames = targets.map(t => t.document.name);
            if(targetUuids.length === 0) continue;
            
            targetUuids.map((uuid, index) => 
                `<option value="${uuid}">${targetNames[index]}</option>`
            ).join('');
        
            dialogContent = `
                <div class="gps-dialog-container">
                    <div class="gps-dialog-section">
                        <div class="gps-dialog-content">
                            <p class="gps-dialog-paragraph">Would you like to use your reaction to cast ${itemProperName}? An enemy succeeded their saving throw. Choose an enemy to target and an ally to give advantage to below.</p>
                            <div class="gps-dialog-flex-wrapper">
                                <div class="gps-dialog-select-container">
                                    <div class="gps-dialog-flex">
                                    <label for="enemy-token" class="gps-dialog-label">Target:</label>
                                    <select id="enemy-token" class="gps-dialog-select">
                                        ${targetNames.map((name, index) => `<option class="gps-dialog-option" value="${targetUuids[index]}">${name}</option>`).join('')}
                                    </select>
                                    </div>
                                    <div class="gps-dialog-flex">
                                    <label for="ally-token" class="gps-dialog-label">Advantage:</label>
                                    ${validFriendlies.length >= 1 ? 
                                    `<select id="ally-token" class="gps-dialog-select">
                                        ${validFriendlies.map(friendly => `<option class="gps-dialog-option" style="background-color: ${optionBackground};" value="${friendly.document.uuid}">${friendly.document.name}</option>`).join('')}
                                    </select>` : '<div style="padding: 4px; width: 100%; box-sizing: border-box; line-height: normal;"> No valid allies in range.</div>'
                                    }
                                    </div>
                                </div>
                                <div id="image-container" class="gps-dialog-image-container">
                                    <img id="img_${dialogId}" src="${chosenItem.img}" class="gps-dialog-image">
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="gps-dialog-button-container">
                        <button id="pauseButton_${dialogId}" type="button" class="gps-dialog-button">
                            <i class="fas fa-pause" id="pauseIcon_${dialogId}" style="margin-right: 5px;"></i>Pause
                        </button>
                    </div>
                </div>
            `;
        }
        else if(workflowType === "attack") {
            if (workflow.token.document.disposition === validTokenPrimary.document.disposition) continue;
            if (MidiQOL.safeGetGameSetting('gambits-premades', 'disableSilveryBarbsOnNat20') === true && workflow.isCritical === true) return;
            if (MidiQOL.safeGetGameSetting('gambits-premades', 'enableSilveryBarbsOnNat20') === true && workflow.isCritical !== true) return;

            dialogContent = `
                <div class="gps-dialog-container">
                    <div class="gps-dialog-section">
                        <div class="gps-dialog-content">
                            <p class="gps-dialog-paragraph">Would you like to use your reaction to cast ${itemProperName}? ${["none", "detailsDSN", "details"].includes(rollDetailSetting) ? `An enemy successfully hit your ally with a ${workflow.attackTotal}.` : "An enemy successfully hit your ally."} Choose an ally to give advantage to below.</p>
                            <div>
                                <div class="gps-dialog-flex">
                                    <label for="ally-token" class="gps-dialog-label">Advantage:</label>
                                    ${validFriendlies.length >= 1 ? 
                                    `<select id="ally-token" class="gps-dialog-select">
                                        ${validFriendlies.map(friendly => `<option class="gps-dialog-option" style="background-color: ${optionBackground};" value="${friendly.document.uuid}">${friendly.document.name}</option>`).join('')}
                                    </select>` : '<div style="padding: 4px; width: 100%; box-sizing: border-box; line-height: normal;"> No valid allies in range.</div>'
                                    }
                                    <div id="image-container" class="gps-dialog-image-container">
                                        <img id="img_${dialogId}" src="${chosenItem.img}" class="gps-dialog-image">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="gps-dialog-button-container">
                        <button id="pauseButton_${dialogId}" type="button" class="gps-dialog-button">
                            <i class="fas fa-pause" id="pauseIcon_${dialogId}" style="margin-right: 5px;"></i>Pause
                        </button>
                    </div>
                </div>
            `;
        }

        let content = `<span style='text-wrap: wrap;'><img src="${validTokenPrimary.actor.img}" style="width: 25px; height: auto;" /> ${validTokenPrimary.actor.name} has a reaction available for a save triggering ${itemProperName}.</span>`
        let chatData = {
        user: game.users.find(u => u.isGM).id,
        content: content,
        whisper: game.users.find(u => u.isGM).id
        };
        let notificationMessage = await MidiQOL.socket().executeAsGM("createChatMessage", { chatData });
        
        let result;

        if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser.id !== game.users?.activeGM.id) {
            let userDialogArgs = { dialogTitle: dialogTitlePrimary, dialogContent, dialogId, initialTimeLeft, validTokenPrimaryUuid: validTokenPrimary.document.uuid, source: "user", type: "multiDialog", browserUser: browserUser.id };
            
            let gmDialogArgs = { dialogTitle: dialogTitleGM, dialogContent, dialogId, initialTimeLeft, validTokenPrimaryUuid: validTokenPrimary.document.uuid, source: "gm", type: "multiDialog" };
            
            result = await socket.executeAsGM("handleDialogPromises", userDialogArgs, gmDialogArgs);
        } else {
            result = await socket.executeAsUser("process3rdPartyReactionDialog", browserUser.id, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source:browserUser.isGM ? "gm" : "user",type:"singleDialog"});
        }
                
        const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, source, type } = result;

        if (!userDecision) {
            if(source === "gm" || type === "singleDialog") await socket.executeAsGM("deleteChatMessage", { chatId: notificationMessage._id });
            continue;
        }
        else if (userDecision) {
            await socket.executeAsGM("deleteChatMessage", { chatId: notificationMessage._id });
            let advantageToken = await fromUuid(allyTokenUuid);
            let chatContent;

            chosenItem.prepareData();
            chosenItem.prepareFinalAttributes();
            chosenItem.applyActiveEffects();

            const options = {
                showFullCard: false,
                createWorkflow: true,
                versatile: false,
                configureDialog: true,
                targetUuids: [(enemyTokenUuid) ? enemyTokenUuid : workflow.token.document.uuid],
            };
            
            let itemRoll;
            if(source && source === "user") itemRoll = await MidiQOL.socket().executeAsUser("completeItemUse", browserUser?.id, { itemData: chosenItem, actorUuid: validTokenPrimary.actor.uuid, options: options });
            else if(source && source === "gm") itemRoll = await MidiQOL.socket().executeAsGM("completeItemUse", { itemData: chosenItem, actorUuid: validTokenPrimary.actor.uuid, options: options });

            if(itemRoll.aborted === true) continue;

            await helpers.addReaction({actorUuid: `${validTokenPrimary.actor.uuid}`});

            let effectData = [
                {
                    "icon": `${chosenItem.img}`,
                    "origin": `${validTokenPrimary.actor.uuid}`,
                    "duration": {
                    "seconds": 60
                    },
                    "disabled": false,
                    "name": "Silvery Barbs - Advantage",
                    "changes": [
                    {
                        "key": "flags.midi-qol.advantage.attack.all",
                        "mode": 0,
                        "value": "1",
                        "priority": 20
                    },
                    {
                        "key": "flags.midi-qol.advantage.ability.check.all",
                        "mode": 0,
                        "value": "1",
                        "priority": 20
                    },
                    {
                        "key": "flags.midi-qol.advantage.ability.save.all",
                        "mode": 0,
                        "value": "1",
                        "priority": 20
                    }
                    ],
                    "transfer": false,
                    "flags": {
                    "dae": {
                        "specialDuration": [
                            "1Attack",
                            "isCheck",
                            "isSave",
                            "isSkill"
                        ]
                    }
                    }
                }
            ];
            if(advantageToken) await MidiQOL.socket().executeAsGM("createEffects", { actorUuid: advantageToken.actor.uuid, effects: effectData });

            if(workflowType === "save") {
                let saveDC = workflow.saveItem.system.save.dc;
                let saveAbility = workflow.saveItem.system.save.ability;
                let workflowTarget = Array.from(workflow.saves).find(t => t.document.uuid === enemyTokenUuid);
                let targetUser = MidiQOL.playerForActor(workflowTarget.actor);
                if (!targetUser.active) targetUser = game.users?.activeGM;
                let targetSaveBonus =  workflowTarget.actor.system.abilities[`${saveAbility}`].save + workflowTarget.actor.system.abilities[`${saveAbility}`].saveBonus;
                let reroll;
                if(workflowTarget.actor.type !== "npc") reroll = await socket.executeAsUser("rollAsUser", targetUser.id, { rollParams: `1d20 + ${targetSaveBonus}` });
                else reroll = await socket.executeAsGM("rollAsUser", { rollParams: `1d20 + ${targetSaveBonus}` });

                if(reroll.total < saveDC) {
                    workflow.saves.delete(workflowTarget);
                    workflow.failedSaves.add(workflowTarget);

                    chatContent = `<span style='text-wrap: wrap;'>The creature was silvery barbed and failed their save. <img src="${workflowTarget.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    await helpers.replaceChatCard({actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: reroll});
                    return;
                }

                else {
                    chatContent = `<span style='text-wrap: wrap;'>The creature was silvery barbed but still succeeded their save. <img src="${workflowTarget.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    await helpers.replaceChatCard({actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: reroll});
                    continue;
                }
            }
            else if(workflowType === "attack") {
                let rerollAddition = workflow.attackRoll.total - workflow.attackRoll.dice[0].total;
                let targetAC = workflow.hitTargets.first().actor.system.attributes.ac.value;
                const saveSetting = workflow.options.noOnUseMacro;
                workflow.options.noOnUseMacro = true;
                let reroll;
                if(source && source === "user") reroll = await socket.executeAsUser("rollAsUser", browserUser.id, { rollParams: `1d20 + ${rerollAddition}` });
                if(source && source === "gm") reroll = await socket.executeAsGM("rollAsUser", { rollParams: `1d20 + ${rerollAddition}` });
                if(reroll.total < workflow.attackTotal) await workflow.setAttackRoll(reroll);

                workflow.options.noOnUseMacro = saveSetting;

                if(workflow.attackTotal < targetAC) {
                    chatContent = `<span style='text-wrap: wrap;'>The creature was silvery barbed, and failed their attack. <img src="${workflow.token.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    await helpers.replaceChatCard({actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: reroll});
                    return;
                }

                else {
                    chatContent = `<span style='text-wrap: wrap;'>The creature was silvery barbed, but were still able to hit their target. <img src="${workflow.token.actor.img}" width="30" height="30" style="border:0px"></span>`;
                    await helpers.replaceChatCard({actorUuid: validTokenPrimary.actor.uuid, itemUuid: chosenItem.uuid, chatContent: chatContent, rollData: reroll});
                    continue;
                }
            }
        }
    }
}